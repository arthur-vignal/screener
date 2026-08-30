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
  industry: string | null;
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
    /** EV / Sales (TTM) — múltiplo de receita. */
    evToSales: number | null;
    /** Receita total TTM (BRL ou USD). */
    revenue: number | null;
    /** EPS (lucro por ação) trailing. */
    eps: number | null;
    /** Margem bruta (decimal 0-1). */
    grossMargin: number | null;
    /** Margem líquida (decimal 0-1). */
    profitMargin: number | null;
    /** Beta vs índice de referência. */
    beta: number | null;
    /** EPS forward (próximos 4 quarters somados). */
    forwardEps: number | null;
    /** Price target — High (analyst). */
    targetHighPrice: number | null;
    /** Price target — Low (analyst). */
    targetLowPrice: number | null;
    /** Price target — Mean (analyst). */
    targetMeanPrice: number | null;
    /** Price target — Median (analyst). */
    targetMedianPrice: number | null;
    /** Recomendação média (1=Strong Buy, 5=Strong Sell). */
    recommendationMean: number | null;
    /** Recomendação textual (ex: "buy", "hold"). */
    recommendationKey: string | null;
    /** Número de analistas que deram opinião. */
    numberOfAnalystOpinions: number | null;
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
  financialData?: Record<string, number | null | undefined>;
  profile?: Record<string, unknown>;
  historicals?: {
    income?: Array<Record<string, unknown>>;
    /** Trimestral — 12-16 quarters (3-4 anos). endDate = quarter end. */
    incomeQuarterly?: Array<Record<string, unknown>>;
    balance?: Array<Record<string, unknown>>;
    cashflow?: Array<Record<string, unknown>>;
    keyStatistics?: Array<Record<string, unknown>>;
  };
  /** A7: earnings yield histórico (1/trailingPE por quarter) — alimenta FairValueChart. */
  earningsYieldHistory?: Array<{
    endDate: string;
    epsLtm: number | null;
    price: number | null;
    trailingPE: number | null;
    earningsYield: number | null;
  }>;
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
