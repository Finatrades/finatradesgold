import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const SESSION_EXPIRED_EVENT = 'session:expired';

let sessionExpiredFired = false;
let sessionVerifying = false;

export function resetSessionExpiredLatch() {
  sessionExpiredFired = false;
  sessionVerifying = false;
}

async function verifyAndExpireSession() {
  if (sessionExpiredFired || sessionVerifying) return;

  const currentPath = window.location.pathname;
  const publicPaths = ['/', '/login', '/register', '/admin/login', '/forgot-password', '/reset-password', '/verify-email'];
  if (publicPaths.some(path => currentPath === path || currentPath.startsWith('/reset-password'))) {
    return;
  }

  sessionVerifying = true;

  try {
    const storedUserId = localStorage.getItem('fina_user_id');

    const verifyUrl = storedUserId
      ? `/api/auth/me/${storedUserId}`
      : '/api/csrf-token';

    const verifyRes = await fetch(verifyUrl, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (verifyRes.ok) {
      console.log('[Session] 401 received but session is still valid (transient error), skipping logout');
      return;
    }

    if (verifyRes.status === 429 || verifyRes.status >= 500) {
      console.warn('[Session] Verification returned', verifyRes.status, '- treating as transient, skipping logout');
      return;
    }

    triggerSessionExpired();
  } catch (err) {
    console.warn('[Session] Verification network error - treating as transient, skipping logout', err);
  } finally {
    sessionVerifying = false;
  }
}

function triggerSessionExpired() {
  if (sessionExpiredFired) return;
  sessionExpiredFired = true;
  console.log('[Session] Session confirmed expired, redirecting to login...');
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    let errorData: any = null;
    try {
      errorData = JSON.parse(text);
    } catch {
    }
    
    if (errorData?.code === 'KYC_REQUIRED') {
      const error: any = new Error('Please complete your identity verification to access this feature.');
      error.code = 'KYC_REQUIRED';
      error.kycStatus = errorData.kycStatus;
      throw error;
    }
    
    let friendlyMessage = errorData?.message || text;
    if (errorData?.code === 'RBAC_PERMISSION_DENIED') {
      friendlyMessage = "Access Denied: You do not have permission to view this section. Please contact your system administrator.";
    } else if (res.status === 403 && text.includes('CSRF')) {
      friendlyMessage = 'Your session may have expired. Please refresh the page and try again.';
      verifyAndExpireSession();
    } else if (res.status === 401) {
      friendlyMessage = 'Please log in to continue.';
      verifyAndExpireSession();
    } else if (res.status === 429) {
      friendlyMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (res.status === 500) {
      friendlyMessage = 'Something went wrong on our end. Please try again later.';
    } else if (res.status === 409) {
      friendlyMessage = 'This action is already being processed. Please wait.';
    }
    
    throw new Error(friendlyMessage);
  }
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfToken();
  if (!token) {
    try {
      const res = await fetch('/api/csrf-token', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        token = data.csrfToken;
      }
    } catch (e) {
      console.warn('[CSRF] Failed to fetch token:', e);
    }
  }
  return token;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...customHeaders,
  };
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 300000,
      gcTime: 1800000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      refetchInterval: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function prefetchDashboardData(userId: string) {
  const startTime = performance.now();
  console.log('[Prefetch] Starting dashboard data prefetch...');
  
  return queryClient.prefetchQuery({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/${userId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to prefetch dashboard');
      const data = await res.json();
      const loadTime = (performance.now() - startTime).toFixed(0);
      console.log(`[Prefetch] Dashboard data loaded in ${loadTime}ms`);
      return data;
    },
    staleTime: 30000,
  });
}

export function clearQueryCache() {
  console.log('[Cache] Clearing all query cache on logout');
  queryClient.clear();
  queryClient.resetQueries();
  queryClient.removeQueries();
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.databases?.().then(dbs => {
        dbs.forEach(db => {
          if (db.name?.includes('query') || db.name?.includes('cache')) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }).catch(() => {});
    }
  } catch (e) {
    console.log('[Cache] IndexedDB cleanup skipped');
  }
  console.log('[Cache] All caches cleared successfully');
}
