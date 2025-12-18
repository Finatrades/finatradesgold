import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  
  // Transaction Limits by Tier
  tier1DailyLimit: number;
  tier1MonthlyLimit: number;
  tier1SingleMax: number;
  tier2DailyLimit: number;
  tier2MonthlyLimit: number;
  tier2SingleMax: number;
  tier3DailyLimit: number;
  tier3MonthlyLimit: number;
  tier3SingleMax: number;
  
  // Legacy (for backwards compatibility)
  level1DailyLimit: number;
  level1MonthlyLimit: number;
  
  // Deposit Limits
  minDeposit: number;
  maxDepositSingle: number;
  dailyDepositLimit: number;
  monthlyDepositLimit: number;
  
  // Withdrawal Limits
  minWithdrawal: number;
  maxWithdrawalSingle: number;
  dailyWithdrawalLimit: number;
  withdrawalPendingHours: number;
  withdrawalFeePercent: number;
  withdrawalFeeFixed: number;
  
  // P2P Limits
  minP2pTransfer: number;
  maxP2pTransfer: number;
  dailyP2pLimit: number;
  monthlyP2pLimit: number;
  p2pFeePercent: number;
  
  // BNSL Settings
  bnslAgreementFeePercent: number;
  bnslMaxTermMonths: number;
  bnslMinAmount: number;
  bnslEarlyExitPenalty: number;
  
  // FinaBridge Settings
  tradeFinanceFeePercent: number;
  maxTradeCaseValue: number;
  lcIssuanceFee: number;
  documentProcessingFee: number;
  
  // Payment Fees
  bankTransferFeePercent: number;
  bankTransferFeeFixed: number;
  cardFeePercent: number;
  cardFeeFixed: number;
  cryptoFeePercent: number;
  
  // KYC Settings
  autoApproveLowRisk: boolean;
  kycExpiryDays: number;
  documentExpiryWarningDays: number;
  blockedCountries: string[];
  
  // System
  maintenanceMode: boolean;
  registrationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  sessionTimeoutMinutes: number;
  require2fa: boolean;

  // Vault Inventory
  vaultInventoryGrams: number;
  reservedGoldGrams: number;
  lowStockAlertGrams: number;
  minPhysicalRedemptionGrams: number;
  
  // Referral Settings
  referrerBonusUsd: number;
  refereeBonusUsd: number;
  maxReferralsPerUser: number;
  referralValidityDays: number;
  minDepositForBonus: number;

  // Bank Accounts (legacy support)
  bankAccounts: BankAccount[];
}

interface PlatformContextType {
  settings: PlatformSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<PlatformSettings>) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  deleteBankAccount: (id: string) => void;
  updateInventory: (grams: number, type: 'add' | 'remove' | 'reserve' | 'release') => void;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  buySpreadPercent: 0,
  sellSpreadPercent: 0,
  storageFeePercent: 0,
  minTradeAmount: 0,
  
  tier1DailyLimit: 5000,
  tier1MonthlyLimit: 20000,
  tier1SingleMax: 2000,
  tier2DailyLimit: 50000,
  tier2MonthlyLimit: 250000,
  tier2SingleMax: 25000,
  tier3DailyLimit: 500000,
  tier3MonthlyLimit: 0,
  tier3SingleMax: 500000,
  
  level1DailyLimit: 5000,
  level1MonthlyLimit: 20000,
  
  minDeposit: 50,
  maxDepositSingle: 100000,
  dailyDepositLimit: 250000,
  monthlyDepositLimit: 1000000,
  
  minWithdrawal: 100,
  maxWithdrawalSingle: 50000,
  dailyWithdrawalLimit: 100000,
  withdrawalPendingHours: 24,
  withdrawalFeePercent: 0,
  withdrawalFeeFixed: 0,
  
  minP2pTransfer: 10,
  maxP2pTransfer: 10000,
  dailyP2pLimit: 25000,
  monthlyP2pLimit: 100000,
  p2pFeePercent: 0,
  
  bnslAgreementFeePercent: 1.0,
  bnslMaxTermMonths: 24,
  bnslMinAmount: 500,
  bnslEarlyExitPenalty: 5.0,
  
  tradeFinanceFeePercent: 1.5,
  maxTradeCaseValue: 1000000,
  lcIssuanceFee: 250,
  documentProcessingFee: 25,
  
  bankTransferFeePercent: 0,
  bankTransferFeeFixed: 0,
  cardFeePercent: 2.9,
  cardFeeFixed: 0.30,
  cryptoFeePercent: 0.5,
  
  autoApproveLowRisk: false,
  kycExpiryDays: 365,
  documentExpiryWarningDays: 30,
  blockedCountries: [],
  
  maintenanceMode: false,
  registrationsEnabled: true,
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  sessionTimeoutMinutes: 30,
  require2fa: false,
  
  vaultInventoryGrams: 125000,
  reservedGoldGrams: 118450,
  lowStockAlertGrams: 1000,
  minPhysicalRedemptionGrams: 10,
  
  referrerBonusUsd: 10,
  refereeBonusUsd: 5,
  maxReferralsPerUser: 50,
  referralValidityDays: 30,
  minDepositForBonus: 100,
  
  bankAccounts: []
};

