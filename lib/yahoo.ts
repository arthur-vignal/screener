/**
 * Yahoo Finance unofficial API client (query1.finance.yahoo.com / query2).
 * No auth required. Returns historical OHLC, dividends, summaries.
 */

import { cached } from "./cache";

export type YahooCandle = {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

export type YahooQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  prevClose: number;
  volume: number;
};

export type YahooSummary = {
  symbol: string;
  // Valuation
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  enterpriseValue: number | null;
  evToRevenue: number | null;
  evToEBITDA: number | null;
  // Profitability
  profitMargin: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  roe: number | null;
  roa: number | null;
  // Growth
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  // Dividend
  dividendRate: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  // Analyst
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  analystCount: number | null;
  recommendation: string | null;
  // 52-week
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  // ESG
  esgScore: number | null;
  // Risk
  beta: number | null;
};

type YahooChartMeta = {
  regularMarketPrice: number;
  currency: string;
  symbol: string;
  chartPreviousClose?: number;
  previousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  longName?: string;
  shortName?: string;
};

type YahooChartResponse = {
  chart: {
    result?: Array<{
      meta: YahooChartMeta;
      timestamp: number[];
      indicators: {
        quote: Array<{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }>;
        adjclose?: Array<{ adjclose: number[] }>;
      };
    }>;
    error?: { code: string; description: string };
  };
};

async function fetchYahoo(path: string, params: Record<string, string>): Promise<Response> {
  const qs = new URLSearchParams(params).toString();
  const hosts = ["query2", "query1", "query3"];
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
  };
  let lastError: Error | null = null;
  for (const host of hosts) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com${path}?${qs}`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) return r;
      lastError = new Error(`yahoo ${host} ${r.status}`);
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError ?? new Error("yahoo: all hosts failed");
}

export async function getYahooCandles(
  ticker: string,
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y",
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<YahooCandle[]> {
  return cached(`yahoo:hist:${ticker}:${range}:${interval}`, 1800, async () => {
    const r = await fetchYahoo(`/v8/finance/chart/${encodeURIComponent(ticker)}`, { range, interval });
    if (!r.ok) throw new Error("yahoo " + r.status);
    const data = (await r.json()) as YahooChartResponse;
    const result = data.chart.result?.[0];
    if (!result) throw new Error("yahoo: no data");
    const q = result.indicators.quote[0];
    const a = result.indicators.adjclose?.[0]?.adjclose ?? q.close;
    return result.timestamp.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      timestamp: ts * 1000,
      open: q.open[i] ?? 0,
      high: q.high[i] ?? 0,
      low: q.low[i] ?? 0,
      close: q.close[i] ?? 0,
      adjClose: a[i] ?? q.close[i] ?? 0,
      volume: q.volume[i] ?? 0,
    }));
  });
}

export async function getYahooSummary(ticker: string): Promise<YahooSummary | null> {
  // Delegate to fundamentals (Yahoo chart + SEC EDGAR)
  const { getFundamentals } = await import("./fundamentals");
  const f = await getFundamentals(ticker);
  if (!f) return null;
  return {
    symbol: f.symbol,
    marketCap: f.marketCap,
    trailingPE: f.pe,
    forwardPE: null,
    priceToBook: f.pb,
    priceToSales: f.ps,
    enterpriseValue: null,
    evToRevenue: null,
    evToEBITDA: null,
    profitMargin: f.netMargin,
    operatingMargin: f.operatingMargin,
    grossMargin: null,
    roe: f.roe,
    roa: null,
    earningsGrowth: null,
    revenueGrowth: null,
    dividendRate: null,
    dividendYield: null,
    payoutRatio: null,
    targetMeanPrice: null,
    targetHighPrice: null,
    targetLowPrice: null,
    analystCount: null,
    recommendation: null,
    fiftyTwoWeekHigh: f.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: f.fiftyTwoWeekLow,
    esgScore: null,
    beta: null,
  };
}

/** @deprecated Use getFundamentals directly */
async function _legacySummary(ticker: string): Promise<YahooSummary | null> {
  return cached("yahoo:summary:" + ticker, 3600, async () => {
    // Use /v8/finance/chart which works without auth — has price + 52w range.
    // Fundamentals (P/E, P/VP, etc) need /quoteSummary which requires crumb cookie.
    // For now we approximate from chart meta + return null for ratios.
    try {
      const r = await fetchYahoo("/v8/finance/chart/" + encodeURIComponent(ticker), {
        range: "1d",
        interval: "1d",
      });
      if (!r.ok) return null;
      const data = (await r.json()) as YahooChartResponse;
      const result = data.chart.result?.[0];
      if (!result) return null;
      const meta = result.meta;
      return {
        symbol: ticker,
        marketCap: null,
        trailingPE: null,
        forwardPE: null,
        priceToBook: null,
        priceToSales: null,
        enterpriseValue: null,
        evToRevenue: null,
        evToEBITDA: null,
        profitMargin: null,
        operatingMargin: null,
        grossMargin: null,
        roe: null,
        roa: null,
        earningsGrowth: null,
        revenueGrowth: null,
        dividendRate: null,
        dividendYield: null,
        payoutRatio: null,
        targetMeanPrice: null,
        targetHighPrice: null,
        targetLowPrice: null,
        analystCount: null,
        recommendation: null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
        esgScore: null,
        beta: null,
      };
    } catch {
      return null;
    }
  });
}

export type YahooHolding = {
  symbol: string;
  name: string;
  pctHeld: number; // 0..1
};

export async function getYahooHoldings(ticker: string): Promise<YahooHolding[]> {
  return cached("yahoo:holdings:" + ticker, 24 * 3600, async () => {
    // Yahoo ETF holdings: https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules=topHoldings
    const r = await fetchYahoo("/v10/finance/quoteSummary/" + encodeURIComponent(ticker), {
      modules: "topHoldings",
    });
    if (!r.ok) return [];
    const data = (await r.json()) as {
      quoteSummary?: {
        result?: Array<{
          topHoldings?: {
            holdings?: Array<{
              symbol?: string;
              holdingName?: string;
              holdingPercent?: { raw?: number };
            }>;
          };
        }>;
      };
    };
    const holdings = data.quoteSummary?.result?.[0]?.topHoldings?.holdings ?? [];
    return holdings
      .filter((h) => h.symbol && h.holdingPercent?.raw != null)
      .map((h) => ({
        symbol: h.symbol as string,
        name: h.holdingName ?? (h.symbol as string),
        pctHeld: h.holdingPercent?.raw ?? 0,
      }))
      .sort((a, b) => b.pctHeld - a.pctHeld)
      .slice(0, 10);
  });
}


/**
 * Batch quote via Yahoo Spark (1 request for many symbols).
 * Returns Map<symbol, YahooQuote>.
 */
export async function getYahooQuotes(
  symbols: string[],
): Promise<Map<string, YahooQuote>> {
  const result = new Map<string, YahooQuote>();
  if (symbols.length === 0) return result;
  const key = `yahoo:quotes:${symbols.sort().join(",")}`;
  return cached(key, 60, async () => {
    // Yahoo Spark supports up to ~50 symbols per request
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += 50) {
      batches.push(symbols.slice(i, i + 50));
    }
    const all = new Map<string, YahooQuote>();
    for (const batch of batches) {
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(batch.join(","))}&range=1d&interval=1d`;
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!r.ok) continue;
        const data = (await r.json()) as {
          spark?: {
            result?: Array<{
              symbol: string;
              response?: Array<{
                meta?: {
                  regularMarketPrice?: number;
                  chartPreviousClose?: number;
                  currency?: string;
                  regularMarketTime?: number;
                };
              }>;
            }>;
          };
        };
        for (const entry of data.spark?.result ?? []) {
          const sym = entry.symbol;
          const meta = entry.response?.[0]?.meta;
          if (!meta) continue;
          const price = meta.regularMarketPrice ?? 0;
          const prev = meta.chartPreviousClose ?? price;
          all.set(sym, {
            symbol: sym,
            price,
            change: price - prev,
            changePercent: prev === 0 ? 0 : ((price - prev) / prev) * 100,
            currency: meta.currency ?? "USD",
            marketState: meta.regularMarketPrice ? "REGULAR" : "CLOSED",
            dayHigh: 0,
            dayLow: 0,
            dayOpen: 0,
            prevClose: prev,
            volume: 0,
          });
        }
      } catch {
        // ignore batch
      }
    }
    return all;
  });
}

