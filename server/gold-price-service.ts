import { db } from "./db";
import { paymentGatewaySettings } from "@shared/schema";

interface GoldPriceData {
  pricePerGram: number;
  pricePerOunce: number;
  currency: string;
  timestamp: Date;
  source: string;
}

interface CachedPrice {
  data: GoldPriceData;
  expiresAt: Date;
  etag?: string;
}

interface GoldApiConfig {
  enabled: boolean;
  apiKey: string | null;
  provider: string;
  cacheDuration: number;
  markupPercent: number;
}

interface ApiUsageStats {
  callsThisMonth: number;
  monthStart: Date;
  lastCallTime: Date | null;
}

let cachedPrice: CachedPrice | null = null;
let lastKnownPrice: GoldPriceData | null = null;
let cacheDurationMs = 10 * 60 * 1000; // 10 minutes default (matches Copper Pack update frequency)

// API usage tracking for Copper Pack (2,500 calls/month)
let apiUsageStats: ApiUsageStats = {
  callsThisMonth: 0,
  monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  lastCallTime: null
};

const COPPER_PACK_MONTHLY_LIMIT = 2500;
const COPPER_PACK_RATE_LIMIT = 60; // 60 requests per minute

// Default fallback price when no cached data available
const DEFAULT_FALLBACK_PRICE: GoldPriceData = {
  pricePerGram: 143.00,
  pricePerOunce: 4449.00,
  currency: 'USD',
  timestamp: new Date(),
  source: 'fallback-default'
};

function resetMonthlyCounterIfNeeded(): void {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  if (apiUsageStats.monthStart < currentMonthStart) {
    console.log('[GoldPrice] New month started, resetting API call counter');
    apiUsageStats = {
      callsThisMonth: 0,
      monthStart: currentMonthStart,
      lastCallTime: null
    };
  }
}

function shouldConserveApiCalls(): boolean {
  resetMonthlyCounterIfNeeded();
  
  const usagePercent = (apiUsageStats.callsThisMonth / COPPER_PACK_MONTHLY_LIMIT) * 100;
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = (dayOfMonth / daysInMonth) * 100;
  
  // If usage is ahead of month progress, start conserving
  if (usagePercent > monthProgress + 10) {
    console.log(`[GoldPrice] API usage (${usagePercent.toFixed(1)}%) ahead of month progress (${monthProgress.toFixed(1)}%), extending cache`);
    return true;
  }
  
  // Warn when approaching limits
  if (usagePercent > 80) {
    console.log(`[GoldPrice] Warning: ${usagePercent.toFixed(1)}% of monthly API calls used`);
  }
  
  return false;
}

function getSmartCacheDuration(baseDuration: number): number {
  const MAX_CACHE_DURATION = 10 * 60 * 1000; // Never exceed 10 minutes (SLA limit)
  const now = new Date();
  const hour = now.getUTCHours();
  
  let duration = baseDuration;
  
  // Off-peak hours (market closed): extend cache slightly
  // Gold markets: London (3AM-12PM UTC), NY (1PM-6PM UTC)
  const isOffPeak = hour >= 22 || hour < 3;
  
  if (isOffPeak && shouldConserveApiCalls()) {
    duration = baseDuration * 1.2; // Only 20% extension when both conditions met
  }
  
  // Cap at 10 minutes to ensure price freshness per SLA
  return Math.min(duration, MAX_CACHE_DURATION);
}

async function getGoldApiConfig(): Promise<GoldApiConfig> {
  try {
    const settings = await db.select().from(paymentGatewaySettings).limit(1);
    if (settings[0]) {
      return {
        enabled: settings[0].metalsApiEnabled || false,
        apiKey: settings[0].metalsApiKey || null,
        provider: 'metals-api',
        cacheDuration: settings[0].metalsApiCacheDuration || 10, // Default 10 min for Copper Pack
        markupPercent: parseFloat(settings[0].goldPriceMarkupPercent || '0'),
      };
    }
  } catch (error) {
    console.error('[GoldPrice] Failed to get Gold API config:', error);
  }
  return { enabled: false, apiKey: null, provider: 'metals-api', cacheDuration: 10, markupPercent: 0 };
}

