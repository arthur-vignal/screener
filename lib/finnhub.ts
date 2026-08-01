/**
 * Finnhub API client (https://finnhub.io).
 * Free tier: 60 req/min.
 * Cache strategy: 5min for quotes, 1h for profiles.
 */

import { cached } from "./cache";

const BASE = "https://finnhub.io/api/v1";

function getKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY not configured");
  return key;
}

export type Quote = {
  c: number;  // current price
  d: number;  // change
  dp: number; // change percent
  h: number;  // high price of the day
  l: number;  // low price of the day
  o: number;  // open price of the day
  pc: number; // previous close
  t: number;  // unix timestamp
};

export type CompanyProfile = {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;  // in millions
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
};

export type BasicFinancials = {
  // Open index signature — Finnhub returns many metric fields; access by name.
  metric: Record<string, number | string | null | undefined>;
  series?: Record<string, unknown>;
};

export async function getQuote(ticker: string): Promise<Quote | null> {
  return cached(
    `finnhub:quote:${ticker}`,
    300, // 5min
    async () => {
      const r = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${getKey()}`);
      if (!r.ok) {
        if (r.status === 429) throw new Error("finnhub rate limit");
        throw new Error(`finnhub quote ${r.status}`);
      }
      const data = (await r.json()) as Quote;
      if (!data.c) return null;
      return data;
    },
  );
}

export async function getProfile(ticker: string): Promise<CompanyProfile | null> {
  return cached(
    `finnhub:profile:${ticker}`,
    3600, // 1h
    async () => {
      const r = await fetch(`${BASE}/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${getKey()}`);
      if (!r.ok) throw new Error(`finnhub profile ${r.status}`);
      const data = (await r.json()) as CompanyProfile;
      if (!data.ticker) return null;
      return data;
    },
  );
}

export type RecommendationTrend = {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

export async function getRecommendation(ticker: string): Promise<RecommendationTrend | null> {
  return cached(
    `finnhub:recommendation:${ticker}`,
    7 * 24 * 3600,
    async () => {
      const r = await fetch(
        `${BASE}/stock/recommendation?symbol=${encodeURIComponent(ticker)}&token=${getKey()}`,
      );
      if (!r.ok) return null;
      const data = (await r.json()) as RecommendationTrend[];
      if (!Array.isArray(data) || data.length === 0) return null;
      return data[0];
    },
  );
}

export async function getFinancials(ticker: string): Promise<BasicFinancials | null> {
  return cached(
    `finnhub:financials:${ticker}`,
    3600,
    async () => {
      const r = await fetch(`${BASE}/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${getKey()}`);
      if (!r.ok) throw new Error(`finnhub financials ${r.status}`);
      return (await r.json()) as BasicFinancials;
    },
  );
}

export async function getCandles(ticker: string, resolution: "D" | "W" | "M" = "D", days = 365): Promise<{
  t: number[];
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  v: number[];
  s: string;
}> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - days * 24 * 60 * 60;
  return cached(
    `finnhub:candles:${ticker}:${resolution}:${days}`,
    1800, // 30min
    async () => {
      const r = await fetch(
        `${BASE}/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=${resolution}&from=${from}&to=${now}&token=${getKey()}`,
      );
      if (!r.ok) throw new Error(`finnhub candles ${r.status}`);
      return r.json();
    },
  );
}
