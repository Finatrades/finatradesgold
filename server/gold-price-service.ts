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
}

interface MetalsApiConfig {
  enabled: boolean;
  apiKey: string | null;
  cacheDuration: number;
}

let cachedPrice: CachedPrice | null = null;
let lastKnownPrice: GoldPriceData | null = null; // Keep last successful price as fallback
let cacheDurationMs = 5 * 60 * 1000; // 5 minutes default

// Default fallback price when no cached data available
const DEFAULT_FALLBACK_PRICE: GoldPriceData = {
  pricePerGram: 85.00,
  pricePerOunce: 2643.50,
  currency: 'USD',
  timestamp: new Date(),
  source: 'fallback-default'
};

async function getMetalsApiConfig(): Promise<MetalsApiConfig> {
  try {
    const settings = await db.select().from(paymentGatewaySettings).limit(1);
    if (settings[0]) {
      return {
        enabled: settings[0].metalsApiEnabled || false,
        apiKey: settings[0].metalsApiKey || null,
        cacheDuration: settings[0].metalsApiCacheDuration || 5,
      };
    }
  } catch (error) {
    console.error('[GoldPrice] Failed to get Metals API config:', error);
  }
  return { enabled: false, apiKey: null, cacheDuration: 5 };
}

async function fetchFromMetalsApi(apiKey: string): Promise<GoldPriceData> {
  const response = await fetch(
    `https://metals-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=XAU`
  );
  
  if (!response.ok) {
    throw new Error(`Metals-API returned status ${response.status}`);
  }
  
  const data = await response.json();
  
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
  
  if (data.error) {
    throw new Error(data.error.info || data.error.type || 'Unknown Metals-API error');
  }
  
  throw new Error('Invalid response from Metals-API');
}

export async function getGoldPrice(): Promise<GoldPriceData> {
  const config = await getMetalsApiConfig();
  cacheDurationMs = config.cacheDuration * 60 * 1000;
  
  if (!config.enabled) {
    throw new Error('Metals API is not enabled. Please enable it in admin panel under Payment Gateway > Gold API.');
  }
  
  if (!config.apiKey) {
    throw new Error('Metals API key is not configured. Please add your API key in admin panel under Payment Gateway > Gold API.');
  }
  
  if (cachedPrice && cachedPrice.expiresAt > new Date()) {
    return cachedPrice.data;
  }
  
  try {
    const priceData = await fetchFromMetalsApi(config.apiKey);
    
    cachedPrice = {
      data: priceData,
      expiresAt: new Date(Date.now() + cacheDurationMs)
    };
    
    // Save as last known price for future fallback
    lastKnownPrice = priceData;
    
    console.log(`[GoldPrice] Fetched from ${priceData.source}: $${priceData.pricePerGram.toFixed(2)}/gram, $${priceData.pricePerOunce.toFixed(2)}/oz`);
    
    return priceData;
  } catch (error) {
    console.error('[GoldPrice] Error fetching gold price:', error);
    
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
  cacheDuration: number;
  cachedUntil: Date | null;
}> {
  const config = await getMetalsApiConfig();
  return {
    configured: config.enabled && !!config.apiKey,
    enabled: config.enabled,
    hasApiKey: !!config.apiKey,
    cacheDuration: config.cacheDuration,
    cachedUntil: cachedPrice?.expiresAt || null
  };
}
