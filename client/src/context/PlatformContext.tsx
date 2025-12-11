import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  holderName: string;
  iban: string;
  bic: string;
  currency: 'CHF' | 'EUR' | 'USD';
  isActive: boolean;
}

export interface PlatformSettings {
  // Pricing
  buySpreadPercent: number;
  sellSpreadPercent: number;
  storageFeePercent: number;
  minTradeAmount: number;
  
  // Limits (Level 1)
  level1DailyLimit: number;
  level1MonthlyLimit: number;
  
  // System
  maintenanceMode: boolean;
  registrationsEnabled: boolean;
  autoApproveLowRisk: boolean;

  // Bank Accounts
  bankAccounts: BankAccount[];

  // Vault Inventory
  vaultInventoryGrams: number;
  reservedGoldGrams: number;
}

interface PlatformContextType {
  settings: PlatformSettings;
  updateSettings: (newSettings: Partial<PlatformSettings>) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateInventory: (grams: number, type: 'add' | 'remove' | 'reserve' | 'release') => void;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  buySpreadPercent: 1.5,
  sellSpreadPercent: 1.0,
  storageFeePercent: 0.5,
  minTradeAmount: 50.00,
  level1DailyLimit: 15000,
  level1MonthlyLimit: 100000,
  maintenanceMode: false,
  registrationsEnabled: true,
  autoApproveLowRisk: false,
  vaultInventoryGrams: 125000, // Initial stock
  reservedGoldGrams: 118450,   // Initial liabilities
  bankAccounts: [
    {
      id: '1',
      name: 'Primary CHF Account',
      bankName: 'UBS Switzerland AG',
      holderName: 'FinaTrades AG',
      iban: 'CH93 0024 0000 1122 3344 5',
      bic: 'UBSWCHZH80A',
      currency: 'CHF',
      isActive: true
    },
    {
      id: '2',
      name: 'Secondary EUR Account',
      bankName: 'Credit Suisse (Switzerland) Ltd',
      holderName: 'FinaTrades AG',
      iban: 'CH45 0483 5000 8899 0011 2',
      bic: 'CRESRESXX',
      currency: 'EUR',
      isActive: true
    }
  ]
};

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('fina_platform_settings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse platform settings", e);
      }
    }
  }, []);

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('fina_platform_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<PlatformSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      )
    }));
  };

  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
    const newAccount = { ...account, id: Date.now().toString() };
    setSettings(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount]
    }));
  };

  const updateInventory = (grams: number, type: 'add' | 'remove' | 'reserve' | 'release') => {
    setSettings(prev => {
      let newInventory = prev.vaultInventoryGrams;
      let newReserved = prev.reservedGoldGrams;

      switch (type) {
        case 'add': newInventory += grams; break;
        case 'remove': newInventory -= grams; break;
        case 'reserve': newReserved += grams; break;
        case 'release': newReserved -= grams; break;
      }

      return {
        ...prev,
        vaultInventoryGrams: newInventory,
        reservedGoldGrams: newReserved
      };
    });
  };

  return (
    <PlatformContext.Provider value={{ settings, updateSettings, updateBankAccount, addBankAccount, updateInventory }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}