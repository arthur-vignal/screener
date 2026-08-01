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
  return fetch(`https://query2.finance.yahoo.com${path}?${qs}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
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
    if (data.chart.error) throw new Error("yahoo: " + data.chart.error.description);
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

export async function getYahooQuote(ticker: string): Promise<YahooQuote | null> {
  return cached("yahoo:quote:" + ticker, 60, async () => {
    const r = await fetchYahoo("/v8/finance/chart/" + encodeURIComponent(ticker), { range: "1d", interval: "1d" });
    if (!r.ok) return null;
    const data = (await r.json()) as YahooChartResponse;
    const result = data.chart.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const last = result.timestamp.length - 1;
    const q = result.indicators.quote[0];
    const price = meta.regularMarketPrice ?? q.close[last] ?? 0;
    const prevClose = q.close[last - 1] ?? meta.chartPreviousClose ?? price;
    return {
      symbol: meta.symbol,
      price,
      change: price - prevClose,
      changePercent: ((price - prevClose) / prevClose) * 100,
      currency: meta.currency,
      marketState: meta.regularMarketPrice ? "REGULAR" : "CLOSED",
      dayHigh: q.high[last] ?? 0,
      dayLow: q.low[last] ?? 0,
      dayOpen: q.open[last] ?? 0,
      prevClose,
      volume: q.volume[last] ?? 0,
    };
  });
}

export async function getYahooSummary(ticker: string): Promise<YahooSummary | null> {
  return cached("yahoo:summary:" + ticker, 3600, async () => {
    const r = await fetchYahoo("/v10/finance/quoteSummary/" + encodeURIComponent(ticker), {
      modules: "defaultKeyStatistics,financialData,summaryDetail,recommendationTrend,esgScores",
    });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      quoteSummary?: {
        result?: Array<Record<string, unknown>>;
      };
    };
    const result = data.quoteSummary?.result?.[0];
    if (!result) return null;

    const num = (v: unknown): number | null => {
      if (v && typeof v === "object" && "raw" in v) {
        const raw = (v as { raw: number }).raw;
        return typeof raw === "number" ? raw : null;
      }
      return null;
    };
    const str = (v: unknown): string | null => {
      if (v && typeof v === "object" && "fmt" in v) {
        const fmt = (v as { fmt: string }).fmt;
        return typeof fmt === "string" ? fmt : null;
      }
      return null;
    };

    const defaultKey = (result.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    const financial = (result.financialData ?? {}) as Record<string, unknown>;
    const summary = (result.summaryDetail ?? {}) as Record<string, unknown>;
    const esg = (result.esgScores ?? {}) as Record<string, unknown>;

    return {
      symbol: ticker,
      marketCap: num(defaultKey.marketCap) ?? num(summary.marketCap),
      trailingPE: num(summary.trailingPE),
      forwardPE: num(defaultKey.forwardPE),
      priceToBook: num(defaultKey.priceToBook),
      priceToSales: num(summary.priceToSalesTrailing12Months),
      enterpriseValue: num(defaultKey.enterpriseValue),
      evToRevenue: num(defaultKey.evToRevenue),
      evToEBITDA: num(defaultKey.enterpriseToEbitda),
      profitMargin: num(financial.profitMargins),
      operatingMargin: num(financial.operatingMargins),
      grossMargin: num(financial.grossMargins),
      roe: num(financial.returnOnEquity),
      roa: num(financial.returnOnAssets),
      earningsGrowth: num(financial.earningsGrowth),
      revenueGrowth: num(financial.revenueGrowth),
      dividendRate: num(summary.dividendRate),
      dividendYield: num(summary.dividendYield),
      payoutRatio: num(summary.payoutRatio),
      targetMeanPrice: num(financial.targetMeanPrice),
      targetHighPrice: num(financial.targetHighPrice),
      targetLowPrice: num(financial.targetLowPrice),
      analystCount: num(financial.numberOfAnalystOpinions),
      recommendation: str(financial.recommendationKey),
      fiftyTwoWeekHigh: num(summary.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(summary.fiftyTwoWeekLow),
      esgScore: num(esg.totalEsg),
      beta: num(defaultKey.beta),
    };
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
