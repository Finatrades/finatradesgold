import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useEffect } from 'react';

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

interface DashboardResponse {
  wallet: Wallet;
  vaultHoldings: VaultHolding[];
  transactions: Transaction[];
  bnslPlans: BnslPlan[];
  goldPrice: number;
  goldPriceSource: string | null;
  notifications: any[];
  tradeCounts: { active: number; total: number };
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
  };
  _meta: { loadTimeMs: number };
}

interface DashboardData {
  wallet: Wallet | null;
  vaultHoldings: VaultHolding[];
  transactions: Transaction[];
  bnslPlans: BnslPlan[];
  goldPrice: number;
  goldPriceSource: string | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
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
  };
  refetch: () => void;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading, isFetching, error, refetch } = useQuery<DashboardResponse>({
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
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load dashboard data', {
        description: 'Some data may not be displayed. Please try refreshing.'
      });
    }
  }, [error]);

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
  };

  return {
    wallet: data?.wallet || null,
    vaultHoldings: data?.vaultHoldings || [],
    transactions: data?.transactions || [],
    bnslPlans: data?.bnslPlans || [],
    goldPrice: data?.goldPrice || 0,
    goldPriceSource: data?.goldPriceSource || null,
    isLoading,
    isFetching,
    error: error ? 'Failed to load dashboard data' : null,
    totals: data?.totals || defaultTotals,
    refetch,
  };
}