async function fetchFromMetalsApi(apiKey: string, currentEtag?: string): Promise<{ data: GoldPriceData; etag?: string; notModified?: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Finatrades/1.0'
    };
    
    // Use ETag for conditional requests (saves bandwidth, still counts as API call but smaller response)
    if (currentEtag) {
      headers['If-None-Match'] = currentEtag;
    }
    
    const response = await fetch(
      `https://metals-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=XAU`,
      { 
        signal: controller.signal,
        headers
      }
    );
    clearTimeout(timeout);
    
    // Track API usage
    resetMonthlyCounterIfNeeded();
    apiUsageStats.callsThisMonth++;
    apiUsageStats.lastCallTime = new Date();
    
    const remainingCalls = COPPER_PACK_MONTHLY_LIMIT - apiUsageStats.callsThisMonth;
    if (remainingCalls < 500) {
      console.log(`[GoldPrice] Metals-API calls remaining this month: ${remainingCalls}`);
    }
    
    // Handle 304 Not Modified (price hasn't changed)
    if (response.status === 304 && cachedPrice) {
      console.log('[GoldPrice] Metals-API returned 304 Not Modified, using cached data');
      return { 
        data: cachedPrice.data, 
        etag: currentEtag, 
        notModified: true 
      };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Metals-API returned status ${response.status}: ${errorText}`);
    }
    
    const newEtag = response.headers.get('ETag') || undefined;
    const data = await response.json();
    
    if (data.success && data.rates?.XAU) {
      const pricePerOunce = 1 / data.rates.XAU;
      const pricePerGram = pricePerOunce / 31.1035;
      
      console.log(`[GoldPrice] Metals-API: XAU rate=${data.rates.XAU}, calculated $${pricePerOunce.toFixed(2)}/oz`);
      
      return {
        data: {
          pricePerGram,
          pricePerOunce,
          currency: 'USD',
          timestamp: new Date(data.timestamp * 1000 || Date.now()),
          source: 'metals-api.com'
        },
        etag: newEtag
      };
    }
    
    // Check for USDXAU which is the USD price directly (when base=USD)
    if (data.success && data.rates?.USDXAU) {
      const pricePerOunce = data.rates.USDXAU;
      const pricePerGram = pricePerOunce / 31.1035;
      
      console.log(`[GoldPrice] Metals-API: USDXAU=${pricePerOunce}, $${pricePerGram.toFixed(2)}/gram`);
      
      return {
        data: {
          pricePerGram,
          pricePerOunce,
          currency: 'USD',
          timestamp: new Date(data.timestamp * 1000 || Date.now()),
          source: 'metals-api.com'
        },
        etag: newEtag
      };
    }
    
    if (data.error) {
      throw new Error(data.error.info || data.error.type || JSON.stringify(data.error));
    }
    
    throw new Error('Invalid response from Metals-API: ' + JSON.stringify(data));
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromGoldApiCom(): Promise<GoldPriceData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(
      `https://api.gold-api.com/price/XAU`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
  
    if (!response.ok) {
      throw new Error(`gold-api.com returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.price) {
      const pricePerOunce = data.price;
      const pricePerGram = pricePerOunce / 31.1035;
      
      console.log(`[GoldPrice] gold-api.com: $${pricePerOunce.toFixed(2)}/oz, $${pricePerGram.toFixed(2)}/gram`);
      
      return {
        pricePerGram,
        pricePerOunce,
        currency: 'USD',
        timestamp: new Date(),
        source: 'gold-api.com'
      };
    }
    
    if (data.error) {
      throw new Error(data.error || 'Unknown gold-api.com error');
    }
    
    throw new Error('Invalid response from gold-api.com');
  } finally {
    clearTimeout(timeout);
  }
}

function applyMarkup(priceData: GoldPriceData, markupPercent: number): GoldPriceData {
  if (markupPercent <= 0) return priceData;
  
  const multiplier = 1 + (markupPercent / 100);
  return {
    ...priceData,
    pricePerGram: priceData.pricePerGram * multiplier,
    pricePerOunce: priceData.pricePerOunce * multiplier,
  };
}

export async function getGoldPrice(): Promise<GoldPriceData> {
  const config = await getGoldApiConfig();
  const baseCacheDuration = config.cacheDuration * 60 * 1000;
  cacheDurationMs = getSmartCacheDuration(baseCacheDuration);
  
  // Check for METALS_API_KEY environment variable first (primary source)
  const metalsApiKey = process.env.METALS_API_KEY;
  
  // Check in-memory cache first
  if (cachedPrice && cachedPrice.expiresAt > new Date()) {
    return cachedPrice.data;
  }
  
  try {
    let priceData: GoldPriceData;
    let newEtag: string | undefined;
    
    // Determine if Metals-API should be used
    // Priority: Environment variable (METALS_API_KEY) overrides admin settings
    // If no env var, respect admin settings (config.enabled + config.apiKey)
    const useMetalsApi = metalsApiKey || (config.enabled && config.apiKey);
    
    if (useMetalsApi) {
      // Try Metals-API.com with environment key first, then admin key
      const apiKey = metalsApiKey || config.apiKey!;
      const result = await fetchFromMetalsApi(apiKey, cachedPrice?.etag);
      priceData = result.data;
      newEtag = result.etag;
      
      // If not modified, extend cache without API call overhead
      if (result.notModified && cachedPrice) {
        cachedPrice.expiresAt = new Date(Date.now() + cacheDurationMs);
        return cachedPrice.data;
      }
    } else {
      // Metals-API disabled or no key, use free gold-api.com
      const reason = !config.enabled ? 'Metals-API disabled by admin' : 'No API key configured';
      console.log(`[GoldPrice] ${reason}, using free gold-api.com...`);
      priceData = await fetchFromGoldApiCom();
    }
    
    // Apply markup if configured
    priceData = applyMarkup(priceData, config.markupPercent);
    
    cachedPrice = {
      data: priceData,
      expiresAt: new Date(Date.now() + cacheDurationMs),
      etag: newEtag
    };
    
    // Save as last known price for future fallback
    lastKnownPrice = priceData;
    
    const markupInfo = config.markupPercent > 0 ? ` (with ${config.markupPercent}% markup)` : '';
    const cacheMinutes = Math.round(cacheDurationMs / 60000);
    console.log(`[GoldPrice] Fetched from ${priceData.source}${markupInfo}: $${priceData.pricePerGram.toFixed(2)}/gram, $${priceData.pricePerOunce.toFixed(2)}/oz (cached for ${cacheMinutes}min)`);
    
    return priceData;
  } catch (error) {
    console.error('[GoldPrice] Error fetching from primary API:', error);
    
    // Try gold-api.com as backup (free API) to conserve metals-api calls
    try {
      console.log('[GoldPrice] Trying gold-api.com as backup...');
      let priceData = await fetchFromGoldApiCom();
      priceData = applyMarkup(priceData, config.markupPercent);
      
      cachedPrice = {
        data: priceData,
        expiresAt: new Date(Date.now() + cacheDurationMs)
      };
      
      lastKnownPrice = priceData;
      
      const markupInfo = config.markupPercent > 0 ? ` (with ${config.markupPercent}% markup)` : '';
      console.log(`[GoldPrice] Fetched from ${priceData.source}${markupInfo}: $${priceData.pricePerGram.toFixed(2)}/gram, $${priceData.pricePerOunce.toFixed(2)}/oz`);
      
      return priceData;
    } catch (backupError) {
      console.error('[GoldPrice] Backup gold-api.com also failed:', backupError);
    }
    
    // Try to use last known price as fallback
    if (lastKnownPrice) {
      console.log('[GoldPrice] Using last known price as fallback');
      return {
        ...lastKnownPrice,
        source: 'fallback-last-known',
        timestamp: new Date()
      };
    }
    
    // Use default fallback price
    console.log('[GoldPrice] Using default fallback price');
    return {
      ...DEFAULT_FALLBACK_PRICE,
      timestamp: new Date()
    };
  }
}

export async function getGoldPricePerGram(): Promise<number> {
  const priceData = await getGoldPrice();
  return priceData.pricePerGram;
}

export function clearPriceCache(): void {
  cachedPrice = null;
}

export function getApiUsageStats(): {
  callsThisMonth: number;
  monthlyLimit: number;
  usagePercent: number;
  remainingCalls: number;
  lastCallTime: Date | null;
} {
  resetMonthlyCounterIfNeeded();
  return {
    callsThisMonth: apiUsageStats.callsThisMonth,
    monthlyLimit: COPPER_PACK_MONTHLY_LIMIT,
    usagePercent: (apiUsageStats.callsThisMonth / COPPER_PACK_MONTHLY_LIMIT) * 100,
    remainingCalls: COPPER_PACK_MONTHLY_LIMIT - apiUsageStats.callsThisMonth,
    lastCallTime: apiUsageStats.lastCallTime
  };
}

export async function getGoldPriceStatus(): Promise<{
  configured: boolean;
  enabled: boolean;
  hasApiKey: boolean;
  provider: string;
  cacheDuration: number;
  markupPercent: number;
  cachedUntil: Date | null;
  apiUsage: ReturnType<typeof getApiUsageStats>;
}> {
  const config = await getGoldApiConfig();
  return {
    configured: config.enabled && !!config.apiKey,
    enabled: config.enabled,
    hasApiKey: !!config.apiKey || !!process.env.METALS_API_KEY,
    provider: config.provider,
    cacheDuration: config.cacheDuration,
    markupPercent: isNaN(config.markupPercent) ? 0 : config.markupPercent,
    cachedUntil: cachedPrice?.expiresAt || null,
    apiUsage: getApiUsageStats()
  };
}
