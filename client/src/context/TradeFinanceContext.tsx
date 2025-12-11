import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TradeCase, FinaBridgeWallet } from '@/types/finabridge';
import { toast } from 'sonner';

// Mock Data
const MOCK_WALLET: FinaBridgeWallet = {
  importer: { availableGoldGrams: 250.0, lockedGoldGrams: 150.0 },
  exporter: { availableGoldGrams: 40.0, lockedGoldGrams: 0, incomingLockedGoldGrams: 150.0 }
};

const MOCK_CASES: TradeCase[] = [
  {
    id: 'TF-2025-0007',
    name: 'Gold Bullion Import - Dubai to London',
    role: 'Importer',
    buyer: { company: 'FinaTrades Importer Ltd', country: 'UK', contactName: 'John Buyer', email: 'john@importer.com' },
    seller: { company: 'Pending Finatrades Assignment', country: 'Global', contactName: 'FinaTrades Broker Desk', email: 'broker@finatrades.com' },
    commodityDescription: '10kg Gold Bullion, 999.9 Purity',
    valueUsd: 852200,
    valueGoldGrams: 10000,
    paymentTerms: 'LC',
    deliveryTerms: 'CIF',
    shipmentMethod: 'Secure Logistics',
    expectedDeliveryDate: '2025-02-15',
    lockedGoldGrams: 10000,
    status: 'Funded – Docs Pending',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
    riskLevel: 'Low',
    amlStatus: 'Clear'
  }
];

interface TradeFinanceContextType {
  cases: TradeCase[];
  wallet: FinaBridgeWallet;
  addCase: (newCase: TradeCase) => void;
  updateCaseStatus: (id: string, status: TradeCase['status']) => void;
  updateWallet: (updater: (prev: FinaBridgeWallet) => FinaBridgeWallet) => void;
}

const TradeFinanceContext = createContext<TradeFinanceContextType | undefined>(undefined);

export function TradeFinanceProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<TradeCase[]>(MOCK_CASES);
  const [wallet, setWallet] = useState<FinaBridgeWallet>(MOCK_WALLET);

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