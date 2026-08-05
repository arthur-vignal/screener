/**
 * Combined fundamentals: Yahoo chart (price, 52w, volume) + SEC EDGAR (ratios).
 *
 * This replaces the old getYahooSummary() which used /quoteSummary (requires crumb).
 *
 * Returns:
 *  - symbol, name, exchange, sector
 *  - price, prevClose, change, changePercent
 *  - dayHigh, dayLow, volume, marketCap
 *  - fiftyTwoWeekHigh, fiftyTwoWeekLow
 *  - Fundamentals (from SEC): P/E, P/VP, P/S, ROE, ROIC, margins, EPS, BV
 *
 * Cache: 6h for prices, 24h for SEC filings.
 */

import { cached } from "./cache";
import { getSecFundamentals, type Fundamentals } from "./sec-edgar";
import { getCompanyName, getCompanySector } from "./asset-names";

export type CombinedFundamentals = {
  symbol: string;
  name: string | null;
  sector: string | null;
  exchange: string | null;
  // Price
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketCap: number | null;
  // 52w
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  // SEC ratios
  pe: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  roic: number | null;
  netMargin: number | null;
  operatingMargin: number | null;
  eps: number | null;
  bookValuePerShare: number | null;
  // Metadata
  asOf: string | null;
  cik: number | null;
};

type SparkMeta = {
  currency: string;
  symbol: string;
  exchangeName: string;
  fullExchangeName: string;
  regularMarketPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  longName?: string;
  shortName?: string;
  chartPreviousClose: number;
};

async function fetchYahooSpark(symbol: string): Promise<SparkMeta | null> {
  return cached(`yahoo:spark:${symbol}`, 60, async () => {
    const hosts = ["query1", "query2", "query3"];
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    };
    let lastErr: Error | null = null;
    for (const host of hosts) {
      try {
        const r = await fetch(
          `https://${host}.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&range=1d&interval=1d`,
          { headers, signal: AbortSignal.timeout(8000) },
        );
        if (!r.ok) { lastErr = new Error(`yahoo ${host} ${r.status}`); continue; }
        const data = (await r.json()) as {
          spark?: { result?: Array<{ symbol: string; response?: Array<{ meta: SparkMeta }> }> };
        };
        const meta = data.spark?.result?.[0]?.response?.[0]?.meta ?? null;
        if (meta) return meta;
      } catch (e) {
        lastErr = e as Error;
      }
    }
    return null;
  });
}

async function buildFundamentals(symbol: string): Promise<CombinedFundamentals | null> {
  const upper = symbol.toUpperCase();
  const [meta, sec] = await Promise.all([
    fetchYahooSpark(upper),
    getSecFundamentals(upper).catch(() => null),
  ]);
  if (!meta) return null;

  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose;
  const change = price - prevClose;
  const changePercent = prevClose === 0 ? 0 : (change / prevClose) * 100;
  const marketCap = sec?.shares ? sec.shares * price : null;

  const pe = sec?.eps && sec.eps > 0 ? price / sec.eps : null;
  const pb = sec?.bookValuePerShare && sec.bookValuePerShare > 0
    ? price / sec.bookValuePerShare : null;
  const ps =
    sec?.ttmRevenue && sec?.shares && sec.ttmRevenue > 0
      ? (marketCap ?? 0) / sec.ttmRevenue
      : null;

  return {
    symbol: upper,
    name: meta.longName ?? meta.shortName ?? getCompanyName(upper) ?? null,
    sector: getCompanySector(upper) ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
    price,
    prevClose,
    change,
    changePercent,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    marketCap,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    pe,
    pb,
    ps,
    roe: sec?.roe ?? null,
    roic: sec?.roe ?? null, // approximation (would need debt for true ROIC)
    netMargin: sec?.netMargin ?? null,
    operatingMargin: sec?.operatingMargin ?? null,
    eps: sec?.eps ?? null,
    bookValuePerShare: sec?.bookValuePerShare ?? null,
    asOf: sec?.asOf ?? null,
    cik: sec?.cik ?? null,
  };
}

/**
 * Get combined fundamentals for a ticker.
 * Returns null only if we can't even get the price.
 */
export async function getFundamentals(symbol: string): Promise<CombinedFundamentals | null> {
  const upper = symbol.toUpperCase();
  return cached(`combined:${upper}`, 6 * 3600, () => buildFundamentals(upper));
}

/**
 * Batch version: fetch fundamentals for many symbols.
 * Uses Promise.all + deduped cache.
 */
export async function getFundamentalsBatch(
  symbols: string[],
): Promise<Map<string, CombinedFundamentals>> {
  const map = new Map<string, CombinedFundamentals>();
  await Promise.all(
    symbols.map(async (sym) => {
      const f = await getFundamentals(sym);
      if (f) map.set(sym.toUpperCase(), f);
    }),
  );
  return map;
}

export type { Fundamentals };
