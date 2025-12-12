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

interface DashboardData {
  wallet: Wallet | null;
  vaultHoldings: VaultHolding[];
  transactions: Transaction[];
  bnslPlans: BnslPlan[];
  goldPrice: number;
  isLoading: boolean;
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
  };
}

const USD_TO_AED = 3.67;

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: walletData, isLoading: walletLoading, error: walletError } = useQuery({
    queryKey: ['wallet', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await apiRequest('GET', `/api/wallet/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: vaultData, isLoading: vaultLoading, error: vaultError } = useQuery({
    queryKey: ['vaultHoldings', userId],
    queryFn: async () => {
      if (!userId) return { holdings: [] };
      const res = await apiRequest('GET', `/api/vault/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: txData, isLoading: txLoading, error: txError } = useQuery({
    queryKey: ['transactions', userId],
    queryFn: async () => {
      if (!userId) return { transactions: [] };
      const res = await apiRequest('GET', `/api/transactions/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: bnslData, isLoading: bnslLoading, error: bnslError } = useQuery({
    queryKey: ['bnslPlans', userId],
    queryFn: async () => {
      if (!userId) return { plans: [] };
      const res = await apiRequest('GET', `/api/bnsl/plans/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: priceData } = useQuery({
    queryKey: ['goldPrice'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/gold-price');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const hasError = walletError || vaultError || txError || bnslError;
  const errorMessage = hasError ? 'Failed to load dashboard data' : null;

  useEffect(() => {
    if (hasError) {
      toast.error('Failed to load dashboard data', {
        description: 'Some data may not be displayed. Please try refreshing.'
      });
    }
  }, [hasError]);

  const wallet = walletData?.wallet || null;
  const vaultHoldings = vaultData?.holdings || [];
  const transactions = txData?.transactions || [];
  const bnslPlans = bnslData?.plans || [];
  const goldPrice = priceData?.price || 85.00;

  const walletGoldGrams = parseFloat(wallet?.goldGrams || '0');
  const walletUsdBalance = parseFloat(wallet?.usdBalance || '0');

  const vaultGoldGrams = vaultHoldings.reduce((sum: number, h: VaultHolding) => 
    sum + parseFloat(h.goldGrams || '0'), 0);
  
  const vaultGoldValueUsd = vaultGoldGrams * goldPrice;
  const vaultGoldValueAed = vaultGoldValueUsd * USD_TO_AED;

  const bnslLockedGrams = bnslPlans
    .filter((p: BnslPlan) => p.status === 'Active')
    .reduce((sum: number, p: BnslPlan) => sum + parseFloat(p.goldSoldGrams || '0'), 0);

  const bnslTotalProfit = bnslPlans
    .filter((p: BnslPlan) => p.status === 'Active')
    .reduce((sum: number, p: BnslPlan) => sum + parseFloat(p.paidMarginUsd || '0'), 0);

  const totalPortfolioUsd = vaultGoldValueUsd + (walletGoldGrams * goldPrice) + walletUsdBalance;

  return {
    wallet,
    vaultHoldings,
    transactions,
    bnslPlans,
    goldPrice,
    isLoading: walletLoading || vaultLoading || txLoading || bnslLoading,
    error: errorMessage,
    totals: {
      vaultGoldGrams,
      vaultGoldValueUsd,
      vaultGoldValueAed,
      walletGoldGrams,
      walletUsdBalance,
      totalPortfolioUsd,
      bnslLockedGrams,
      bnslTotalProfit,
    },
  };
}
