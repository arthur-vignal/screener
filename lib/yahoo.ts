/**
 * Yahoo Finance unofficial API client (query1.finance.yahoo.com).
 * No auth required. Returns historical OHLC + dividends.
 * Used as fallback when Finnhub's candle endpoint requires paid plan.
 */

import { cached } from "./cache";

export type YahooCandle = {
  date: string;       // YYYY-MM-DD
  timestamp: number;  // ms
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

type YahooResponse = {
  chart: {
    result?: Array<{
      meta: {
        regularMarketPrice: number;
        currency: string;
        symbol: string;
        chartPreviousClose?: number;
        previousClose?: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }>;
        adjclose?: Array<{ adjclose: number[] }>;
      };
    }>;
    error?: { code: string; description: string };
  };
};

export async function getYahooCandles(
  ticker: string,
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y",
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<YahooCandle[]> {
  return cached(`yahoo:${ticker}:${range}:${interval}`, 1800, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!r.ok) throw new Error(`yahoo candles ${r.status}`);
    const data = (await r.json()) as YahooResponse;
    if (data.chart.error) throw new Error(`yahoo: ${data.chart.error.description}`);
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

export async function getYahooQuote(ticker: string): Promise<YahooQuote | null> {
  return cached(`yahoo:quote:${ticker}`, 60, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as YahooResponse;
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
