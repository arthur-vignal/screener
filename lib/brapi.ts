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

/**
 * True when the symbol is a Brazilian B3 ticker (e.g. PETR4, PETR4.SA).
 * 4 letters (A-Z) + 1-2 digits. Optional suffix 11/12.
 */
export function isBrazilianTicker(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/\.SA$/, "");
  return /^[A-Z]{4}\d{1,2}$/.test(s);
}

/** Brapi returns Yahoo-style modules when free tier permits. */
export type BrapiKeyStatistics = {
  enterpriseValue?: number | null;
  forwardPE?: number | null;
  profitMargins?: number | null;
  floatShares?: number | null;
  sharesOutstanding?: number | null;
  sharesShort?: number | null;
  sharesShortPriorMonth?: number | null;
  sharesPercentSharesOut?: number | null;
  heldPercentInsiders?: number | null;
  heldPercentInstitutions?: number | null;
  shortRatio?: number | null;
  shortPercentOfFloat?: number | null;
  // Annual + quarterly series
  bookValue?: number | null;
  priceBook?: number | null;
  priceSales?: number | null;
  earningsQuarterlyGrowth?: number | null;
  earningsAnnualGrowth?: number | null;
  revenueQuarterlyGrowth?: number | null;
  revenueAnnualGrowth?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  ebitdaMargins?: number | null;
  returnOnAssets?: number | null;
  returnOnEquity?: number | null;
  totalCash?: number | null;
  totalDebt?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;
  freeCashflow?: number | null;
  operatingCashflow?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  beta?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  pegRatio?: number | null;
  lastDividendValue?: number | null;
  lastDividendDate?: string | null;
  trailingAnnualDividendRate?: number | null;
  trailingAnnualDividendYield?: number | null;
  /** P/L trailing — vem dentro de `defaultKeyStatistics` na Brapi v2. */
  trailingPE?: number | null;
  /** P/VP — Brapi retorna tanto `priceToBook` quanto `priceBook`. */
  priceToBook?: number | null;
  /** Yield anualizado já em % (conforme `/dictionary` unit="%"). */
  yield?: number | null;
  /** Yield anualizado em decimal (fração 0-1). Multiplicar por 100 ao usar. */
  dividendYield?: number | null;
};

export type BrapiFinancialData = {
  currentPrice?: number | null;
  targetHighPrice?: number | null;
  targetLowPrice?: number | null;
  targetMeanPrice?: number | null;
  targetMedianPrice?: number | null;
  recommendationMean?: number | null;
  recommendationKey?: string | null;
  numberOfAnalystOpinions?: number | null;
  totalCash?: number | null;
  totalCashPerShare?: number | null;
  ebitda?: number | null;
  totalDebt?: number | null;
  quickRatio?: number | null;
  currentRatio?: number | null;
  totalRevenue?: number | null;
  freeCashflow?: number | null;
  operatingCashflow?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  returnOnEquity?: number | null;
};

export type BrapiProfile = {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  industryKey?: string | null;
  industryDisp?: string | null;
  sector?: string | null;
  sectorKey?: string | null;
  sectorDisp?: string | null;
  longBusinessSummary?: string | null;
  fullTimeEmployees?: number | null;
  logoUrl?: string | null;
  cnpj?: string | null;
};

export type BrapiIncomeStatementPeriod = {
  type: "annual" | "quarterly";
  endDate: string;
  totalRevenue?: number | null;
  costOfRevenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  ebitda?: number | null;
  ebit?: number | null;
  interestExpense?: number | null;
  incomeBeforeTax?: number | null;
  incomeTaxExpense?: number | null;
  researchDevelopment?: number | null;
  sellingGeneralAdministrative?: number | null;
  basicEarningsPerShare?: number | null;
  dilutedEarningsPerShare?: number | null;
  earningsPerShare?: number | null;
};

export type BrapiBalanceSheetPeriod = {
  type: "annual" | "quarterly";
  endDate: string;
  cash?: number | null;
  shortTermInvestments?: number | null;
  netReceivables?: number | null;
  inventory?: number | null;
  totalCurrentAssets?: number | null;
  propertyPlantEquipment?: number | null;
  totalAssets?: number | null;
  accountsPayable?: number | null;
  shortLongTermDebt?: number | null;
  totalCurrentLiabilities?: number | null;
  longTermDebt?: number | null;
  totalLiab?: number | null;
  commonStock?: number | null;
  retainedEarnings?: number | null;
  totalStockholderEquity?: number | null;
  netTangibleAssets?: number | null;
};

