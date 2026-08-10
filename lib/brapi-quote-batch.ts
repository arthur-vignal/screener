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
};

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
      for (const { sym, b } of results) {
        if (!b) continue;
        const q = b.quote;
        const currency = q.currency || (isBrazilianTicker(sym) ? "BRL" : "USD");
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
        });
      }
    } catch (err) {
      console.error(`[brapi-quote-batch] chunk failed:`, err);
    }
  }

  // 2. Fallback for symbols Brapi didn't cover.
  const missing = symbols.filter((s) => !map.has(s.toUpperCase()));
  if (missing.length > 0) {
    try {
      const { getFundamentalsBatch } = await import("./fundamentals");
      const fundMap = await getFundamentalsBatch(missing);
      for (const sym of missing) {
        const f = fundMap.get(sym.toUpperCase());
        if (!f) continue;
        map.set(sym.toUpperCase(), {
          symbol: sym.toUpperCase(),
          price: f.price,
          prevClose: f.prevClose,
          change: f.change,
          changePercent: f.changePercent,
          currency: "USD",
          dayHigh: f.dayHigh,
          dayLow: f.dayLow,
          dayOpen: 0,
          volume: f.volume,
          fiftyTwoWeekHigh: f.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: f.fiftyTwoWeekLow,
          longName: null,
          sector: f.sector ?? null,
          marketCap: f.marketCap ?? null,
          type: "stock",
          earningsPerShare: null,
          priceEarnings: null,
        });
      }
    } catch (err) {
      console.error("[brapi-quote-batch] fallback failed:", err);
    }
  }

  return map;
}
