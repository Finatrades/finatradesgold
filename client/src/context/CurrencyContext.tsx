import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AED' | 'CHF' | 'SAR' | 'KWD' | 'BHD' | 'QAR' | 'OMR';

export interface SupportedCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: string;
}

interface CurrencyContextType {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (currency: CurrencyCode) => void;
  currencies: SupportedCurrency[];
  exchangeRates: Record<string, number>;
  loading: boolean;
  error: string | null;
  convert: (amount: number, from: CurrencyCode, to?: CurrencyCode) => number;
  formatCurrency: (amount: number, currency?: CurrencyCode, showSymbol?: boolean) => string;
  formatGoldPrice: (priceUsd: number, currency?: CurrencyCode) => string;
  getCurrencySymbol: (currency: CurrencyCode) => string;
  getCurrencyInfo: (currency: CurrencyCode) => SupportedCurrency | undefined;
  refreshRates: () => Promise<void>;
}

const defaultCurrencies: SupportedCurrency[] = [
  { id: 'USD', code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isDefault: true, displayOrder: 0 },
  { id: 'EUR', code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isDefault: false, displayOrder: 1 },
  { id: 'GBP', code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isDefault: false, displayOrder: 2 },
  { id: 'AED', code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', symbolPosition: 'after', decimalPlaces: 2, isActive: true, isDefault: false, displayOrder: 3 },
  { id: 'CHF', code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isDefault: false, displayOrder: 4 },
  { id: 'SAR', code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', symbolPosition: 'after', decimalPlaces: 2, isActive: true, isDefault: false, displayOrder: 5 },
];

const defaultExchangeRates: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.6725,
  CHF: 0.88,
  SAR: 3.75,
  KWD: 0.31,
  BHD: 0.377,
  QAR: 3.64,
  OMR: 0.385,
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>('USD');
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>(defaultCurrencies);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(defaultExchangeRates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrencies = useCallback(async () => {
    try {
      const response = await fetch('/api/currencies');
      if (response.ok) {
        const data = await response.json();
        setCurrencies(data);
      }
    } catch (err) {
      console.error('[Currency] Failed to fetch currencies:', err);
    }
  }, []);

  const fetchExchangeRates = useCallback(async () => {
    try {
      const response = await fetch('/api/exchange-rates?base=USD');
      if (response.ok) {
        const data: ExchangeRates = await response.json();
        setExchangeRates(data.rates);
      }
    } catch (err) {
      console.error('[Currency] Failed to fetch exchange rates:', err);
    }
  }, []);

  const refreshRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCurrencies(), fetchExchangeRates()]);
    } catch (err) {
      setError('Failed to refresh exchange rates');
    } finally {
      setLoading(false);
    }
  }, [fetchCurrencies, fetchExchangeRates]);

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshRates]);

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user-preferences/${user.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(prefs => {
          if (prefs?.displayCurrency) {
            setDisplayCurrencyState(prefs.displayCurrency as CurrencyCode);
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const setDisplayCurrency = useCallback((currency: CurrencyCode) => {
    setDisplayCurrencyState(currency);
    if (user?.id) {
      fetch(`/api/user-preferences/${user.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ displayCurrency: currency })
      }).catch(() => {});
    }
  }, [user?.id]);

  const convert = useCallback((amount: number, from: CurrencyCode, to?: CurrencyCode): number => {
    const targetCurrency = to || displayCurrency;
    if (from === targetCurrency) return amount;

    const fromRate = exchangeRates[from] || 1;
    const toRate = exchangeRates[targetCurrency] || 1;
    const amountInUsd = amount / fromRate;
    return amountInUsd * toRate;
  }, [displayCurrency, exchangeRates]);

  const getCurrencyInfo = useCallback((currency: CurrencyCode): SupportedCurrency | undefined => {
    return currencies.find(c => c.code === currency);
  }, [currencies]);

  const getCurrencySymbol = useCallback((currency: CurrencyCode): string => {
    const info = getCurrencyInfo(currency);
    return info?.symbol || currency;
  }, [getCurrencyInfo]);

  const formatCurrency = useCallback((
    amount: number, 
    currency?: CurrencyCode, 
    showSymbol: boolean = true
  ): string => {
    const currencyCode = currency || displayCurrency;
    const info = getCurrencyInfo(currencyCode);
    const decimalPlaces = info?.decimalPlaces ?? 2;
    const symbol = info?.symbol ?? currencyCode;
    const position = info?.symbolPosition ?? 'before';

    const formattedNumber = amount.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });

    if (!showSymbol) {
      return formattedNumber;
    }

    if (position === 'before') {
      return `${symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${symbol}`;
    }
  }, [displayCurrency, getCurrencyInfo]);

  const formatGoldPrice = useCallback((priceUsd: number, currency?: CurrencyCode): string => {
    const targetCurrency = currency || displayCurrency;
    const convertedPrice = convert(priceUsd, 'USD', targetCurrency);
    return formatCurrency(convertedPrice, targetCurrency);
  }, [displayCurrency, convert, formatCurrency]);

  const value = useMemo(() => ({
    displayCurrency,
    setDisplayCurrency,
    currencies,
    exchangeRates,
    loading,
    error,
    convert,
    formatCurrency,
    formatGoldPrice,
    getCurrencySymbol,
    getCurrencyInfo,
    refreshRates,
  }), [
    displayCurrency,
    setDisplayCurrency,
    currencies,
    exchangeRates,
    loading,
    error,
    convert,
    formatCurrency,
    formatGoldPrice,
    getCurrencySymbol,
    getCurrencyInfo,
    refreshRates,
  ]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
