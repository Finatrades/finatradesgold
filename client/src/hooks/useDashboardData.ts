import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useSmartPolling } from './useSmartPolling';

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
  issuer: string;
  issuedAt: string;
  goldWalletType?: 'LGPW' | 'FPGW' | null;
  fromGoldWalletType?: 'LGPW' | 'FPGW' | null;
  toGoldWalletType?: 'LGPW' | 'FPGW' | null;
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
  finaBridge: { activeCases: number; tradeVolume: number; goldGrams: number; usdValue: number };
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
    // LGPW/FPGW breakdown
    mpgwAvailableGrams: number;
    mpgwPendingGrams: number;
    mpgwLockedBnslGrams: number;
    mpgwReservedTradeGrams: number;
    fpgwAvailableGrams: number;
    fpgwPendingGrams: number;
    fpgwLockedBnslGrams: number;
    fpgwReservedTradeGrams: number;
    fpgwWeightedAvgPriceUsd: number;
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
  tradeCounts: { active: number; total: number };
  finaBridge: { activeCases: number; tradeVolume: number; goldGrams: number; usdValue: number };
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  syncMode: 'active' | 'idle' | 'paused';
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
    // LGPW/FPGW breakdown
    mpgwAvailableGrams: number;
    mpgwPendingGrams: number;
    mpgwLockedBnslGrams: number;
    mpgwReservedTradeGrams: number;
    fpgwAvailableGrams: number;
    fpgwPendingGrams: number;
    fpgwLockedBnslGrams: number;
    fpgwReservedTradeGrams: number;
    fpgwWeightedAvgPriceUsd: number;
  };
  refetch: () => void;
  invalidateAll: () => void;
}

const STALE_TIME = 30000;

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  
  // Smart polling: adjusts refresh rate based on user activity
  const { interval: smartInterval, isIdle, isVisible } = useSmartPolling({
    activeInterval: 15000,   // 15 seconds when user is active
    idleInterval: 60000,     // 60 seconds when user is idle (1 min)
    idleThreshold: 60000,    // Consider idle after 1 minute of no activity
    pauseInBackground: true, // Don't poll when tab is hidden
  });

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery<DashboardResponse>({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      const startTime = performance.now();
      const res = await apiRequest('GET', `/api/dashboard/${userId}`);
      const data = await res.json();
      const clientTime = (performance.now() - startTime).toFixed(0);
      const mode = isIdle ? 'idle' : 'active';
      console.log(`[Dashboard] Client fetch: ${clientTime}ms, Server: ${data._meta?.loadTimeMs}ms, Mode: ${mode}`);
      return data;
    },
    enabled: !!userId && isVisible, // Only fetch when user is authenticated AND tab is visible
    staleTime: STALE_TIME,
    gcTime: 300000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: smartInterval, // Smart interval (15s active, 60s idle, false when hidden)
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
  const syncMode: 'active' | 'idle' | 'paused' = !isVisible ? 'paused' : isIdle ? 'idle' : 'active';

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
    mpgwAvailableGrams: 0,
    mpgwPendingGrams: 0,
    mpgwLockedBnslGrams: 0,
    mpgwReservedTradeGrams: 0,
    fpgwAvailableGrams: 0,
    fpgwPendingGrams: 0,
    fpgwLockedBnslGrams: 0,
    fpgwReservedTradeGrams: 0,
    fpgwWeightedAvgPriceUsd: 0,
  };

  return {
    wallet: data?.wallet || null,
    vaultHoldings: data?.vaultHoldings || [],
    transactions: data?.transactions || [],
    bnslPlans: data?.bnslPlans || [],
    goldPrice: data?.goldPrice || 0,
    goldPriceSource: data?.goldPriceSource || null,
    certificates: data?.certificates || null,
    tradeCounts: data?.tradeCounts || { active: 0, total: 0 },
    finaBridge: data?.finaBridge || { activeCases: 0, tradeVolume: 0, goldGrams: 0, usdValue: 0 },
    isLoading,
    isFetching,
    error: error ? 'Failed to load dashboard data' : null,
    syncStatus,
    syncMode,
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
