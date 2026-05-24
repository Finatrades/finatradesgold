import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}` : "";

let _csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken;
  const res = await fetch(`${API_BASE}/api/csrf-token`, {
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  if (res.ok) {
    const data = await res.json();
    _csrfToken = data.csrfToken as string;
    return _csrfToken;
  }
  return "";
}

export function invalidateCsrfToken() {
  _csrfToken = null;
}

async function apiFetch(path: string, options?: RequestInit) {
  const method = (options?.method || "GET").toUpperCase();
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const extraHeaders: Record<string, string> = {};
  if (isStateChanging) {
    const token = await fetchCsrfToken();
    if (token) extraHeaders["x-csrf-token"] = token;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...extraHeaders,
      ...(options?.headers || {}),
    },
  });

  if (res.status === 403) {
    _csrfToken = null;
    if (isStateChanging) {
      const retryToken = await fetchCsrfToken();
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(retryToken ? { "x-csrf-token": retryToken } : {}),
        ...(options?.headers as Record<string, string> || {}),
      };
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: "include",
        headers: retryHeaders,
      });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({}));
        throw new Error((err as any).message || `HTTP ${retryRes.status}`);
      }
      return retryRes.json();
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useGoldPrice() {
  return useQuery({
    queryKey: ["goldPrice"],
    queryFn: () => apiFetch("/api/gold-price"),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => apiFetch(`/api/dashboard/${userId}`),
    enabled: !!userId,
    staleTime: 30000,
  });
}

export function useWallet(userId: string | undefined) {
  return useQuery({
    queryKey: ["wallet", userId],
    queryFn: () => apiFetch(`/api/wallet/${userId}`),
    enabled: !!userId,
    staleTime: 30000,
  });
}

export function useCertificates(userId: string | undefined) {
  return useQuery({
    queryKey: ["certificates", userId],
    queryFn: () => apiFetch(`/api/certificates/${userId}`),
    enabled: !!userId,
    staleTime: 60000,
  });
}

export function useTransactions(userId: string | undefined) {
  return useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => apiFetch(`/api/unified-transactions/${userId}?limit=20`),
    enabled: !!userId,
    staleTime: 30000,
  });
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => apiFetch(`/api/auth/me/${userId}`),
    enabled: !!userId,
    staleTime: 60000,
  });
}

