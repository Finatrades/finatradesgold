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

let cachedPrice: CachedPrice | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const FALLBACK_PRICE_PER_GRAM = 93.50; // Fallback price in USD

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
  // Return cached price if still valid
  if (cachedPrice && cachedPrice.expiresAt > new Date()) {
    return cachedPrice.data;
  }
  
  let priceData: GoldPriceData | null = null;
  
  // Try free APIs first (no key required)
  priceData = await fetchFromGoldPriceZ();
  
  // Try FreeGoldAPI as backup
  if (!priceData) {
    priceData = await fetchFromFreeGoldApi();
  }
  
  // Try Metals.dev if API key is available
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
    expiresAt: new Date(Date.now() + CACHE_DURATION_MS)
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
