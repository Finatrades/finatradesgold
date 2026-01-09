import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface DualWalletBalance {
  mpgw: {
    availableGrams: number;
    pendingGrams: number;
    lockedBnslGrams: number;
    reservedTradeGrams: number;
    totalGrams: number;
  };
  fpgw: {
    availableGrams: number;
    pendingGrams: number;
    lockedBnslGrams: number;
    reservedTradeGrams: number;
    totalGrams: number;
    weightedAvgPrice: number;
  };
  total: {
    availableGrams: number;
    totalGrams: number;
  };
  goldPricePerGram: number;
  mpgwValueUsd: number;
  fpgwValueUsd: number;
  totalValueUsd: number;
}

export interface FpgwBatch {
  id: string;
  userId: string;
  originalGrams: string;
  remainingGrams: string;
  lockedPriceUsd: string;
  status: 'Active' | 'Consumed' | 'Transferred';
  balanceBucket: 'Available' | 'Pending' | 'Locked_BNSL' | 'Reserved_Trade';
  sourceTransactionId?: string;
  sourceType?: string;
  createdAt: string;
}

export interface InternalTransferParams {
  userId: string;
  goldGrams: number;
  fromWalletType: 'MPGW' | 'FPGW';
  toWalletType: 'MPGW' | 'FPGW';
  notes?: string;
}

export function useDualWalletBalance(userId: string | undefined) {
  return useQuery<DualWalletBalance>({
    queryKey: ['dual-wallet', 'balance', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/dual-wallet/${userId}/balance`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useFpgwBatches(userId: string | undefined) {
  return useQuery<{ batches: FpgwBatch[] }>({
    queryKey: ['dual-wallet', 'fpgw-batches', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/dual-wallet/${userId}/fpgw-batches`);
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useInternalTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: InternalTransferParams) => {
      const res = await apiRequest('POST', '/api/dual-wallet/transfer', params);
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate all wallet-related queries
      queryClient.invalidateQueries({ queryKey: ['dual-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Invalidate vault queries for FinaVault page updates
      queryClient.invalidateQueries({ queryKey: ['vault-ownership'] });
      queryClient.invalidateQueries({ queryKey: ['vault-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['vault-holdings'] });
      // Invalidate transaction history
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['unified-transactions'] });
      // Invalidate certificates
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    }
  });
}

export function useValidateSpend() {
  return useMutation({
    mutationFn: async (params: { userId: string; goldGrams: number; walletType: 'MPGW' | 'FPGW' }) => {
      const res = await apiRequest('POST', '/api/dual-wallet/validate-spend', params);
      return res.json();
    }
  });
}
