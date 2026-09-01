/**
 * brapi-quote-batch.ts — single source of truth for quotes.
 *
 * Uses Brapi Pro for both US and BR tickers. Yahoo/Finnhub remain as a
 * fallback when Brapi has no data for a given symbol (rare for SP500, but
 * happens for some small-cap US stocks).
 *
 * Cache: 1 minute (Brapi real-time) — fresh enough for a screener, light
 * enough for the free tier.
 */

import { getBrapiFull } from "./brapi-full";
import { isBrazilianTicker } from "./brapi";

export type QuoteBatch = {
  symbol: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  dayHigh: number | null;
  dayLow: number | null;
  dayOpen: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  longName: string | null;
  sector: string | null;
  marketCap: number | null;
  type: "stock" | "etf" | "bdr" | "fii" | "fractional" | null;
  // Fundamentals returned by Brapi /quote for free with fundamental=true
  earningsPerShare: number | null;
  priceEarnings: number | null;
  // 7d / 30d percent change vs current price, computed from brapi
  // /quote candles (range=1mo, interval=1d). Null when history unavailable.
  changePercent7d: number | null;
  changePercent30d: number | null;
};

/**
 * Fetch the 1mo daily candle series from Brapi for one ticker and compute
 * 7d / 30d % change vs the latest close. Returns null when history is empty
 * or the upstream fails.
 *
 * Cached for 1h (1mo series doesn't change intra-day for retail purposes).
 */
async function getBrapiCandlesChange(
  symbol: string,
  currentPrice: number | null,
): Promise<{ changePercent7d: number | null; changePercent30d: number | null }> {
  const { getBrapiCandles } = await import("./brapi");
  const candles = await getBrapiCandles(symbol, "1mo", "1d");
  if (!candles || candles.length === 0) {
    return { changePercent7d: null, changePercent30d: null };
  }
  // Filter out candles with null/0 close (brapi sometimes has gaps).
  const valid = candles
    .filter((c) => c.close != null && c.close > 0)
    // Brapi returns candles in DESC order (newest first). Compute
    // requires ASC — `target7 = lastDate - 7d` only finds the correct
    // candle when `lastDate` is the newest. Without sort, both
    // `close7` and `close30` collapse to the same point (the oldest
    // candle) and pct becomes 0.
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp);
  if (valid.length === 0) {
    return { changePercent7d: null, changePercent30d: null };
  }

  const priceBase = currentPrice ?? valid[valid.length - 1].close;
  if (!priceBase || priceBase <= 0) {
    return { changePercent7d: null, changePercent30d: null };
  }

  // Pick the candle closest to 7 calendar days ago and 30 calendar days ago
  // (Brapi candles are sorted ascending by date).
  const lastDate = new Date(valid[valid.length - 1].timestamp);
  const target7 = lastDate.getTime() - 7 * 24 * 60 * 60 * 1000;
  const target30 = lastDate.getTime() - 30 * 24 * 60 * 60 * 1000;

  function pickClosest(targetMs: number): number | null {
    let best: number | null = null;
    let bestDelta = Infinity;
    for (const c of valid) {
      const delta = Math.abs(c.timestamp - targetMs);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = c.close;
      }
    }
    return best;
  }

  const close7 = pickClosest(target7);
  const close30 = pickClosest(target30);

  const pct = (base: number, ref: number | null) =>
    ref == null || ref <= 0 ? null : ((base - ref) / ref) * 100;

  return {
    changePercent7d: pct(priceBase, close7),
    changePercent30d: pct(priceBase, close30),
  };
}


const CHUNK = 30;

/**
 * Batch-fetch quotes for any mix of US + BR tickers. Always tries Brapi
 * first (single source of truth). Falls back to Yahoo for symbols Brapi
 * doesn't cover (rare).
 */
export async function getBrapiQuoteBatch(symbols: string[]): Promise<Map<string, QuoteBatch>> {
  const map = new Map<string, QuoteBatch>();
  if (symbols.length === 0) return map;

  // 1. Brapi (covers ~99% of our universe: US SP500 + B3 IBOV/full B3).
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK);
    try {
      const results = await Promise.all(
        chunk.map((sym) =>
          getBrapiFull(sym)
            .then((b) => ({ sym, b }))
            .catch(() => ({ sym, b: null as Awaited<ReturnType<typeof getBrapiFull>> | null })),
        ),
      );
      // Fetch 1mo candles in parallel for each symbol so we can compute 7d/30d %.
      const candleResults = await Promise.all(
        chunk.map((sym) =>
          getBrapiCandlesChange(sym, null)
            .then((c) => ({ sym, c }))
            .catch(() => ({ sym, c: { changePercent7d: null, changePercent30d: null } })),
        ),
      );
      const candleMap = new Map(
        candleResults.map((r) => [r.sym.toUpperCase(), r.c]),
      );

      for (const { sym, b } of results) {
        if (!b) continue;
        const q = b.quote;
        const currency = q.currency || (isBrazilianTicker(sym) ? "BRL" : "USD");
        const candles = candleMap.get(sym.toUpperCase()) ?? {
          changePercent7d: null,
          changePercent30d: null,
        };
        map.set(sym.toUpperCase(), {
          symbol: sym.toUpperCase(),
          price: q.regularMarketPrice ?? null,
          prevClose: q.regularMarketPreviousClose ?? null,
          change: q.regularMarketChange ?? null,
          changePercent: q.regularMarketChangePercent ?? null,
          currency,
          dayHigh: q.regularMarketDayHigh ?? null,
          dayLow: q.regularMarketDayLow ?? null,
          dayOpen: q.regularMarketOpen ?? null,
          volume: q.regularMarketVolume ?? null,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
          longName: q.longName ?? q.shortName ?? null,
          sector: b.profile?.sector ?? b.profile?.industry ?? null,
          marketCap: q.marketCap ?? b.keyStatistics?.marketCap ?? null,
          type: isBrazilianTicker(sym) ? "stock" : "stock",
          earningsPerShare: q.earningsPerShare ?? null,
          priceEarnings: q.priceEarnings ?? null,
          changePercent7d: candles.changePercent7d,
          changePercent30d: candles.changePercent30d,
        });
      }
    } catch (err) {
      console.error(`[brapi-quote-batch] chunk failed:`, err);
    }
  }

  return map;
}
