import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

export interface UnifiedTransaction {
  id: string;
  userId: string;
  module: string;
  actionType: string;
  grams: string | null;
  usd: string | null;
  usdPerGram: string | null;
  status: string;
  referenceId: string | null;
  description: string | null;
  counterpartyUserId: string | null;
  createdAt: string;
  completedAt: string | null;
  sourceType: string;
  goldWalletType?: 'LGPW' | 'FGPW' | null;
  balanceAfterGrams?: string | null;
}

export interface TransactionTotals {
  totalGrams: number;
  totalUSD: number;
  count: number;
}

export interface UnifiedTransactionsParams {
  module?: 'finapay' | 'finavault' | 'bnsl' | 'finabridge' | 'all';
  status?: 'pending' | 'completed' | 'cancelled' | 'all';
  type?: string;
  limit?: number;
}

export interface UnifiedTransactionsResult {
  transactions: UnifiedTransaction[];
  totals: TransactionTotals;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date;
}

export const getActionLabel = (actionType: string, module?: string, description?: string | null): string => {
  const action = actionType?.toUpperCase() || '';
  
  if (action === 'DEPOSIT_PHYSICAL_GOLD') {
    return 'Deposit Physical Gold';
  }
  if (action === 'ADD_FUNDS') {
    return 'Acquire Gold';
  }
  if (action === 'BUY_GOLD_BAR') {
    return 'Buy Gold Bar';
  }
  if (action === 'SEND') {
    return 'Send';
  }
  if (action === 'RECEIVE') {
    return 'Receive';
  }
  if (action === 'LOCK') {
    return 'Lock';
  }
  if (action === 'UNLOCK') {
    return 'Unlock';
  }
  if (action === 'WITHDRAWAL') {
    return 'Withdrawal';
  }
  if (action === 'TRANSFER') {
    return 'Transfer';
  }
  
  return actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'pending':
    case 'processing':
    case 'awaiting_approval':
      return 'bg-amber-100 text-amber-700';
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const getModuleColor = (module: string): string => {
  switch (module?.toLowerCase()) {
    case 'finapay':
      return 'bg-blue-100 text-blue-700';
    case 'finavault':
      return 'bg-purple-100 text-fuchsia-700';
    case 'bnsl':
      return 'bg-purple-100 text-purple-700';
    case 'finabridge':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export function useUnifiedTransactions(params: UnifiedTransactionsParams = {}): UnifiedTransactionsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch, error } = useQuery<{
    transactions: UnifiedTransaction[];
    totals: TransactionTotals;
    nextCursor: string | null;
  }>({
    queryKey: ['unified-transactions', user?.id, params.module, params.status, params.type, params.limit],
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      if (params.module && params.module !== 'all') urlParams.set('module', params.module);
      if (params.status && params.status !== 'all') urlParams.set('status', params.status);
      if (params.type) urlParams.set('type', params.type);
      if (params.limit) urlParams.set('limit', params.limit.toString());
      
      const res = await fetch(`/api/unified-transactions/${user?.id}?${urlParams.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const transactions = data?.transactions || [];
  const totals = data?.totals || { totalGrams: 0, totalUSD: 0, count: 0 };
  
  let filteredTransactions = transactions;
  if (params.limit && filteredTransactions.length > params.limit) {
    filteredTransactions = filteredTransactions.slice(0, params.limit);
  }

  return {
    transactions: filteredTransactions,
    totals,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    lastUpdated: new Date(),
  };
}

export function useGoldPrice() {
  const { data, isLoading } = useQuery<{ pricePerGram: number }>({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) throw new Error('Failed to fetch gold price');
      return res.json();
    },
    staleTime: 30000,
  });
  
  return {
    pricePerGram: data?.pricePerGram || 85,
    isLoading,
  };
}
