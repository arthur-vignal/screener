/**
 * Next.js instrumentation hook — runs once per server process at boot.
 *
 * Clears the in-memory candle cache so a fresh deploy never serves stale
 * historical data (which caused 7d/30d columns to be blank in prod after
 * a deploy while brapi was warming up). Also unblocks the 1h fundamental
 * cache in case a previous token left incomplete entries.
 */

export async function register() {
  // Only run on the Node.js runtime (server), not Edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const cache = await import("./lib/cache");
      const removed = cache.clearCache("brapi:candles:");
      // eslint-disable-next-line no-console
      console.log(`[instrumentation] cleared ${removed} stale candle cache entries at boot`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[instrumentation] failed to clear cache:", err);
    }
  }
}