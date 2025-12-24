import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isConnected = false;
let isReadOnly = false;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  
  let redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('[Redis] REDIS_URL not configured - Redis features disabled');
    return null;
  }
  
  // Strip quotes and variable assignment if accidentally included
  try {
    // First try to URL-decode the entire string in case it was encoded
    redisUrl = decodeURIComponent(redisUrl);
  } catch (e) {
    // If decoding fails, continue with original
  }
  
  // Handle cases where the value includes the variable name (e.g., REDIS_URL="...")
  if (redisUrl.includes('REDIS_URL=')) {
    redisUrl = redisUrl.replace(/^REDIS_URL=/, '');
  }
  
  redisUrl = redisUrl
    .replace(/^["']|["']$/g, '')  // Regular quotes
    .trim();
  
  console.log('[Redis] Connecting to:', redisUrl.replace(/:[^:@]+@/, ':***@'));
  
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false, // Disabled for Upstash (read-only tokens lack INFO permission)
      lazyConnect: true,
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
    
    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
      isConnected = true;
    });
    
    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      isConnected = false;
    });
    
    redisClient.on('close', () => {
      console.log('[Redis] Connection closed');
      isConnected = false;
    });
    
    return redisClient;
  } catch (error: any) {
    console.error('[Redis] Failed to create client:', error.message);
    return null;
  }
}

export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null;
}

export async function cache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  
  if (!redis) {
    return fetchFn();
  }
  
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    
    const data = await fetchFn();
    if (!isReadOnly) {
      try {
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
      } catch (setError: any) {
        if (setError.message?.includes('NOPERM')) {
          isReadOnly = true;
        }
      }
    }
    return data;
  } catch (error: any) {
    if (error.message?.includes('NOPERM')) {
      isReadOnly = true;
    } else {
      console.error('[Redis Cache] Error:', error.message);
    }
    return fetchFn();
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || isReadOnly) return;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Redis Cache] Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error: any) {
    if (error.message?.includes('NOPERM')) {
      isReadOnly = true;
    } else {
      console.error('[Redis Cache] Invalidation error:', error.message);
    }
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  const redis = getRedisClient();
  if (!redis || isReadOnly) return;
  
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error: any) {
    if (error.message?.includes('NOPERM')) {
      isReadOnly = true;
    } else {
      console.error('[Redis Cache] Set error:', error.message);
    }
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch (error: any) {
    console.error('[Redis Cache] Get error:', error.message);
    return null;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  
  if (!redis || isReadOnly) {
    return { allowed: true, remaining: maxRequests, resetTime: Date.now() + windowSeconds * 1000 };
  }
  
  try {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;
    
    const current = await redis.incr(windowKey);
    
    if (current === 1) {
      await redis.expire(windowKey, windowSeconds);
    }
    
    const ttl = await redis.ttl(windowKey);
    const resetTime = now + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000);
    const remaining = Math.max(0, maxRequests - current);
    const allowed = current <= maxRequests;
    
    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : ttl > 0 ? ttl : windowSeconds,
    };
  } catch (error: any) {
    if (error.message?.includes('NOPERM')) {
      console.warn('[Redis] Read-only connection detected, disabling write operations');
      isReadOnly = true;
    } else {
      console.error('[Redis RateLimit] Error:', error.message);
    }
    return { allowed: true, remaining: maxRequests, resetTime: Date.now() + windowSeconds * 1000 };
  }
}

export async function incrementCounter(key: string, ttlSeconds?: number): Promise<number> {
  const redis = getRedisClient();
  if (!redis || isReadOnly) return 0;
  
  try {
    const count = await redis.incr(key);
    if (ttlSeconds && count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return count;
  } catch (error: any) {
    if (error.message?.includes('NOPERM')) {
      isReadOnly = true;
    } else {
      console.error('[Redis Counter] Error:', error.message);
    }
    return 0;
  }
}

export async function acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || isReadOnly) return true;
  
  try {
    const lockKey = `lock:${key}`;
    const result = await redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error: any) {
    if (error.message?.includes('NOPERM')) {
      isReadOnly = true;
    } else {
      console.error('[Redis Lock] Error:', error.message);
    }
    return true;
  }
}

export async function releaseLock(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || isReadOnly) return;
  
  try {
    await redis.del(`lock:${key}`);
  } catch (error: any) {
    console.error('[Redis Lock] Release error:', error.message);
  }
}

export async function initializeRedis(): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.ping();
      console.log('[Redis] Ping successful - connection verified');
    } catch (error: any) {
      console.error('[Redis] Ping failed:', error.message);
    }
  }
}
