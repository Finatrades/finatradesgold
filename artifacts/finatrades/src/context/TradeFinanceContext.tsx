import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TradeCase, FinaBridgeWallet } from '@/types/finabridge';
import { toast } from 'sonner';

const EMPTY_WALLET: FinaBridgeWallet = {
  importer: { availableGoldGrams: 0, lockedGoldGrams: 0 },
  exporter: { availableGoldGrams: 0, lockedGoldGrams: 0, incomingLockedGoldGrams: 0 }
};

interface TradeFinanceContextType {
  cases: TradeCase[];
  wallet: FinaBridgeWallet;
  addCase: (newCase: TradeCase) => void;
  updateCaseStatus: (id: string, status: TradeCase['status']) => void;
  updateWallet: (updater: (prev: FinaBridgeWallet) => FinaBridgeWallet) => void;
}

const TradeFinanceContext = createContext<TradeFinanceContextType | undefined>(undefined);

export function TradeFinanceProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<TradeCase[]>([]);
  const [wallet, setWallet] = useState<FinaBridgeWallet>(EMPTY_WALLET);

  const addCase = (newCase: TradeCase) => {
    setCases(prev => [newCase, ...prev]);
  };

  const updateCaseStatus = (id: string, status: TradeCase['status']) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    toast.success(`Trade Case Updated`, {
      description: `Case ${id} status changed to ${status}`
    });
  };

  const updateWallet = (updater: (prev: FinaBridgeWallet) => FinaBridgeWallet) => {
    setWallet(updater);
  };

  return (
    <TradeFinanceContext.Provider value={{ cases, wallet, addCase, updateCaseStatus, updateWallet }}>
      {children}
    </TradeFinanceContext.Provider>
  );
}

export function useTradeFinance() {
  const context = useContext(TradeFinanceContext);
  if (context === undefined) {
    throw new Error('useTradeFinance must be used within a TradeFinanceProvider');
  }
  return context;
}