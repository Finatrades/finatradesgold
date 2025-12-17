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
  const [currentGoldPriceUsdPerGram, setCurrentGoldPriceUsdPerGram] = useState(0);
  const [goldPriceHistory, setGoldPriceHistory] = useState<GoldPricePoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGoldPrice = async () => {
    try {
      const response = await fetch('/api/gold-price');
      if (response.ok) {
        const data = await response.json();
        setCurrentGoldPriceUsdPerGram(data.pricePerGram || 0);
        
        setGoldPriceHistory(prev => {
          const newPoint = {
            timestamp: new Date().toISOString(),
            priceUsd: data.pricePerGram || 0
          };
          const updated = [...prev, newPoint].slice(-30);
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to fetch gold price:', error);
    }
  };

  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 30000);
    return () => clearInterval(interval);
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
      // Fetch regular transactions, deposit requests, and crypto payments
      const [txResponse, depositResponse, cryptoResponse] = await Promise.all([
        fetch(`/api/transactions/${user.id}`),
        fetch(`/api/deposit-requests/${user.id}`),
        fetch(`/api/crypto-payments/user/${user.id}`)
      ]);
      
      let allTransactions: any[] = [];
      
      if (txResponse.ok) {
        const txData = await txResponse.json();
        allTransactions = [...(txData.transactions || [])];
      }
      
      // Convert pending deposit requests to transaction-like format (exclude confirmed ones since they have real transactions)
      if (depositResponse.ok) {
        const depositData = await depositResponse.json();
        const pendingDepositTransactions = (depositData.requests || [])
          .filter((dep: any) => dep.status !== 'Confirmed' && dep.status !== 'Approved')
          .map((dep: any) => ({
            id: dep.id,
            userId: dep.userId,
            type: 'Deposit',
            status: dep.status,
            amountUsd: dep.amountUsd,
            amountGold: null,
            createdAt: dep.createdAt,
            referenceId: dep.referenceNumber,
            description: `Bank Transfer - ${dep.senderBankName || 'Bank Deposit'}`,
            isDepositRequest: true,
          }));
        allTransactions = [...allTransactions, ...pendingDepositTransactions];
      }
      
      // Convert crypto payment requests to transaction-like format
      if (cryptoResponse.ok) {
        const cryptoData = await cryptoResponse.json();
        const cryptoTransactions = (cryptoData.requests || [])
          .filter((cp: any) => cp.status !== 'Approved') // Only show non-approved
          .map((cp: any) => ({
            id: cp.id,
            userId: cp.userId,
            type: 'Deposit',
            status: cp.status === 'Approved' ? 'Completed' : cp.status,
            amountUsd: cp.amountUsd,
            amountGold: cp.goldGrams,
            createdAt: cp.createdAt,
            referenceId: cp.transactionHash ? cp.transactionHash.substring(0, 10) : null,
            description: `Crypto Deposit - ${cp.status}`,
            isCryptoPayment: true,
          }));
        allTransactions = [...allTransactions, ...cryptoTransactions];
      }
      
      // Sort by date (newest first)
      allTransactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setTransactions(allTransactions);
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
