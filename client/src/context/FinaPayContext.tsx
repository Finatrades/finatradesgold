import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import type { Wallet, Transaction } from '@shared/schema';

interface GoldPricePoint {
  timestamp: string;
  priceUsd: number;
}

interface FinaPayContextType {
  wallet: Wallet | null;
  transactions: Transaction[];
  currentGoldPriceUsdPerGram: number;
  goldPriceHistory: GoldPricePoint[];
  createTransaction: (transactionData: any) => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  loading: boolean;
}

const FinaPayContext = createContext<FinaPayContextType | undefined>(undefined);

export function FinaPayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentGoldPriceUsdPerGram, setCurrentGoldPriceUsdPerGram] = useState(75.50);
  const [goldPriceHistory, setGoldPriceHistory] = useState<GoldPricePoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate mock price history (will be replaced with real data later)
  useEffect(() => {
    const history: GoldPricePoint[] = [];
    let price = 74.00;
    for (let i = 0; i < 30; i++) {
      price = price + (Math.random() - 0.5);
      history.push({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
        priceUsd: price
      });
    }
    setGoldPriceHistory(history);
    setCurrentGoldPriceUsdPerGram(price);
  }, []);

  useEffect(() => {
    if (user) {
      refreshWallet();
      refreshTransactions();
    }
  }, [user]);

  const refreshWallet = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTransactions = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/transactions/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const createTransaction = async (transactionData: any) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionData,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transaction failed');
      }

      await refreshTransactions();
      await refreshWallet();
    } catch (error) {
      throw error;
    }
  };

  return (
    <FinaPayContext.Provider value={{
      wallet,
      transactions,
      currentGoldPriceUsdPerGram,
      goldPriceHistory,
      createTransaction,
      refreshWallet,
      refreshTransactions,
      loading
    }}>
      {children}
    </FinaPayContext.Provider>
  );
}

export function useFinaPay() {
  const context = useContext(FinaPayContext);
  if (context === undefined) {
    throw new Error('useFinaPay must be used within a FinaPayProvider');
  }
  return context;
}
