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
        pricePerOunce: pricePerGram * 31.1035, // Convert to troy ounce
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

async function fetchFromGoldApi(): Promise<GoldPriceData | null> {
  try {
    // Gold-API.com free endpoint (no key required for basic access)
    const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: {
        'x-access-token': process.env.GOLD_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      console.error('[GoldPrice] Gold-API error:', response.status);
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
    console.error('[GoldPrice] Gold-API fetch error:', error);
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
  
  // Try Metals.dev first if API key is available
  const metalsDevKey = process.env.METALS_DEV_API_KEY;
  if (metalsDevKey) {
    priceData = await fetchFromMetalsDev(metalsDevKey);
  }
  
  // Try Gold-API as backup
  if (!priceData && process.env.GOLD_API_KEY) {
    priceData = await fetchFromGoldApi();
  }
  
  // Use fallback if all APIs fail
  if (!priceData) {
    console.log('[GoldPrice] Using fallback price - no API key configured or API unavailable');
    priceData = getFallbackPrice();
  }
  
  // Cache the result
  cachedPrice = {
    data: priceData,
    expiresAt: new Date(Date.now() + CACHE_DURATION_MS)
  };
  
  return priceData;
}

export async function getGoldPricePerGram(): Promise<number> {
  const priceData = await getGoldPrice();
  return priceData.pricePerGram;
}

export function clearPriceCache(): void {
  cachedPrice = null;
}
