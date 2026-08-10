/**
 * Brapi batch quote — fetches real-time price + volume + marketCap for BR tickers.
 *
 * Used by /api/assets/quote when the symbol is a Brazilian ticker (B3).
 * Falls back gracefully (returns null) on individual symbol failures.
 *
 * Brapi returns more reliable data than Yahoo/Finnhub for BR stocks
 * (BDRs in particular) — see lib/brapi-full.ts for the full shape.
 */

import { getBrapiFull } from "./brapi-full";

type BrapiQuoteRow = {
  symbol: string;
  longName: string | null;
  sector: string | null;
  type: "stock" | "etf" | "crypto" | null;
  quote: {
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
  } | null;
  metrics: {
    marketCap: number | null;
    pe: number | null;
    pb: number | null;
    roe: number | null;
  } | null;
};

/**
 * Fetch batch quote for BR tickers via Brapi. Returns up to `rowsPerCall` per
 * request (Brapi max); for larger lists we chunk.
 */
export async function getBrapiQuoteBatch(symbols: string[]): Promise<Map<string, BrapiQuoteRow>> {
  const map = new Map<string, BrapiQuoteRow>();
  if (symbols.length === 0) return map;
  const CHUNK = 30; // Brapi default limit per call
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK);
    try {
      // Use the existing getBrapiFull singleton pattern (one ticker at a time).
      // The other endpoint (api.brapi.dev/quote/{ticker1,ticker2,...}) supports batch
      // but we already have a per-ticker singleton + 30min cache in lib/brapi-full.
      // Promise.all keeps the total latency bounded.
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
        map.set(sym.toUpperCase(), {
          symbol: sym.toUpperCase(),
          longName: q.longName ?? q.shortName ?? null,
          sector: b.profile?.sector ?? b.profile?.industry ?? null,
          type: "stock",
          quote: {
            symbol: sym.toUpperCase(),
            price: q.regularMarketPrice ?? null,
            prevClose: q.regularMarketPreviousClose ?? null,
            change: q.regularMarketChange ?? null,
            changePercent: q.regularMarketChangePercent ?? null,
            currency: q.currency || "BRL",
            dayHigh: q.regularMarketDayHigh ?? null,
            dayLow: q.regularMarketDayLow ?? null,
            dayOpen: q.regularMarketOpen ?? null,
            volume: q.regularMarketVolume ?? null,
            fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
            fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
          },
          metrics: {
            marketCap: q.marketCap ?? b.keyStatistics?.marketCap ?? null,
            pe: q.priceEarnings ?? null,
            pb: b.keyStatistics?.priceToBook ?? null,
            roe: b.financialData?.returnOnEquity ?? null,
          },
        });
      }
    } catch (err) {
      console.error(`[brapi-quote-batch] chunk failed:`, err);
    }
  }
  return map;
}
