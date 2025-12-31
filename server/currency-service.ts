import { db } from "./db";
import { 
  exchangeRates, 
  exchangeRateHistory, 
  supportedCurrencies, 
  currencyConversionLogs,
  SUPPORTED_CURRENCIES_LIST,
  type InsertExchangeRate,
  type InsertCurrencyConversionLog,
  type SupportedCurrency,
  type ExchangeRate
} from "@shared/schema";
import { eq, and, desc, gte, lte, isNull, or } from "drizzle-orm";

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AED' | 'CHF' | 'SAR' | 'KWD' | 'BHD' | 'QAR' | 'OMR';

interface ExchangeRateData {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  inverseRate: number;
  validFrom: Date;
  validUntil: Date | null;
  provider: string;
}

interface CachedRates {
  rates: Map<string, number>;
  timestamp: Date;
  expiresAt: Date;
}

let cachedRates: CachedRates | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache
const FALLBACK_RATES: Record<string, number> = {
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

export class CurrencyService {
  private static instance: CurrencyService;

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  async seedSupportedCurrencies(): Promise<void> {
    try {
      for (const currency of SUPPORTED_CURRENCIES_LIST) {
        const existing = await db.select()
          .from(supportedCurrencies)
          .where(eq(supportedCurrencies.code, currency.code))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(supportedCurrencies).values({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            symbolPosition: currency.symbolPosition,
            decimalPlaces: currency.decimalPlaces,
            isActive: true,
            isDefault: currency.code === 'USD',
            displayOrder: SUPPORTED_CURRENCIES_LIST.findIndex(c => c.code === currency.code),
          });
        }
      }
      console.log('[Currency] Supported currencies seeded successfully');
    } catch (error) {
      console.error('[Currency] Failed to seed currencies:', error);
    }
  }

  async getSupportedCurrencies(): Promise<SupportedCurrency[]> {
    try {
      const currencies = await db.select()
        .from(supportedCurrencies)
        .where(eq(supportedCurrencies.isActive, true))
        .orderBy(supportedCurrencies.displayOrder);
      return currencies;
    } catch (error) {
      console.error('[Currency] Failed to get supported currencies:', error);
      return SUPPORTED_CURRENCIES_LIST.map((c, i) => ({
        id: c.code,
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        symbolPosition: c.symbolPosition,
        decimalPlaces: c.decimalPlaces,
        isActive: true,
        isDefault: c.code === 'USD',
        displayOrder: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }
  }

  async getExchangeRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): Promise<number> {
    if (fromCurrency === toCurrency) return 1.0;

    try {
      const now = new Date();
      const rate = await db.select()
        .from(exchangeRates)
        .where(and(
          eq(exchangeRates.baseCurrency, fromCurrency),
          eq(exchangeRates.quoteCurrency, toCurrency),
          eq(exchangeRates.isActive, true),
          lte(exchangeRates.validFrom, now),
          or(
            isNull(exchangeRates.validUntil),
            gte(exchangeRates.validUntil, now)
          )
        ))
        .orderBy(desc(exchangeRates.validFrom))
        .limit(1);

      if (rate.length > 0) {
        return parseFloat(rate[0].rate);
      }

      const inverseRate = await db.select()
        .from(exchangeRates)
        .where(and(
          eq(exchangeRates.baseCurrency, toCurrency),
          eq(exchangeRates.quoteCurrency, fromCurrency),
          eq(exchangeRates.isActive, true),
          lte(exchangeRates.validFrom, now),
          or(
            isNull(exchangeRates.validUntil),
            gte(exchangeRates.validUntil, now)
          )
        ))
        .orderBy(desc(exchangeRates.validFrom))
        .limit(1);

      if (inverseRate.length > 0) {
        return 1 / parseFloat(inverseRate[0].rate);
      }

      return this.getFallbackRate(fromCurrency, toCurrency);
    } catch (error) {
      console.error(`[Currency] Failed to get exchange rate ${fromCurrency}/${toCurrency}:`, error);
      return this.getFallbackRate(fromCurrency, toCurrency);
    }
  }

  private getFallbackRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number {
    const fromUsd = FALLBACK_RATES[fromCurrency] || 1;
    const toUsd = FALLBACK_RATES[toCurrency] || 1;
    return toUsd / fromUsd;
  }

  async convert(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    options?: {
      userId?: string;
      transactionId?: string;
      conversionType?: string;
    }
  ): Promise<{ amount: number; rate: number; rateId?: string }> {
    if (fromCurrency === toCurrency) {
      return { amount, rate: 1.0 };
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;

    if (options?.userId || options?.transactionId) {
      try {
        await db.insert(currencyConversionLogs).values({
          userId: options.userId,
          transactionId: options.transactionId,
          fromCurrency,
          toCurrency,
          fromAmount: amount.toString(),
          toAmount: convertedAmount.toString(),
          exchangeRateUsed: rate.toString(),
          conversionType: options.conversionType || 'transaction',
        });
      } catch (error) {
        console.error('[Currency] Failed to log conversion:', error);
      }
    }

    return { amount: convertedAmount, rate };
  }

  async convertToUsd(amount: number, fromCurrency: CurrencyCode): Promise<number> {
    const result = await this.convert(amount, fromCurrency, 'USD');
    return result.amount;
  }

  async convertFromUsd(amountUsd: number, toCurrency: CurrencyCode): Promise<number> {
    const result = await this.convert(amountUsd, 'USD', toCurrency);
    return result.amount;
  }

  async getLatestRates(baseCurrency: CurrencyCode = 'USD'): Promise<Record<string, number>> {
    try {
      if (cachedRates && cachedRates.expiresAt > new Date()) {
        const rates: Record<string, number> = { [baseCurrency]: 1.0 };
        const entries = Array.from(cachedRates.rates.entries());
        for (let i = 0; i < entries.length; i++) {
          const [key, value] = entries[i];
          if (key.startsWith(`${baseCurrency}/`)) {
            rates[key.split('/')[1]] = value;
          }
        }
        return rates;
      }

      const now = new Date();
      const dbRates = await db.select()
        .from(exchangeRates)
        .where(and(
          eq(exchangeRates.baseCurrency, baseCurrency),
          eq(exchangeRates.isActive, true),
          lte(exchangeRates.validFrom, now),
          or(
            isNull(exchangeRates.validUntil),
            gte(exchangeRates.validUntil, now)
          )
        ))
        .orderBy(desc(exchangeRates.validFrom));

      const rates: Record<string, number> = { [baseCurrency]: 1.0 };
      for (const rate of dbRates) {
        if (!rates[rate.quoteCurrency]) {
          rates[rate.quoteCurrency] = parseFloat(rate.rate);
        }
      }

      for (const currency of Object.keys(FALLBACK_RATES)) {
        if (!rates[currency]) {
          rates[currency] = this.getFallbackRate(baseCurrency as CurrencyCode, currency as CurrencyCode);
        }
      }

      return rates;
    } catch (error) {
      console.error('[Currency] Failed to get latest rates:', error);
      const rates: Record<string, number> = {};
      for (const currency of Object.keys(FALLBACK_RATES)) {
        rates[currency] = this.getFallbackRate(baseCurrency, currency as CurrencyCode);
      }
      return rates;
    }
  }

  async updateExchangeRates(): Promise<void> {
    try {
      const apiKey = process.env.EXCHANGE_RATE_API_KEY;
      
      if (!apiKey) {
        console.log('[Currency] No exchange rate API key configured, using fallback rates');
        await this.seedFallbackRates();
        return;
      }

      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error(`Exchange rate API returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.result !== 'success') {
        throw new Error(`Exchange rate API error: ${data['error-type']}`);
      }

      const now = new Date();
      const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.update(exchangeRates)
        .set({ isActive: false })
        .where(eq(exchangeRates.baseCurrency, 'USD'));

      const conversionRates = data.conversion_rates as Record<string, number>;
      for (const currency of Object.keys(conversionRates)) {
        if (FALLBACK_RATES[currency] !== undefined) {
          const rate = conversionRates[currency];
          await db.insert(exchangeRates).values({
            baseCurrency: 'USD',
            quoteCurrency: currency,
            rate: rate.toString(),
            inverseRate: (1 / rate).toString(),
            provider: 'exchangerate-api',
            validFrom: now,
            validUntil,
            isActive: true,
          });
        }
      }

      console.log('[Currency] Exchange rates updated successfully');

      cachedRates = null;
    } catch (error) {
      console.error('[Currency] Failed to update exchange rates:', error);
      await this.seedFallbackRates();
    }
  }

  private async seedFallbackRates(): Promise<void> {
    try {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const [currency, rate] of Object.entries(FALLBACK_RATES)) {
        if (currency === 'USD') continue;

        const existing = await db.select()
          .from(exchangeRates)
          .where(and(
            eq(exchangeRates.baseCurrency, 'USD'),
            eq(exchangeRates.quoteCurrency, currency),
            eq(exchangeRates.isActive, true)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(exchangeRates).values({
            baseCurrency: 'USD',
            quoteCurrency: currency,
            rate: rate.toString(),
            inverseRate: (1 / rate).toString(),
            provider: 'fallback',
            validFrom: now,
            validUntil,
            isActive: true,
          });
        }
      }
      console.log('[Currency] Fallback exchange rates seeded');
    } catch (error) {
      console.error('[Currency] Failed to seed fallback rates:', error);
    }
  }

  formatCurrency(
    amount: number,
    currencyCode: CurrencyCode,
    options?: { showSymbol?: boolean; locale?: string }
  ): string {
    const currency = SUPPORTED_CURRENCIES_LIST.find(c => c.code === currencyCode);
    const decimalPlaces = currency?.decimalPlaces ?? 2;
    const symbol = currency?.symbol ?? currencyCode;
    const position = currency?.symbolPosition ?? 'before';

    const formattedNumber = amount.toLocaleString(options?.locale || 'en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });

    if (options?.showSymbol === false) {
      return formattedNumber;
    }

    if (position === 'before') {
      return `${symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${symbol}`;
    }
  }

  getCurrencyInfo(code: CurrencyCode): typeof SUPPORTED_CURRENCIES_LIST[number] | undefined {
    return SUPPORTED_CURRENCIES_LIST.find(c => c.code === code);
  }

  async getGoldPriceInCurrency(goldPriceUsd: number, currency: CurrencyCode): Promise<number> {
    if (currency === 'USD') return goldPriceUsd;
    const rate = await this.getExchangeRate('USD', currency);
    return goldPriceUsd * rate;
  }

  async getPortfolioValueInCurrency(
    goldGrams: number,
    goldPriceUsd: number,
    fiatBalances: Record<string, number>,
    targetCurrency: CurrencyCode
  ): Promise<{
    goldValueInTarget: number;
    fiatValueInTarget: number;
    totalValueInTarget: number;
    breakdown: Record<string, number>;
  }> {
    const goldValueUsd = goldGrams * goldPriceUsd;
    const goldValueInTarget = await this.convertFromUsd(goldValueUsd, targetCurrency);

    let fiatValueInTarget = 0;
    const breakdown: Record<string, number> = {};

    for (const [currency, balance] of Object.entries(fiatBalances)) {
      if (balance > 0) {
        const valueInTarget = await this.convert(
          balance,
          currency as CurrencyCode,
          targetCurrency
        );
        fiatValueInTarget += valueInTarget.amount;
        breakdown[currency] = valueInTarget.amount;
      }
    }

    return {
      goldValueInTarget,
      fiatValueInTarget,
      totalValueInTarget: goldValueInTarget + fiatValueInTarget,
      breakdown,
    };
  }
}

export const currencyService = CurrencyService.getInstance();

export async function initializeCurrencyService(): Promise<void> {
  console.log('[Currency] Initializing currency service...');
  await currencyService.seedSupportedCurrencies();
  await currencyService.updateExchangeRates();
  console.log('[Currency] Currency service initialized');
}
