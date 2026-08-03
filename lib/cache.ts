/**
 * Simple in-memory cache with TTL.
 * Per-process; lost on cold start.
 *
 * Negative caching: errors/empty results are NOT cached, so transient failures
 * retry on the next request instead of propagating.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memStore = new Map<string, CacheEntry<unknown>>();

const EMPTY_MARKER = Symbol("empty");

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

  // Don't cache if value is "empty" (null/undefined/empty array/object)
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "object" &&
      !(value instanceof Date) &&
      Object.keys(value as object).length === 0);

  if (isEmpty) {
    return value;
  }

  // Don't cache empty maps where all values are null (Yahoo rate limit case)
  if (value instanceof Map) {
    const allNull = Array.from(value.values()).every((v) => v === null);
    if (allNull && value.size > 0) {
      return value;
    }
  }

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