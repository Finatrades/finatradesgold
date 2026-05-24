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

// ───────────────── Trade Finance (Task #146/#149) ─────────────────

export type WalletBalanceRow = {
  currency: string;
  availableCents: number;
  lockedCents: number;
  pendingCents?: number;
};

export function useWalletBalances() {
  return useQuery({
    queryKey: ["walletBalances"],
    queryFn: async () => {
      const r = await apiFetch("/api/wallet/balances");
      return r as { balances: WalletBalanceRow[] };
    },
    staleTime: 30000,
  });
}

export type TradeCaseRow = {
  id: string;
  caseNumber?: string | null;
  companyName?: string | null;
  commodityType?: string | null;
  tradeType?: string | null;
  status: string;
  tradeValueUsd?: string | number | null;
  settlementCurrency?: string | null;
  settlementAmountCents?: number | null;
  escrowFundedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function useTradeCases(userId: string | undefined) {
  return useQuery({
    queryKey: ["tradeCases", userId],
    queryFn: async () => {
      const r = await apiFetch(`/api/trade/cases/${userId}`);
      return r as { cases: TradeCaseRow[] };
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

export type MilestoneRow = {
  id: string;
  sequence: number;
  label: string;
  trigger: string;
  percent: string;
  amountCents: number;
  currency: string;
  status: "pending" | "released" | "released_reserved" | "disputed" | string;
  releasedAt?: string | null;
  releaseReason?: string | null;
  releasedBy?: string | null;
  releasedByFtId?: string | null;
};

export type CaseDisputeSummary = {
  id: string;
  disputeRefId: string;
  status: string;
  disputeType: string;
  subject: string;
  raisedByFtId: string | null;
  raisedByRole: string;
  createdAt: string | null;
  resolvedAt?: string | null;
  decision?: string | null;
};

export function useCaseMilestones(caseId: string | undefined) {
  return useQuery({
    queryKey: ["caseMilestones", caseId],
    queryFn: async () => {
      const r = await apiFetch(`/api/trade/cases/${caseId}/milestones`);
      return r as {
        milestones: MilestoneRow[];
        disputes?: CaseDisputeSummary[];
        caseId?: string;
      };
    },
    enabled: !!caseId,
    staleTime: 15000,
  });
}

export function useReleaseMilestone(caseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, reason }: { milestoneId: string; reason: string }) =>
      apiFetch(`/api/trade/cases/${caseId}/milestones/${milestoneId}/release`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caseMilestones", caseId] });
      qc.invalidateQueries({ queryKey: ["walletBalances"] });
    },
  });
}

export function useFundEscrow(caseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ amountCents }: { amountCents?: number } = {}) => {
      const body: Record<string, unknown> = {};
      if (typeof amountCents === "number" && Number.isFinite(amountCents) && amountCents > 0) {
        body.amountCents = amountCents;
      }
      return apiFetch(`/api/trade/cases/${caseId}/escrow/fund`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caseMilestones", caseId] });
      qc.invalidateQueries({ queryKey: ["walletBalances"] });
      qc.invalidateQueries({ queryKey: ["tradeCases"] });
    },
  });
}

export function useConfirmGoodsReceived(caseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      apiFetch(`/api/trade/cases/${caseId}/goods-received`, {
        method: "POST",
        body: JSON.stringify({ reason: "Importer confirmed goods received (mobile)" }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caseMilestones", caseId] });
      qc.invalidateQueries({ queryKey: ["walletBalances"] });
    },
  });
}

