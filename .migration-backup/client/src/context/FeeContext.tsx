import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface PlatformFee {
  id: string;
  module: 'FinaPay' | 'FinaVault' | 'BNSL' | 'FinaBridge';
  feeKey: string;
  feeName: string;
  description?: string;
  feeType: string;
  feeValue: string;
  minAmount?: string;
  maxAmount?: string;
  isActive: boolean;
  displayOrder: number;
}

interface FeeContextType {
  fees: PlatformFee[];
  loading: boolean;
  getFee: (feeKey: string) => PlatformFee | undefined;
  getFeeValue: (feeKey: string, defaultValue?: number) => number;
  getModuleFees: (module: PlatformFee['module']) => PlatformFee[];
  calculateFee: (feeKey: string, amount: number, defaultValue?: number) => { fee: number; feeInfo: PlatformFee | null };
  refreshFees: () => Promise<void>;
}

const FeeContext = createContext<FeeContextType | undefined>(undefined);

export function FeeProvider({ children }: { children: React.ReactNode }) {
  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFees = useCallback(async () => {
    try {
      const res = await fetch('/api/fees');
      if (res.ok) {
        const data = await res.json();
        setFees(data.fees || []);
      }
    } catch (err) {
      console.error('Failed to fetch fees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const getFee = useCallback((feeKey: string): PlatformFee | undefined => {
    return fees.find(f => f.feeKey === feeKey && f.isActive);
  }, [fees]);

  const getFeeValue = useCallback((feeKey: string, defaultValue: number = 0): number => {
    const fee = getFee(feeKey);
    if (fee) {
      return parseFloat(fee.feeValue) || defaultValue;
    }
    return defaultValue;
  }, [getFee]);

  const getModuleFees = useCallback((module: PlatformFee['module']): PlatformFee[] => {
    return fees.filter(f => f.module === module && f.isActive);
  }, [fees]);

  const calculateFee = useCallback((feeKey: string, amount: number, defaultValue: number = 0): { fee: number; feeInfo: PlatformFee | null } => {
    const feeInfo = getFee(feeKey);
    if (!feeInfo) {
      return { fee: amount * (defaultValue / 100), feeInfo: null };
    }
    
    const feeValue = parseFloat(feeInfo.feeValue) || 0;
    
    if (feeInfo.feeType === 'percentage') {
      let fee = amount * (feeValue / 100);
      
      if (feeInfo.minAmount) {
        const minFee = parseFloat(feeInfo.minAmount);
        if (!isNaN(minFee) && fee < minFee) {
          fee = minFee;
        }
      }
      
      if (feeInfo.maxAmount) {
        const maxFee = parseFloat(feeInfo.maxAmount);
        if (!isNaN(maxFee) && fee > maxFee) {
          fee = maxFee;
        }
      }
      
      return { fee, feeInfo };
    } else {
      return { fee: feeValue, feeInfo };
    }
  }, [getFee]);

  return (
    <FeeContext.Provider value={{
      fees,
      loading,
      getFee,
      getFeeValue,
      getModuleFees,
      calculateFee,
      refreshFees: fetchFees
    }}>
      {children}
    </FeeContext.Provider>
  );
}

export function useFees() {
  const context = useContext(FeeContext);
  if (!context) {
    throw new Error('useFees must be used within a FeeProvider');
  }
  return context;
}

export const FEE_KEYS = {
  FINAPAY_BUY_GOLD: 'buy_gold_spread',
  FINAPAY_SELL_GOLD: 'sell_gold_spread',
  FINAPAY_DEPOSIT: 'deposit_fee',
  FINAPAY_WITHDRAW: 'withdrawal_fee',
  FINAPAY_TRANSFER: 'p2p_transfer_fee',
  
  FINAVAULT_STORAGE: 'annual_storage_fee',
  FINAVAULT_CASHOUT: 'cashout_bank_fee',
  FINAVAULT_CASHOUT_WALLET: 'cashout_wallet_fee',
  
  BNSL_ADMIN_FEE: 'early_termination_admin_fee',
  BNSL_EARLY_TERMINATION_PENALTY: 'early_termination_penalty',
  
  FINABRIDGE_SERVICE_FEE: 'platform_service_fee',
} as const;
