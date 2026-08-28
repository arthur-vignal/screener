/**
 * asset-bundle.ts — tipos do payload de /api/asset/[symbol].
 *
 * Single source of truth pro shape do bundle que toda UI do /asset consome.
 */

export type AssetBundle = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  logoUrl: string | null;
  sector: string;
  currency: string;
  marketState: string;
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
  candles: Array<{
    date: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
  }>;
  keyStatistics?: Record<string, number | null | undefined>;
  historicals?: {
    income?: Array<Record<string, unknown>>;
    balance?: Array<Record<string, unknown>>;
    cashflow?: Array<Record<string, unknown>>;
    keyStatistics?: Array<Record<string, unknown>>;
  };
};

/** Range presets suportados pelo PriceChart. */
export type RangeKey = "1D" | "7D" | "30D" | "1Y" | "Max";

export const RANGE_DAYS: Record<RangeKey, number | null> = {
  "1D": 1,
  "7D": 7,
  "30D": 30,
  "1Y": 365,
  Max: null,
};
