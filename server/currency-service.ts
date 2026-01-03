/**
 * Currency Exchange Rate Service
 * Fetches live exchange rates from free APIs with caching
 * 
 * Primary: Frankfurter API (free, no API key required)
 * Fallback: Fixed rates for pegged currencies like AED/USD
 */

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

// Cache for exchange rates (refreshed every hour)
let cachedRates: ExchangeRates | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Fixed rates for pegged currencies (as fallback)
const PEGGED_RATES: Record<string, number> = {
  AED: 3.6725,  // UAE Dirham - pegged to USD
  SAR: 3.75,    // Saudi Riyal - pegged to USD
  BHD: 0.376,   // Bahraini Dinar - pegged to USD
  OMR: 0.385,   // Omani Rial - pegged to USD
  QAR: 3.64,    // Qatari Riyal - pegged to USD
  KWD: 0.307,   // Kuwaiti Dinar - managed float
  JOD: 0.709,   // Jordanian Dinar - pegged to USD
};

/**
 * Fetch exchange rates from Frankfurter API (ECB data, free)
 */
async function fetchFromFrankfurter(): Promise<ExchangeRates | null> {
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=USD');
    if (!response.ok) {
      console.warn('[Currency] Frankfurter API returned non-OK status:', response.status);
      return null;
    }
    const data = await response.json();
    return {
      base: 'USD',
      rates: data.rates,
      timestamp: Date.now()
    };
  } catch (error) {
    console.warn('[Currency] Failed to fetch from Frankfurter API:', error);
    return null;
  }
}

/**
 * Fetch exchange rates from ExchangeRate-API (free tier)
 */
async function fetchFromExchangeRateApi(): Promise<ExchangeRates | null> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      console.warn('[Currency] ExchangeRate-API returned non-OK status:', response.status);
      return null;
    }
    const data = await response.json();
    if (data.result === 'success') {
      return {
        base: 'USD',
        rates: data.rates,
        timestamp: Date.now()
      };
    }
    return null;
  } catch (error) {
    console.warn('[Currency] Failed to fetch from ExchangeRate-API:', error);
    return null;
  }
}

/**
 * Get cached or fresh exchange rates
 */
async function getExchangeRates(): Promise<ExchangeRates> {
  // Check if cache is valid
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION_MS) {
    return cachedRates;
  }

  // Try to fetch fresh rates from APIs
  let rates = await fetchFromExchangeRateApi();
  
  if (!rates) {
    rates = await fetchFromFrankfurter();
  }

  if (rates) {
    // Merge with pegged rates for currencies not in API response
    for (const [currency, rate] of Object.entries(PEGGED_RATES)) {
      if (!rates.rates[currency]) {
        rates.rates[currency] = rate;
      }
    }
    cachedRates = rates;
    console.log('[Currency] Exchange rates updated successfully');
    return rates;
  }

  // Fallback to pegged rates if all APIs fail
  console.warn('[Currency] All APIs failed, using pegged rates as fallback');
  return {
    base: 'USD',
    rates: PEGGED_RATES,
    timestamp: Date.now()
  };
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string
): Promise<{ convertedAmount: number; rate: number; source: string }> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  // Same currency - no conversion needed
  if (from === to) {
    return { convertedAmount: amount, rate: 1, source: 'direct' };
  }
  
  const rates = await getExchangeRates();
  
  // Convert to USD first (if not already USD), then to target currency
  let amountInUsd = amount;
  if (from !== 'USD') {
    const fromRate = rates.rates[from];
    if (!fromRate) {
      console.warn(`[Currency] Unknown currency: ${from}, using 1:1 rate`);
      amountInUsd = amount;
    } else {
      amountInUsd = amount / fromRate;
    }
  }
  
  // Convert from USD to target currency
  let convertedAmount = amountInUsd;
  if (to !== 'USD') {
    const toRate = rates.rates[to];
    if (!toRate) {
      console.warn(`[Currency] Unknown currency: ${to}, using 1:1 rate`);
      convertedAmount = amountInUsd;
    } else {
      convertedAmount = amountInUsd * toRate;
    }
  }
  
  // Calculate effective rate
  const effectiveRate = amount !== 0 ? convertedAmount / amount : 1;
  
  return { 
    convertedAmount, 
    rate: effectiveRate,
    source: cachedRates ? 'live' : 'pegged'
  };
}

/**
 * Get the exchange rate for a specific currency pair
 */
export async function getExchangeRate(
  fromCurrency: string, 
  toCurrency: string
): Promise<{ rate: number; source: string; timestamp: number }> {
  const result = await convertCurrency(1, fromCurrency, toCurrency);
  return {
    rate: result.rate,
    source: result.source,
    timestamp: cachedRates?.timestamp || Date.now()
  };
}

/**
 * Get all supported exchange rates (from USD base)
 */
export async function getAllRates(): Promise<ExchangeRates> {
  return getExchangeRates();
}

/**
 * Convert amount to USD (commonly used function)
 */
export async function toUsd(amount: number, fromCurrency: string): Promise<number> {
  const result = await convertCurrency(amount, fromCurrency, 'USD');
  return result.convertedAmount;
}

/**
 * Convert amount from USD to another currency
 */
export async function fromUsd(amount: number, toCurrency: string): Promise<number> {
  const result = await convertCurrency(amount, 'USD', toCurrency);
  return result.convertedAmount;
}
