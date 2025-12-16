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
  provider: string;
  cacheDuration: number;
}

let cachedPrice: CachedPrice | null = null;
let cacheDurationMs = 5 * 60 * 1000; // 5 minutes default
const FALLBACK_PRICE_PER_GRAM = 93.50; // Fallback price in USD

async function getMetalsApiConfig(): Promise<MetalsApiConfig> {
  try {
    const settings = await db.select().from(paymentGatewaySettings).limit(1);
    if (settings[0]) {
      return {
        enabled: settings[0].metalsApiEnabled || false,
        apiKey: settings[0].metalsApiKey || null,
        provider: settings[0].metalsApiProvider || 'metals-api',
        cacheDuration: settings[0].metalsApiCacheDuration || 5,
      };
    }
  } catch (error) {
    console.error('[GoldPrice] Failed to get Metals API config:', error);
  }
  return { enabled: false, apiKey: null, provider: 'metals-api', cacheDuration: 5 };
}

async function fetchFromGoldPriceZ(): Promise<GoldPriceData | null> {
  try {
    const response = await fetch('https://goldpricez.com/api/rates/currency/usd/measure/gram');
    
    if (!response.ok) {
      console.error('[GoldPrice] GoldPriceZ API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.gold_rate) {
      const pricePerGram = parseFloat(data.gold_rate);
      return {
        pricePerGram,
        pricePerOunce: pricePerGram * 31.1035,
        currency: 'USD',
        timestamp: new Date(),
        source: 'goldpricez.com'
      };
    }
    
    return null;
  } catch (error) {
    console.error('[GoldPrice] GoldPriceZ fetch error:', error);
    return null;
  }
}

async function fetchFromFreeGoldApi(): Promise<GoldPriceData | null> {
  try {
    const response = await fetch('https://freegoldapi.com/api/XAU/USD');
    
    if (!response.ok) {
      console.error('[GoldPrice] FreeGoldAPI error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.price) {
      const pricePerOunce = parseFloat(data.price);
      const pricePerGram = pricePerOunce / 31.1035;
      return {
        pricePerGram,
        pricePerOunce,
        currency: 'USD',
        timestamp: new Date(),
        source: 'freegoldapi.com'
      };
    }
    
    return null;
  } catch (error) {
    console.error('[GoldPrice] FreeGoldAPI fetch error:', error);
    return null;
  }
}

async function fetchFromMetalsDev(apiKey: string): Promise<GoldPriceData | null> {
  try {
    const response = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=g`
    );
    
    if (!response.ok) {
      console.error('[GoldPrice] Metals.dev API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.metals?.gold) {
      const pricePerGram = data.metals.gold;
      return {
        pricePerGram,
        pricePerOunce: pricePerGram * 31.1035,
        currency: 'USD',
        timestamp: new Date(),
        source: 'metals.dev'
      };
    }
    
    return null;
  } catch (error) {
    console.error('[GoldPrice] Metals.dev fetch error:', error);
    return null;
  }
}

async function fetchFromMetalsApi(apiKey: string): Promise<GoldPriceData | null> {
  try {
    const response = await fetch(
      `https://metals-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=XAU`
    );
    
    if (!response.ok) {
      console.error('[GoldPrice] Metals-API error:', response.status);
      return null;
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
      console.error('[GoldPrice] Metals-API error:', data.error.info || data.error.type);
    }
    
    return null;
  } catch (error) {
    console.error('[GoldPrice] Metals-API fetch error:', error);
    return null;
  }
}

async function fetchFromGoldApi(apiKey: string): Promise<GoldPriceData | null> {
  try {
    const response = await fetch(
      `https://www.goldapi.io/api/XAU/USD`,
      {
        headers: {
          'x-access-token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error('[GoldPrice] GoldAPI error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.price) {
      const pricePerOunce = data.price;
      const pricePerGram = pricePerOunce / 31.1035;
      return {
        pricePerGram,
        pricePerOunce,
        currency: 'USD',
        timestamp: new Date(),
        source: 'goldapi.io'
      };
    }
    
    return null;
  } catch (error) {
    console.error('[GoldPrice] GoldAPI fetch error:', error);
    return null;
  }
}

function getFallbackPrice(): GoldPriceData {
  return {
    pricePerGram: FALLBACK_PRICE_PER_GRAM,
    pricePerOunce: FALLBACK_PRICE_PER_GRAM * 31.1035,
    currency: 'USD',
    timestamp: new Date(),
    source: 'fallback'
  };
}

export async function getGoldPrice(): Promise<GoldPriceData> {
  // Get config from database
  const config = await getMetalsApiConfig();
  cacheDurationMs = config.cacheDuration * 60 * 1000;
  
  // Return cached price if still valid
  if (cachedPrice && cachedPrice.expiresAt > new Date()) {
    return cachedPrice.data;
  }
  
  let priceData: GoldPriceData | null = null;
  
  // If Metals API is enabled with a key, use it as primary source
  if (config.enabled && config.apiKey) {
    if (config.provider === 'metals-api') {
      priceData = await fetchFromMetalsApi(config.apiKey);
    } else if (config.provider === 'metals-dev') {
      priceData = await fetchFromMetalsDev(config.apiKey);
    } else if (config.provider === 'goldapi') {
      priceData = await fetchFromGoldApi(config.apiKey);
    }
  }
  
  // Try free APIs as fallback
  if (!priceData) {
    priceData = await fetchFromGoldPriceZ();
  }
  
  // Try FreeGoldAPI as backup
  if (!priceData) {
    priceData = await fetchFromFreeGoldApi();
  }
  
  // Try Metals.dev if env API key is available
  if (!priceData) {
    const metalsDevKey = process.env.METALS_DEV_API_KEY;
    if (metalsDevKey) {
      priceData = await fetchFromMetalsDev(metalsDevKey);
    }
  }
  
  // Use fallback if all APIs fail
  if (!priceData) {
    console.log('[GoldPrice] Using fallback price - all APIs unavailable');
    priceData = getFallbackPrice();
  }
  
  // Cache the result
  cachedPrice = {
    data: priceData,
    expiresAt: new Date(Date.now() + cacheDurationMs)
  };
  
  console.log(`[GoldPrice] Fetched from ${priceData.source}: $${priceData.pricePerGram.toFixed(2)}/gram`);
  
  return priceData;
}

export async function getGoldPricePerGram(): Promise<number> {
  const priceData = await getGoldPrice();
  return priceData.pricePerGram;
}

export function clearPriceCache(): void {
  cachedPrice = null;
}

interface AllPricesResult {
  prices: GoldPriceData[];
  fetchedAt: Date;
  config: {
    metalsApiEnabled: boolean;
    provider: string;
  };
}

export async function getAllGoldPrices(): Promise<AllPricesResult> {
  const config = await getMetalsApiConfig();
  const prices: GoldPriceData[] = [];
  
  const fetchPromises: Promise<void>[] = [];
  
  fetchPromises.push(
    fetchFromGoldPriceZ().then(p => { if (p) prices.push(p); })
  );
  
  fetchPromises.push(
    fetchFromFreeGoldApi().then(p => { if (p) prices.push(p); })
  );
  
  if (config.enabled && config.apiKey) {
    if (config.provider === 'metals-api') {
      fetchPromises.push(
        fetchFromMetalsApi(config.apiKey).then(p => { if (p) prices.push(p); })
      );
    } else if (config.provider === 'metals-dev') {
      fetchPromises.push(
        fetchFromMetalsDev(config.apiKey).then(p => { if (p) prices.push(p); })
      );
    } else if (config.provider === 'goldapi') {
      fetchPromises.push(
        fetchFromGoldApi(config.apiKey).then(p => { if (p) prices.push(p); })
      );
    }
  }
  
  const metalsDevKey = process.env.METALS_DEV_API_KEY;
  if (metalsDevKey && config.provider !== 'metals-dev') {
    fetchPromises.push(
      fetchFromMetalsDev(metalsDevKey).then(p => { if (p) prices.push(p); })
    );
  }
  
  await Promise.allSettled(fetchPromises);
  
  return {
    prices,
    fetchedAt: new Date(),
    config: {
      metalsApiEnabled: config.enabled,
      provider: config.provider,
    }
  };
}
