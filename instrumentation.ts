/**
 * Next.js instrumentation hook — runs once per server process at boot.
 *
 * Clears every Brapi-related in-memory cache so a fresh deploy never
 * serves a stale entry that was populated during a previous run:
 *   - brapi:candles:*  — used by /api/asset/[symbol]/candles (range=…)
 *   - brapi:full:*     — used by /api/asset/[symbol] for quote+metrics
 *   - brapi:quote:*    — used by /api/assets/quote (batch quotes)
 *   - brapiIntraday*, brapiDaily*, brapiHourly* — also quote+OHLC caches
 *
 * A bug we hit in Aug 2026: after a deploy, the first /api/asset request
 * returned a partial quote (only 52w + marketCap) because Brapi rate-
 * limited the cold-start traffic and the partial response got cached
 * for the full TTL — UI then rendered "—" for price/volume/etc on every
 * ticker page until the entry expired (or the cache was purged). Wiping
 * these prefixes at boot guarantees the first post-deploy request hits
 * Brapi fresh.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const cache = await import("./lib/cache");
    const prefixes = [
      "brapi:candles:",
      "brapi:full:",
      "brapi-full-v2:",
      "brapi:quote:",
      "brapiIntraday",
      "brapiDaily",
      "brapiHourly",
    ];
    let total = 0;
    for (const p of prefixes) {
      total += cache.clearCache(p);
    }
    // eslint-disable-next-line no-console
    console.log(`[instrumentation] cleared ${total} stale brapi cache entries at boot`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[instrumentation] failed to clear cache:", err);
  }
}