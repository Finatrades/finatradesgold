import React, { createContext, useContext, useState, useEffect } from 'react';
import { FinaPayWallet, FinaPayTransaction, GoldPricePoint, LimitsConfig, AmlFlag, FinaPayContextType } from '@/types/finapay';

// Mock Data
const MOCK_WALLET: FinaPayWallet = {
  userId: 'U-001',
  walletId: 'WAL-8821-GOLD',
  tier: 'Gold',
  goldBalanceGrams: 1250.50,
  goldValueUsd: 0, // Calculated dynamically
  goldValueAed: 0, // Calculated dynamically
  availableGoldGrams: 1000.00,
  lockedForBnslGrams: 200.00,
  lockedForTradeGrams: 50.50,
  pendingSettlementGrams: 0,
  lastUpdated: new Date().toISOString()
};

const MOCK_TRANSACTIONS: FinaPayTransaction[] = [
  { id: 'TX-1', type: 'BuyGold', status: 'Completed', createdAt: '2025-03-10T10:00:00Z', goldGrams: 50, amountUsd: 3750, feeUsd: 10, reference: 'BUY-001' },
  { id: 'TX-2', type: 'SendGold', status: 'Completed', createdAt: '2025-03-09T14:30:00Z', goldGrams: 10, amountUsd: 750, counterpartyLabel: 'John Doe', toWalletId: 'WAL-999', reference: 'SEND-001' },
  { id: 'TX-3', type: 'BNSLJoin', status: 'Completed', createdAt: '2025-03-01T09:00:00Z', goldGrams: 200, note: 'Locked for 12m Plan', reference: 'BNSL-2025-0012' }
];

const MOCK_LIMITS: LimitsConfig = {
  dailyBuyUsd: 50000,
  dailySellUsd: 50000,
  dailySendGoldGrams: 1000,
  remainingBuyUsdToday: 45000,
  remainingSellUsdToday: 50000,
  remainingSendGoldGramsToday: 990
};

const FinaPayContext = createContext<FinaPayContextType | undefined>(undefined);

export function FinaPayProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<FinaPayWallet>(MOCK_WALLET);
  const [transactions, setTransactions] = useState<FinaPayTransaction[]>(MOCK_TRANSACTIONS);
  const [limits, setLimits] = useState<LimitsConfig>(MOCK_LIMITS);
  const [amlFlags, setAmlFlags] = useState<AmlFlag[]>([]);
  const [currentGoldPriceUsdPerGram, setCurrentGoldPriceUsdPerGram] = useState(75.50);
  const [goldPriceHistory, setGoldPriceHistory] = useState<GoldPricePoint[]>([]);

  // Generate mock price history
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

  // Update wallet values when price changes
  useEffect(() => {
    setWallet(prev => ({
      ...prev,
      goldValueUsd: prev.goldBalanceGrams * currentGoldPriceUsdPerGram,
      goldValueAed: prev.goldBalanceGrams * currentGoldPriceUsdPerGram * 3.67 // Mock FX
    }));
  }, [currentGoldPriceUsdPerGram, wallet.goldBalanceGrams]);

  const addTransaction = (tx: FinaPayTransaction) => {
    setTransactions([tx, ...transactions]);
  };

  const updateWallet = (updates: Partial<FinaPayWallet>) => {
    setWallet(prev => ({ ...prev, ...updates }));
  };

  return (
    <FinaPayContext.Provider value={{
      wallet,
      goldPriceHistory,
      transactions,
      limits,
      amlFlags,
      currentGoldPriceUsdPerGram,
      addTransaction,
      updateWallet
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