export type BrapiFundamentals = {
  quote: BrapiQuote;
  candles: BrapiCandle[];
  keyStatistics: BrapiKeyStatistics;
  financialData: BrapiFinancialData;
  profile: BrapiProfile;
  historicals: {
    income: BrapiIncomeStatementPeriod[];
    /** Trimestral — 12-16 quarters (3-4 anos). endDate = quarter end. */
    incomeQuarterly: BrapiIncomeStatementPeriod[];
    balance: BrapiBalanceSheetPeriod[];
    cashflow: Array<Record<string, unknown>>;
    valueAdded: Array<Record<string, unknown>>;
    keyStatistics: Array<Record<string, unknown>>;
    financialData: Array<Record<string, unknown>>;
  };
};

/**
 * Pull full fundamentals bundle from Brapi for a Brazilian ticker.
 * Combines quote + candles + defaultKeyStatistics + financialData + summaryProfile
 * + incomeStatementHistory + balanceSheetHistory modules.
 * Returns null when not found or no token configured.
 */
export async function getBrapiFundamentals(
  ticker: string,
): Promise<BrapiFundamentals | null> {
  const upper = ticker.toUpperCase().replace(/\.SA$/, "");
  return cached(
      `brapi:full:${upper}`,
      // 30min (was 6h). A 6h window was poisoning the cache when Brapi
      // returned a partial response on first deploy — price/change came
      // back null and got served to every ticker page until the entry
      // expired. 30min is short enough that the next refresh interval
      // (60s SWR) re-fetches Brapi regularly, long enough to avoid
      // hammering the 15 req/min free-tier rate limit.
      30 * 60,
      async () => {
      // IMPORTANTE: brapi v2 NÃO aceita estes como modules em /quote:
      // - defaultKeyStatisticsHistory (precisa /api/v2/stocks/statistics?mode=history)
      // - incomeStatementHistoryQuarterly (precisa /api/v2/stocks/income-statement?period=quarterly)
      // Os wrappers /api/asset/[symbol]/stats-history e income-quarterly
      // fazem essas chamadas separadas.
      const modules = [
              "defaultKeyStatistics",
              "financialData",
              "summaryProfile",
              "incomeStatementHistory",
              "balanceSheetHistory",
              "cashflowHistory",
              "valueAddedHistory",
              "financialDataHistory",
            ].join(",");
            const params: Record<string, string> = { modules, range: "1y", interval: "1d" };
            const token = getToken();
            if (token) params.token = token;
            const qs = new URLSearchParams(params).toString();
            const r = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(upper)}?${qs}`, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
              },
              signal: AbortSignal.timeout(10000),
            });
            if (!r.ok) return null;
            const data = (await r.json()) as BrapiResponse & {
              results?: Array<{
                defaultKeyStatistics?: BrapiKeyStatistics;
                financialData?: BrapiFinancialData;
                summaryProfile?: BrapiProfile;
                incomeStatementHistory?: { incomeStatementHistory?: BrapiIncomeStatementPeriod[] } | BrapiIncomeStatementPeriod[];
                incomeStatementHistoryQuarterly?: { incomeStatementHistory?: BrapiIncomeStatementPeriod[] } | BrapiIncomeStatementPeriod[];
                balanceSheetHistory?: { balanceSheetStatements?: BrapiBalanceSheetPeriod[] } | BrapiBalanceSheetPeriod[];
                cashflowHistory?: Array<Record<string, unknown>> | { cashflowHistory?: Array<Record<string, unknown>> };
                valueAddedHistory?: Array<Record<string, unknown>> | { valueAddedHistory?: Array<Record<string, unknown>> };
                defaultKeyStatisticsHistory?: Array<Record<string, unknown>> | { defaultKeyStatisticsHistory?: Array<Record<string, unknown>> };
                financialDataHistory?: Array<Record<string, unknown>> | { financialDataHistory?: Array<Record<string, unknown>> };
              }>;
            };
            const raw = data.results?.[0];
            if (!raw) return null;

            const rawQuote = raw as unknown as BrapiRawQuote;
            const candles = (rawQuote.historicalDataPrice ?? []).map((c) => ({
              date: new Date(c.date * 1000).toISOString().slice(0, 10),
              timestamp: c.date * 1000,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              adjClose: c.adjustedClose,
              volume: c.volume,
            }));
            if (!rawQuote.regularMarketPrice) return null;

            const incomeHist = raw.incomeStatementHistory;
            const income: BrapiIncomeStatementPeriod[] = Array.isArray(incomeHist)
              ? incomeHist
              : incomeHist?.incomeStatementHistory ?? [];

            // Trimestral: mesmo shape, mas com endDate tipo "2024-09-30" (quarter end)
            const incomeQuarterlyHist = undefined; // vem de /api/asset/[symbol]/income-quarterly
            const incomeQuarterly: BrapiIncomeStatementPeriod[] = [];

            const balanceHist = raw.balanceSheetHistory;
            const balance: BrapiBalanceSheetPeriod[] = Array.isArray(balanceHist)
              ? balanceHist
              : balanceHist?.balanceSheetStatements ?? [];

            // Unwrap the *History modules — Brapi sometimes returns either an
            // array directly or an object with the array under the same key.
            // Recebe a key específica pra evitar conflito entre os 4
            // *History modules (valueAddedHistory vs defaultKeyStatisticsHistory
            // vs cashflowHistory vs financialDataHistory).
            function unwrapHistory<T>(
              v: T[] | { [k: string]: T[] } | undefined,
              key: string,
            ): T[] {
              if (!v) return [];
              if (Array.isArray(v)) return v;
              const obj = v as Record<string, T[]>;
              return obj[key] ?? [];
            }

            return {
              quote: normalize(rawQuote),
              candles,
              keyStatistics: raw.defaultKeyStatistics ?? {},
              financialData: raw.financialData ?? {},
              profile: raw.summaryProfile ?? {},
              historicals: {
                income,
                incomeQuarterly,
                balance,
                cashflow: unwrapHistory(
                  raw.cashflowHistory as unknown as
                    | Array<Record<string, unknown>>
                    | { [k: string]: Array<Record<string, unknown>> },
                  "cashflowHistory",
                ),
                valueAdded: unwrapHistory(
                  raw.valueAddedHistory as unknown as
                    | Array<Record<string, unknown>>
                    | { [k: string]: Array<Record<string, unknown>> },
                  "valueAddedHistory",
                ),
                keyStatistics: unwrapHistory(
                  raw.defaultKeyStatisticsHistory as unknown as
                    | Array<Record<string, unknown>>
                    | { [k: string]: Array<Record<string, unknown>> },
                  "defaultKeyStatisticsHistory",
                ),
                financialData: unwrapHistory(
                  raw.financialDataHistory as unknown as
                    | Array<Record<string, unknown>>
                    | { [k: string]: Array<Record<string, unknown>> },
                  "financialDataHistory",
                ),
              },
            };
          },
        );
      }

function getToken(): string {
  // Prefer BRAPI_TOKEN (used elsewhere in the codebase: brapi-full.ts,
  // brapi-dividends.ts, brapi-macro.ts, brapi-curve.ts, brapi-correlation.ts).
  // Fall back to BRAPI_API_TOKEN for backwards compatibility, then empty.
  return process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
}



/**
 * Normalize um valor de yield que pode vir em decimal (0.09) ou percentual (9.0).
 *
 * A Brapi v2 está inconsistente: `/dictionary` diz `unit='%'` para `yield`,
 * mas o `defaultKeyStatistics` na prática retorna decimal (PETR4 = 0.09).
 *
 * Heurística (até a Brapi normalizar):
 *   - Se o valor for null/undefined, retorna null.
 *   - Se for < 0.5, trata como decimal e multiplica por 100.
 *   - Se for >= 0.5, trata como percentual direto.
 *
 * DY de 9% vira 9.0 (correto). DY "de 0.09" vira 9.0 (correto).
 * O limiar 0.5 separa claramente os dois universos — nenhum ativo paga 50%.
 */
export function normalizeYield(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value < 0.5 ? value * 100 : value;
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
  return cached(`brapi:candles:${ticker}:${range}:${interval}`, 300, async () => {
    const r = await fetchBrapi(`/api/quote/${encodeURIComponent(ticker)}`, { range, interval });
    if (!r.ok) throw new Error(`brapi ${r.status}`);
    const data = (await r.json()) as BrapiResponse;
    const raw = data.results?.[0];
    if (!raw) throw new Error("brapi: no data");
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
    // Defensive: if brapi returned [] for an IBOV/B3 ticker that SHOULD have
    // data, log a warning so we notice instead of silently caching empty.
    // Cache layer already won't cache empty arrays (see lib/cache.ts), so this
    // will be retried next request.
    if (candles.length === 0) {
      console.warn(`[brapi] empty candles for ${ticker} (range=${range})`);
    }
    return candles;
  });
}
