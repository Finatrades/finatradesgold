import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = domain ? `https://${domain}` : "";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
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

export function useDualWalletBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ["dualWalletBalance", userId],
    queryFn: () => apiFetch(`/api/dual-wallet/${userId}/balance`),
    enabled: !!userId,
    staleTime: 30000,
  });
}
