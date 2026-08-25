"use client";

/**
 * useAssetBundle — fetches /api/asset/[symbol] and returns the bundle
 * the drill-down pages need (quote, profile, keyStatistics,
 * financialData, historicals).
 *
 * Reuses the 60s SWR refresh the main /asset/[symbol] page uses so
 * navigating from the home tile to a sub-page doesn't trigger another
 * network round-trip on warm cache.
 */

import useSWR from "swr";

export type AssetBundle = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  sector: string;
  industry: string;
  currency: string;
  marketState: string;
  logoUrl: string | null;

  quote: {
    price: number | null;
    prevClose: number | null;
    change: number | null;
    changePercent: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    dayOpen: number | null;
    volume: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    marketCap: number | null;
    marketTime: string | null;
  };

  metrics: {
    sector: string;
    marketCap: number | null;
    trailingPE: number | null;
    returnOnEquity: number | null;
    ebitda: number | null;
    freeCashflow: number | null;
    dividendYield: number | null;
  };

  profile: Record<string, unknown>;
  keyStatistics: Record<string, unknown>;
  financialData: Record<string, unknown>;

  historicals: {
    income: Array<{
      type: string;
      endDate: string;
      totalRevenue?: number | null;
      costOfRevenue?: number | null;
      grossProfit?: number | null;
      operatingIncome?: number | null;
      netIncome?: number | null;
    }>;
    balance: Array<Record<string, unknown>>;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
});

export function useAssetBundle(symbol: string) {
  const { data, error, isLoading, mutate } = useSWR<AssetBundle>(
    `/api/asset/${encodeURIComponent(symbol)}`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );
  return { data, error, isLoading, mutate };
}