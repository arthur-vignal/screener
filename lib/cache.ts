/**
 * Simple in-memory cache with TTL.
 * Per-process; lost on cold start.
 * For shared/persistent cache across instances, use a real database.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memStore = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const memEntry = memStore.get(key) as CacheEntry<T> | undefined;
  if (memEntry && memEntry.expiresAt > now) {
    return memEntry.value;
  }

  const value = await fetcher();

  memStore.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
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

export async function invalidate(key: string): Promise<void> {
  memStore.delete(key);
}
