/**
 * Simple in-memory cache with TTL.
 *
 * Two-tier strategy (Upstash Redis reserved for when env vars are set):
 *  1. In-memory (per-process) — fast, no network, lost on cold start
 *  2. Upstash Redis (if env vars set) — persistent across cold starts, shared across instances
 *
 * Falls back to in-memory only if Redis env vars are not configured.
 *
 * IMPORTANT: When using Upstash, callers MUST pass JSON-serializable values
 * (no Date, no class instances). The fetcher return value gets .stringify'd.
 */

import { Redis } from "@upstash/redis";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memStore = new Map<string, CacheEntry<unknown>>();

// Upstash Redis client (lazy init, only when env vars present)
let redisClient: Redis | null = null;
let redisDisabled = false; // Mark after init failure to avoid retry spam

function getRedis(): Redis | null {
  if (redisClient !== null) return redisClient;
  if (redisDisabled) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisDisabled = true;
    return null;
  }
  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    redisDisabled = true;
    return null;
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();

  // Try in-memory first (faster)
  const memEntry = memStore.get(key) as CacheEntry<T> | undefined;
  if (memEntry && memEntry.expiresAt > now) {
    return memEntry.value;
  }

  // Try Redis (only if configured)
  const redis = getRedis();
  if (redis) {
    try {
      // Upstash .get returns the parsed object directly when JSON-serializable
      const cached = await redis.get(key);
      if (cached != null) {
        // Store in mem for next request
        memStore.set(key, { value: cached as T, expiresAt: now + ttlSeconds * 1000 });
        return cached as T;
      }
    } catch {
      // Redis failed, fall through
    }
  }

  // Fetch fresh
  const value = await fetcher();

  // Store in-memory
  memStore.set(key, { value, expiresAt: now + ttlSeconds * 1000 });

  // Store in Redis (best effort, async, non-blocking)
  if (redis) {
    redis
      .set(key, value as unknown as object, { ex: ttlSeconds })
      .catch(() => {
        // Silent failure — Redis is best-effort
      });
  }

  return value;
}

export function clearCache(pattern?: string): number {
  let count = 0;
  for (const key of memStore.keys()) {
    if (!pattern || key.includes(pattern)) {
      memStore.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Invalidate a specific key from in-memory.
 * (Redis invalidation is best-effort and async.)
 */
export async function invalidate(key: string): Promise<void> {
  memStore.delete(key);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch {}
  }
}