const CONFIG_KEY_MAP: Record<string, keyof PlatformSettings> = {
  'buy_spread_percent': 'buySpreadPercent',
  'sell_spread_percent': 'sellSpreadPercent',
  'storage_fee_percent': 'storageFeePercent',
  'min_trade_amount': 'minTradeAmount',
  'tier1_daily_limit': 'tier1DailyLimit',
  'tier1_monthly_limit': 'tier1MonthlyLimit',
  'tier1_single_max': 'tier1SingleMax',
  'tier2_daily_limit': 'tier2DailyLimit',
  'tier2_monthly_limit': 'tier2MonthlyLimit',
  'tier2_single_max': 'tier2SingleMax',
  'tier3_daily_limit': 'tier3DailyLimit',
  'tier3_monthly_limit': 'tier3MonthlyLimit',
  'tier3_single_max': 'tier3SingleMax',
  'min_deposit': 'minDeposit',
  'max_deposit_single': 'maxDepositSingle',
  'daily_deposit_limit': 'dailyDepositLimit',
  'monthly_deposit_limit': 'monthlyDepositLimit',
  'min_withdrawal': 'minWithdrawal',
  'max_withdrawal_single': 'maxWithdrawalSingle',
  'daily_withdrawal_limit': 'dailyWithdrawalLimit',
  'withdrawal_pending_hours': 'withdrawalPendingHours',
  'withdrawal_fee_percent': 'withdrawalFeePercent',
  'withdrawal_fee_fixed': 'withdrawalFeeFixed',
  'min_p2p_transfer': 'minP2pTransfer',
  'max_p2p_transfer': 'maxP2pTransfer',
  'daily_p2p_limit': 'dailyP2pLimit',
  'monthly_p2p_limit': 'monthlyP2pLimit',
  'p2p_fee_percent': 'p2pFeePercent',
  'bnsl_agreement_fee_percent': 'bnslAgreementFeePercent',
  'bnsl_max_term_months': 'bnslMaxTermMonths',
  'bnsl_min_amount': 'bnslMinAmount',
  'bnsl_early_exit_penalty': 'bnslEarlyExitPenalty',
  'trade_finance_fee_percent': 'tradeFinanceFeePercent',
  'max_trade_case_value': 'maxTradeCaseValue',
  'lc_issuance_fee': 'lcIssuanceFee',
  'document_processing_fee': 'documentProcessingFee',
  'bank_transfer_fee_percent': 'bankTransferFeePercent',
  'bank_transfer_fee_fixed': 'bankTransferFeeFixed',
  'card_fee_percent': 'cardFeePercent',
  'card_fee_fixed': 'cardFeeFixed',
  'crypto_fee_percent': 'cryptoFeePercent',
  'auto_approve_low_risk': 'autoApproveLowRisk',
  'kyc_expiry_days': 'kycExpiryDays',
  'document_expiry_warning_days': 'documentExpiryWarningDays',
  'blocked_countries': 'blockedCountries',
  'maintenance_mode': 'maintenanceMode',
  'registrations_enabled': 'registrationsEnabled',
  'email_notifications_enabled': 'emailNotificationsEnabled',
  'sms_notifications_enabled': 'smsNotificationsEnabled',
  'session_timeout_minutes': 'sessionTimeoutMinutes',
  'require_2fa': 'require2fa',
  'vault_inventory_grams': 'vaultInventoryGrams',
  'reserved_gold_grams': 'reservedGoldGrams',
  'low_stock_alert_grams': 'lowStockAlertGrams',
  'min_physical_redemption_grams': 'minPhysicalRedemptionGrams',
  'referrer_bonus_usd': 'referrerBonusUsd',
  'referee_bonus_usd': 'refereeBonusUsd',
  'max_referrals_per_user': 'maxReferralsPerUser',
  'referral_validity_days': 'referralValidityDays',
  'min_deposit_for_bonus': 'minDepositForBonus',
};

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettingsFromApi = useCallback(async () => {
    try {
      const response = await fetch('/api/platform-config/public');
      if (response.ok) {
        const data = await response.json();
        const apiConfigs = data.configs || {};
        
        const newSettings = { ...DEFAULT_SETTINGS };
        
        Object.entries(apiConfigs).forEach(([key, value]) => {
          const settingsKey = CONFIG_KEY_MAP[key];
          if (settingsKey && value !== undefined) {
            (newSettings as any)[settingsKey] = value;
          }
        });
        
        newSettings.level1DailyLimit = newSettings.tier1DailyLimit;
        newSettings.level1MonthlyLimit = newSettings.tier1MonthlyLimit;
        
        setSettings(prev => ({
          ...newSettings,
          bankAccounts: prev.bankAccounts,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch platform settings from API:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettingsFromApi();
  }, [fetchSettingsFromApi]);

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettingsFromApi();
  };

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

  const deleteBankAccount = (id: string) => {
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(acc => acc.id !== id)
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
    <PlatformContext.Provider value={{ 
      settings, 
      loading,
      updateSettings, 
      updateBankAccount, 
      addBankAccount,
      deleteBankAccount,
      updateInventory,
      refreshSettings
    }}>
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
