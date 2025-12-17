import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useEffect, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';

interface Wallet {
  goldGrams: string;
  usdBalance: string;
  eurBalance: string;
}

interface VaultHolding {
  id: string;
  goldGrams: string;
  vaultLocation: string;
  purchasePriceUsdPerGram: string;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amountGold: string | null;
  amountUsd: string | null;
  description: string | null;
  createdAt: string;
  sourceModule: string | null;
}

interface BnslPlan {
  id: string;
  goldSoldGrams: string;
  status: string;
  paidMarginUsd: string;
  totalMarginComponentUsd: string;
}

interface Certificate {
  id: string;
  certificateNumber: string;
  type: string;
  status: string;
  goldGrams: string;
  createdAt: string;
}

interface CertificateSummary {
  recent: Certificate[];
  summary: {
    total: number;
    active: number;
    digitalOwnership: number;
    physicalStorage: number;
  };
}

interface SyncMeta {
  loadTimeMs: number;
  syncVersion: number;
  serverTime: string;
  lastTransactionId: string | null;
}

interface DashboardResponse {
  wallet: Wallet;
  vaultHoldings: VaultHolding[];
  transactions: Transaction[];
  bnslPlans: BnslPlan[];
  goldPrice: number;
  goldPriceSource: string | null;
  notifications: any[];
  tradeCounts: { active: number; total: number };
  certificates: CertificateSummary;
  totals: {
    vaultGoldGrams: number;
    vaultGoldValueUsd: number;
    vaultGoldValueAed: number;
    walletGoldGrams: number;
    walletUsdBalance: number;
    totalPortfolioUsd: number;
    bnslLockedGrams: number;
    bnslTotalProfit: number;
    activeBnslPlans: number;
    pendingGoldGrams: number;
    pendingDepositUsd: number;
  };
  _meta: SyncMeta;
}

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'stale';

interface DashboardData {
  wallet: Wallet | null;
  vaultHoldings: VaultHolding[];
  transactions: Transaction[];
  bnslPlans: BnslPlan[];
  goldPrice: number;
  goldPriceSource: string | null;
  certificates: CertificateSummary | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  lastSynced: Date | null;
  totals: {
    vaultGoldGrams: number;
    vaultGoldValueUsd: number;
    vaultGoldValueAed: number;
    walletGoldGrams: number;
    walletUsdBalance: number;
    totalPortfolioUsd: number;
    bnslLockedGrams: number;
    bnslTotalProfit: number;
    activeBnslPlans: number;
    pendingGoldGrams: number;
    pendingDepositUsd: number;
  };
  refetch: () => void;
  invalidateAll: () => void;
}

const AUTO_REFRESH_INTERVAL = 15000;
const STALE_TIME = 30000;

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery<DashboardResponse>({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      const startTime = performance.now();
      const res = await apiRequest('GET', `/api/dashboard/${userId}`);
      const data = await res.json();
      const clientTime = (performance.now() - startTime).toFixed(0);
      console.log(`[Dashboard] Client fetch: ${clientTime}ms, Server: ${data._meta?.loadTimeMs}ms`);
      return data;
    },
    enabled: !!userId,
    staleTime: STALE_TIME,
    gcTime: 300000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: AUTO_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load dashboard data', {
        description: 'Some data may not be displayed. Please try refreshing.'
      });
    }
  }, [error]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleLedgerSync = (event: any) => {
      console.log('[AutoSync] Received ledger event:', event);
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('ledger:sync', handleLedgerSync);

    return () => {
      socket.off('ledger:sync', handleLedgerSync);
    };
  }, [socket, userId, queryClient]);

  const lastSynced = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const isStale = lastSynced && (Date.now() - lastSynced.getTime() > STALE_TIME);
  const syncStatus: SyncStatus = error ? 'error' : isFetching ? 'syncing' : isStale ? 'stale' : 'synced';

  const invalidateAll = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['certificates'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [userId, queryClient]);

  const defaultTotals = {
    vaultGoldGrams: 0,
    vaultGoldValueUsd: 0,
    vaultGoldValueAed: 0,
    walletGoldGrams: 0,
    walletUsdBalance: 0,
    totalPortfolioUsd: 0,
    bnslLockedGrams: 0,
    bnslTotalProfit: 0,
    activeBnslPlans: 0,
    pendingGoldGrams: 0,
    pendingDepositUsd: 0,
  };

  return {
    wallet: data?.wallet || null,
    vaultHoldings: data?.vaultHoldings || [],
    transactions: data?.transactions || [],
    bnslPlans: data?.bnslPlans || [],
    goldPrice: data?.goldPrice || 0,
    goldPriceSource: data?.goldPriceSource || null,
    certificates: data?.certificates || null,
    isLoading,
    isFetching,
    error: error ? 'Failed to load dashboard data' : null,
    syncStatus,
    lastSynced,
    totals: data?.totals || defaultTotals,
    refetch,
    invalidateAll,
  };
}

export function useSyncStatus() {
  const { syncStatus, lastSynced, isFetching } = useDashboardData();
  
  return {
    status: isFetching ? 'syncing' : syncStatus,
    lastSynced,
    statusLabel: isFetching ? 'Syncing...' : 
      syncStatus === 'synced' ? 'Updated' :
      syncStatus === 'error' ? 'Error' : 'Stale',
    statusIcon: isFetching ? '🔄' :
      syncStatus === 'synced' ? '✅' :
      syncStatus === 'error' ? '⚠️' : '🔄',
  };
}
