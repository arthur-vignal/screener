/**
 * Brapi.dev API client — B3 (Brazilian stock exchange) coverage.
 * Free tier: 15 req/min, no card. Used as primary source for tickers ending in
 * `.SA` (Brazilian stocks). Token via env BRAPI_API_TOKEN.
 *
 * Docs: https://brapi.dev/docs
 * Endpoints used:
 *   GET /api/quote/{ticker1,ticker2,...}                — quote + summary
 *   GET /api/quote/{ticker}?range=1mo&interval=1d       — OHLC candles
 */

import { cached } from "./cache";

export type BrapiCandle = {
  date: string;        // ISO date YYYY-MM-DD
  timestamp: number;   // unix seconds from brapi
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

export type BrapiQuote = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  prevClose: number;
  volume: number;
  marketCap: number | null;
  trailingPE: number | null;
  earningsPerShare: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  logoUrl: string | null;
  marketTime: string | null; // ISO timestamp from brapi
};

type BrapiRawQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string;
  marketCap?: number;
  regularMarketVolume?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  priceEarnings?: number;
  earningsPerShare?: number;
  logourl?: string;
  historicalDataPrice?: Array<{
    date: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustedClose: number;
  }>;
};

type BrapiResponse = {
  results?: BrapiRawQuote[];
  error?: boolean;
  message?: string;
};

function getToken(): string {
  return process.env.BRAPI_API_TOKEN ?? "";
}

function normalize(raw: BrapiRawQuote): BrapiQuote {
  const price = raw.regularMarketPrice ?? 0;
  const prev = raw.regularMarketPreviousClose ?? price;
  return {
    symbol: raw.symbol,
    shortName: raw.shortName ?? null,
    longName: raw.longName ?? null,
    currency: raw.currency ?? "BRL",
    price,
    change: raw.regularMarketChange ?? price - prev,
    changePercent:
      raw.regularMarketChangePercent ??
      (prev === 0 ? 0 : ((price - prev) / prev) * 100),
    marketState: price ? "REGULAR" : "CLOSED",
    dayHigh: raw.regularMarketDayHigh ?? 0,
    dayLow: raw.regularMarketDayLow ?? 0,
    dayOpen: raw.regularMarketOpen ?? 0,
    prevClose: prev,
    volume: raw.regularMarketVolume ?? 0,
    marketCap: raw.marketCap ?? null,
    trailingPE: raw.priceEarnings ?? null,
    earningsPerShare: raw.earningsPerShare ?? null,
    fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: raw.fiftyTwoWeekLow ?? null,
    logoUrl: raw.logourl ?? null,
    marketTime: raw.regularMarketTime ?? null,
  };
}

async function fetchBrapi(path: string, params: Record<string, string>): Promise<Response> {
  const token = getToken();
  const qs = new URLSearchParams({ ...params, token }).toString();
  const r = await fetch(`https://brapi.dev${path}?${qs}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  return r;
}

/**
 * Single quote (candles included if you want — pass range/interval).
 * Returns null when not found.
 */
export async function getBrapiQuote(
  ticker: string,
  opts: { range?: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"; interval?: "1d" | "1wk" | "1mo" } = {},
): Promise<{ quote: BrapiQuote; candles: BrapiCandle[] } | null> {
  return cached(`brapi:quote:${ticker}:${opts.range ?? "none"}:${opts.interval ?? "none"}`, 60, async () => {
    const params: Record<string, string> = {};
    if (opts.range && opts.interval) {
      params.range = opts.range;
      params.interval = opts.interval;
    }
    const r = await fetchBrapi(`/api/quote/${encodeURIComponent(ticker)}`, params);
    if (!r.ok) return null;
    const data = (await r.json()) as BrapiResponse;
    const raw = data.results?.[0];
    if (!raw) return null;
    const candles = (raw.historicalDataPrice ?? []).map((c) => ({
      date: new Date(c.date * 1000).toISOString().slice(0, 10),
      timestamp: c.date * 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      adjClose: c.adjustedClose,
      volume: c.volume,
    }));
    return { quote: normalize(raw), candles };
  });
}

/**
 * Batch quote (no candles — uses the multi-ticker endpoint).
 * Returns Map<symbol, BrapiQuote>. Missing symbols are absent from the map.
 */
export async function getBrapiQuotes(
  symbols: string[],
): Promise<Map<string, BrapiQuote>> {
  const result = new Map<string, BrapiQuote>();
  if (symbols.length === 0) return result;
  const key = `brapi:quotes:${[...symbols].sort().join(",")}`;
  return cached(key, 60, async () => {
    // Brapi supports comma-separated tickers in one call.
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += 30) {
      batches.push(symbols.slice(i, i + 30));
    }
    const all = new Map<string, BrapiQuote>();
    for (const batch of batches) {
      try {
        const r = await fetchBrapi(`/api/quote/${batch.map(encodeURIComponent).join(",")}`, {});
        if (!r.ok) continue;
        const data = (await r.json()) as BrapiResponse;
        for (const raw of data.results ?? []) {
          all.set(raw.symbol, normalize(raw));
        }
      } catch {
        // ignore batch
      }
    }
    return all;
  });
}

/**
 * Convenience for the candle-only path (used by /api/chart).
 */
export async function getBrapiCandles(
  ticker: string,
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y",
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<BrapiCandle[]> {
  return cached(`brapi:candles:${ticker}:${range}:${interval}`, 1800, async () => {
    const r = await fetchBrapi(`/api/quote/${encodeURIComponent(ticker)}`, { range, interval });
    if (!r.ok) throw new Error(`brapi ${r.status}`);
    const data = (await r.json()) as BrapiResponse;
    const raw = data.results?.[0];
    if (!raw) throw new Error("brapi: no data");
    return (raw.historicalDataPrice ?? []).map((c) => ({
      date: new Date(c.date * 1000).toISOString().slice(0, 10),
      timestamp: c.date * 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      adjClose: c.adjustedClose,
      volume: c.volume,
    }));
  });
}
