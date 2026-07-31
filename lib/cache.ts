/**
 * Simple in-memory cache with TTL.
 * Works in serverless contexts (per-instance, not global),
 * but good enough for our use case (most data doesn't need to persist
 * across cold starts because clients hit APIs directly).
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await fetcher();
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

export function clearCache(pattern?: string): number {
  let count = 0;
  for (const key of store.keys()) {
    if (!pattern || key.includes(pattern)) {
      store.delete(key);
      count++;
    }
  }
  return count;
}
