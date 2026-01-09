import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const SESSION_EXPIRED_EVENT = 'session:expired';

function handleSessionExpired() {
  const currentPath = window.location.pathname;
  const publicPaths = ['/', '/login', '/register', '/admin/login', '/forgot-password', '/reset-password', '/verify-email'];
  
  if (!publicPaths.some(path => currentPath === path || currentPath.startsWith('/reset-password'))) {
    console.log('[Session] Session expired, redirecting to login...');
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON for structured errors
    let errorData: any = null;
    try {
      errorData = JSON.parse(text);
    } catch {
      // Not JSON, use text as-is
    }
    
    // Handle KYC errors with proper structure
    if (errorData?.code === 'KYC_REQUIRED') {
      const error: any = new Error('Please complete your identity verification to access this feature.');
      error.code = 'KYC_REQUIRED';
      error.kycStatus = errorData.kycStatus;
      throw error;
    }
    
    // Convert technical errors to user-friendly messages
    let friendlyMessage = errorData?.message || text;
    if (res.status === 403 && text.includes('CSRF')) {
      friendlyMessage = 'Your session may have expired. Please refresh the page and try again.';
      handleSessionExpired();
    } else if (res.status === 401) {
      friendlyMessage = 'Please log in to continue.';
      handleSessionExpired();
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

// Get CSRF token from cookie
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// Fetch CSRF token if not present
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
): Promise<Response> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add CSRF token for state-changing requests
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
      handleSessionExpired();
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 300000, // 5 minutes - enterprise caching for reduced latency
      gcTime: 1800000, // 30 minutes - keep data much longer
      refetchOnWindowFocus: false, // Disable automatic refetch on focus - use socket events instead
      refetchOnReconnect: 'always', // Only refetch on network reconnection
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
}
