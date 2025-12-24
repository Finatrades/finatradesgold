import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Convert technical errors to user-friendly messages
    let friendlyMessage = text;
    if (res.status === 403 && text.includes('CSRF')) {
      friendlyMessage = 'Your session may have expired. Please refresh the page and try again.';
    } else if (res.status === 401) {
      friendlyMessage = 'Please log in to continue.';
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
      staleTime: 60000, // 60 seconds - show cached data instantly
      gcTime: 600000, // 10 minutes - keep data longer
      refetchOnWindowFocus: true,
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
