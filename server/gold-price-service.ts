import { db } from "./db";
import { paymentGatewaySettings } from "@shared/schema";
import { getCache, setCache, isRedisConnected } from "./redis-client";

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
}

interface GoldApiConfig {
  enabled: boolean;
  apiKey: string | null;
  provider: string;
  cacheDuration: number;
  markupPercent: number;
}

let cachedPrice: CachedPrice | null = null;
let lastKnownPrice: GoldPriceData | null = null; // Keep last successful price as fallback
let cacheDurationMs = 5 * 60 * 1000; // 5 minutes default

const REDIS_GOLD_PRICE_KEY = 'gold:price:current';

// Default fallback price when no cached data available
const DEFAULT_FALLBACK_PRICE: GoldPriceData = {
  pricePerGram: 85.00,
  pricePerOunce: 2643.50,
  currency: 'USD',
  timestamp: new Date(),
  source: 'fallback-default'
};

async function getGoldApiConfig(): Promise<GoldApiConfig> {
  try {
    const settings = await db.select().from(paymentGatewaySettings).limit(1);
    if (settings[0]) {
      return {
        enabled: settings[0].metalsApiEnabled || false,
        apiKey: settings[0].metalsApiKey || null,
        provider: 'gold-api',
        cacheDuration: settings[0].metalsApiCacheDuration || 5,
        markupPercent: parseFloat(settings[0].goldPriceMarkupPercent || '0'),
      };
    }
  } catch (error) {
    console.error('[GoldPrice] Failed to get Gold API config:', error);
  }
  return { enabled: false, apiKey: null, provider: 'gold-api', cacheDuration: 5, markupPercent: 0 };
}

async function fetchFromMetalsApi(apiKey: string): Promise<GoldPriceData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(
      `https://metals-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=XAU`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Metals-API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[GoldPrice] Metals-API response:', JSON.stringify(data));
    
    if (data.success && data.rates?.XAU) {
      const pricePerOunce = 1 / data.rates.XAU;
      const pricePerGram = pricePerOunce / 31.1035;
      return {
        pricePerGram,
        pricePerOunce,
        currency: 'USD',
        timestamp: new Date(),
        source: 'metals-api.com'
      };
    }
    
    // Check for USDXAU which is the USD price directly (when base=USD)
    if (data.success && data.rates?.USDXAU) {
      const pricePerOunce = data.rates.USDXAU;
      const pricePerGram = pricePerOunce / 31.1035;
      return {
        pricePerGram,
        pricePerOunce,
        currency: 'USD',
        timestamp: new Date(),
        source: 'metals-api.com'
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
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
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
    console.log('[GoldPrice] gold-api.com response:', JSON.stringify(data));
    
    if (data.price) {
      const pricePerOunce = data.price;
      const pricePerGram = pricePerOunce / 31.1035;
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
  cacheDurationMs = config.cacheDuration * 60 * 1000;
  
  // Check for METALS_API_KEY environment variable first (primary source)
  const metalsApiKey = process.env.METALS_API_KEY;
  
  // If no API key available from either source, throw error
  if (!metalsApiKey && !config.apiKey) {
    throw new Error('Gold Price API key is not configured. Please add METALS_API_KEY secret or configure in admin panel.');
  }
  
  // Check in-memory cache first
  if (cachedPrice && cachedPrice.expiresAt > new Date()) {
    return cachedPrice.data;
  }
  
  // Check Redis cache (distributed cache for multi-instance)
  if (isRedisConnected()) {
    try {
      const redisPrice = await getCache<GoldPriceData>(REDIS_GOLD_PRICE_KEY);
      if (redisPrice) {
        console.log('[GoldPrice] Retrieved from Redis cache');
        cachedPrice = {
          data: redisPrice,
          expiresAt: new Date(Date.now() + cacheDurationMs)
        };
        return redisPrice;
      }
    } catch (err) {
      console.error('[GoldPrice] Redis cache read error:', err);
    }
  }
  
  try {
    let priceData: GoldPriceData;
    
    // Always use Metals-API.com with METALS_API_KEY secret as primary
    if (metalsApiKey) {
      priceData = await fetchFromMetalsApi(metalsApiKey);
    } else if (config.apiKey) {
      // Fallback to admin configured key
      priceData = await fetchFromMetalsApi(config.apiKey);
    } else {
      throw new Error('No API key available');
    }
    
    // Apply markup if configured
    priceData = applyMarkup(priceData, config.markupPercent);
    
    cachedPrice = {
      data: priceData,
      expiresAt: new Date(Date.now() + cacheDurationMs)
    };
    
    // Save to Redis cache (async, don't block)
    if (isRedisConnected()) {
      setCache(REDIS_GOLD_PRICE_KEY, priceData, Math.floor(cacheDurationMs / 1000)).catch(() => {});
    }
    
    // Save as last known price for future fallback
    lastKnownPrice = priceData;
    
    const markupInfo = config.markupPercent > 0 ? ` (with ${config.markupPercent}% markup)` : '';
    console.log(`[GoldPrice] Fetched from ${priceData.source}${markupInfo}: $${priceData.pricePerGram.toFixed(2)}/gram, $${priceData.pricePerOunce.toFixed(2)}/oz`);
    
    return priceData;
  } catch (error) {
    console.error('[GoldPrice] Error fetching gold price:', error);
    
    // Try gold-api.com as backup (free API)
    try {
      console.log('[GoldPrice] Trying gold-api.com as backup...');
      let priceData = await fetchFromGoldApiCom();
      priceData = applyMarkup(priceData, config.markupPercent);
      
      cachedPrice = {
        data: priceData,
        expiresAt: new Date(Date.now() + cacheDurationMs)
      };
      
      // Save to Redis cache (async, don't block)
      if (isRedisConnected()) {
        setCache(REDIS_GOLD_PRICE_KEY, priceData, Math.floor(cacheDurationMs / 1000)).catch(() => {});
      }
      
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

export async function getGoldPriceStatus(): Promise<{
  configured: boolean;
  enabled: boolean;
  hasApiKey: boolean;
  provider: string;
  cacheDuration: number;
  markupPercent: number;
  cachedUntil: Date | null;
}> {
  const config = await getGoldApiConfig();
  return {
    configured: config.enabled && !!config.apiKey,
    enabled: config.enabled,
    hasApiKey: !!config.apiKey,
    provider: config.provider,
    cacheDuration: config.cacheDuration,
    markupPercent: isNaN(config.markupPercent) ? 0 : config.markupPercent,
    cachedUntil: cachedPrice?.expiresAt || null
  };
}
