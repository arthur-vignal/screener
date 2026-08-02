/**
 * Cache with TTL.
 *
 * Two-tier strategy:
 *  1. In-memory (per-process) — fast, no network, lost on cold start
 *  2. Upstash Redis (if env vars set) — persistent across cold starts, shared across instances
 *
 * Falls back to in-memory only if Redis env vars are not configured.
 * This means local dev works without Redis, and prod uses Redis automatically.
 */

import { Redis } from "@upstash/redis";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memStore = new Map<string, CacheEntry<unknown>>();

// Upstash Redis client (lazy init)
let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (redisClient !== null) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

const KEY_PREFIX = "screener:cache:";

function namespaced(key: string): string {
  return KEY_PREFIX + key;
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const nsKey = namespaced(key);

  // Try Redis first if available
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<T>(nsKey);
      if (cached != null) return cached;
    } catch {
      // Redis failed, fall through to in-memory
    }
  }

  // Try in-memory
  const memEntry = memStore.get(key) as CacheEntry<T> | undefined;
  if (memEntry && memEntry.expiresAt > now) {
    return memEntry.value;
  }

  // Fetch fresh
  const value = await fetcher();

  // Store in-memory
  memStore.set(key, { value, expiresAt: now + ttlSeconds * 1000 });

  // Store in Redis (best effort, non-blocking for caller)
  if (redis) {
    redis
      .set(nsKey, value as unknown as object, { ex: ttlSeconds })
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
 * Invalidate a specific key from both layers.
 * Useful when underlying data changes.
 */
export async function invalidate(key: string): Promise<void> {
  memStore.delete(key);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(namespaced(key));
    } catch {}
  }
}
