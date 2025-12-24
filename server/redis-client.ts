import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.log('[Redis] No REDIS_URL configured, using in-memory fallback');
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        tls: process.env.REDIS_URL.includes('upstash.io') ? {} : undefined,
      });

      redisClient.on('connect', () => {
        console.log('[Redis] Connected to Upstash Redis');
      });

      redisClient.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
      });

      redisClient.on('close', () => {
        console.log('[Redis] Connection closed');
      });
    } catch (error) {
      console.error('[Redis] Failed to create client:', error);
      return null;
    }
  }

  return redisClient;
}

export async function connectRedis(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.connect();
    await client.ping();
    console.log('[Redis] Connection verified with PING');
    return true;
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Disconnected');
  }
}

const inMemoryCache = new Map<string, { value: string; expiry: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  
  if (client) {
    try {
      return await client.get(key);
    } catch (error) {
      console.error('[Redis] GET error, falling back to memory:', error);
    }
  }

  const cached = inMemoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }
  inMemoryCache.delete(key);
  return null;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
  const client = getRedisClient();
  
  if (client) {
    try {
      await client.setex(key, ttlSeconds, value);
      return;
    } catch (error) {
      console.error('[Redis] SET error, falling back to memory:', error);
    }
  }

  inMemoryCache.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedisClient();
  
  if (client) {
    try {
      await client.del(key);
    } catch (error) {
      console.error('[Redis] DEL error:', error);
    }
  }

  inMemoryCache.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  
  if (client) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      console.error('[Redis] DEL pattern error:', error);
    }
  }

  for (const key of inMemoryCache.keys()) {
    if (key.includes(pattern.replace('*', ''))) {
      inMemoryCache.delete(key);
    }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, { expiry }] of inMemoryCache.entries()) {
    if (expiry <= now) {
      inMemoryCache.delete(key);
    }
  }
}, 60000);