/**
 * Lightweight quote snapshot from the Yahoo chart endpoint.
 * Returns price + 52w + day range + volume + name, but NO fundamentals
 * (P/E, P/VP, ROE require the /quoteSummary endpoint which needs auth cookie).
 *
 * Works for any ticker, including BR with the `.SA` suffix.
 */
export type YahooQuoteSnapshot = {
  symbol: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  currency: string;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  longName: string | null;
  shortName: string | null;
};

export async function getYahooQuoteSnapshot(
  ticker: string,
): Promise<YahooQuoteSnapshot | null> {
  return cached(`yahoo:snapshot:${ticker}`, 300, async () => {
    try {
      const r = await fetchYahoo(
        `/v8/finance/chart/${encodeURIComponent(ticker)}`,
        { range: "1d", interval: "1d" },
      );
      if (!r.ok) return null;
      const data = (await r.json()) as YahooChartResponse;
      const meta = data.chart.result?.[0]?.meta;
      if (!meta || meta.regularMarketPrice == null) return null;
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change = price - prevClose;
      const changePercent = prevClose === 0 ? 0 : (change / prevClose) * 100;
      return {
        symbol: meta.symbol,
        price,
        prevClose,
        change,
        changePercent,
        currency: meta.currency ?? "USD",
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
        dayHigh: meta.regularMarketDayHigh ?? null,
        dayLow: meta.regularMarketDayLow ?? null,
        volume: meta.regularMarketVolume ?? null,
        longName: meta.longName ?? null,
        shortName: meta.shortName ?? null,
      };
    } catch {
      return null;
    }
  });
}
