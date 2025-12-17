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
  goldPriceSource: string | null;
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
    activeBnslPlans: number;
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

  // Fetch deposit requests (pending bank deposits)
  const { data: depositData, isLoading: depositLoading } = useQuery({
    queryKey: ['depositRequests', userId],
    queryFn: async () => {
      if (!userId) return { requests: [] };
      const res = await apiRequest('GET', `/api/deposit-requests/${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch crypto payment requests (pending crypto deposits)
  const { data: cryptoData, isLoading: cryptoLoading } = useQuery({
    queryKey: ['cryptoPayments', userId],
    queryFn: async () => {
      if (!userId) return { requests: [] };
      const res = await apiRequest('GET', `/api/crypto-payments/user/${userId}`);
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
  const rawTransactions = txData?.transactions || [];
  const depositRequests = depositData?.requests || [];
  const cryptoPayments = cryptoData?.requests || [];
  const bnslPlans = bnslData?.plans || [];
  const goldPrice = priceData?.pricePerGram || 0;
  const goldPriceSource = priceData?.source || null;

  // Convert deposit requests to transaction-like format and merge
  const depositTransactions = depositRequests.map((dep: any) => ({
    id: dep.id,
    type: 'Deposit',
    status: dep.status === 'Approved' ? 'Completed' : dep.status,
    amountUsd: dep.amountUsd,
    amountGold: null,
    createdAt: dep.createdAt,
    description: `Bank Transfer - ${dep.senderBankName || 'Pending'}`,
    sourceModule: 'FinaPay',
    isDepositRequest: true,
  }));

  // Convert crypto payment requests to transaction-like format
  const cryptoTransactions = cryptoPayments
    .filter((cp: any) => cp.status !== 'Approved') // Only show non-approved (pending/under review)
    .map((cp: any) => ({
      id: cp.id,
      type: 'Deposit',
      status: cp.status === 'Approved' ? 'Completed' : cp.status,
      amountUsd: cp.amountUsd,
      amountGold: cp.goldGrams,
      createdAt: cp.createdAt,
      description: `Crypto Deposit - ${cp.status}`,
      sourceModule: 'FinaPay',
      isCryptoPayment: true,
    }));

  // Combine and sort by date (newest first)
  const transactions = [...rawTransactions, ...depositTransactions, ...cryptoTransactions].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
  const activeBnslPlans = bnslPlans.filter((p: BnslPlan) => p.status === 'Active').length;

  return {
    wallet,
    vaultHoldings,
    transactions,
    bnslPlans,
    goldPrice,
    goldPriceSource,
    isLoading: walletLoading || vaultLoading || txLoading || depositLoading || cryptoLoading || bnslLoading,
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
      activeBnslPlans,
    },
  };
}
