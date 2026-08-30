/**
 * Brapi.dev API client — B3 (Brazilian stock exchange) coverage.
 *
 * Migrated to v2 endpoints (2026-08-30). v2 separou o antigo `/api/quote/{t}?modules=...`
 * em endpoints granulares. Cada wrapper aqui bate em **um** endpoint v2 e cacheia
 * independentemente. Composição (fundamentals completos, etc.) é responsabilidade do
 * caller ou de `lib/brapi-full.ts`.
 *
 * Catálogo v2 (ver https://brapi.dev/docs/acoes/migracao-v2):
 *   GET /api/v2/stocks/quote?symbols=X[,Y,Z]            — cotação + 52w + mcap
 *   GET /api/v2/stocks/profile?symbols=X[,Y,Z]           — sectorDisp + CNPJ + business summary
 *   GET /api/v2/stocks/historical?symbols=X&range=Y&interval=Z
 *   GET /api/v2/stocks/statistics?symbols=X&mode=current|history&period=annual|quarterly
 *   GET /api/v2/stocks/financial-data?symbols=X&mode=current|history&period=annual|quarterly
 *   GET /api/v2/stocks/balance-sheet?symbols=X&period=annual|quarterly
 *   GET /api/v2/stocks/income-statement?symbols=X&period=annual|quarterly
 *   GET /api/v2/stocks/cash-flow?symbols=X&period=annual|quarterly
 *   GET /api/v2/stocks/dividends?symbols=X
 *
 * Não-usamos (mantidos em `lib/brapi-full.ts` por enquanto):
 *   /api/v2/stocks/value-added — DVA, anual/trimestral (raramente usado)
 *
 * Auth: token via env BRAPI_TOKEN (preferred) ou BRAPI_API_TOKEN (legacy). v2
 * funciona no free tier para quase todos os endpoints; o token Pro só destrava
 * rate-limit maior e alguns indicadores restritos.
 *
 * Cache: TTL granular por endpoint — quote 60s, fundamentals current 30min,
 * history 6h, profile 24h. Tudo via `cached()` em `lib/cache.ts`.
 */

import { cached } from "./cache";

const BRAPI_BASE = "https://brapi.dev/api";

function getToken(): string {
  return process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
}

function authQuery(): string {
  const t = getToken();
  return t ? `&token=${encodeURIComponent(t)}` : "";
}

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
} as const;

const FETCH_TIMEOUT_MS = 10_000;

/**
 * fetch JSON com tolerância a falhas. Retorna `null` em qualquer erro
 * (network, HTTP não-2xx, JSON inválido). Caller decide o que fazer.
 */
async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, {
      headers: COMMON_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos (compat: nomes atuais preservados pra minimizar diff)
//
// `data` em v2 é `objeto` para endpoints em `mode=current` e `array` para
// `mode=history`. Wrappers aqui normalizam isso.
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * Output de `/api/v2/stocks/quote`. Equivalente ao antigo `/api/quote/{t}` mas
 * sem `historicalDataPrice` (que foi pra `/api/v2/stocks/historical`).
 */
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
  marketTime: string | null;
};

/**
 * Output de `/api/v2/stocks/profile`. `sectorDisp` é o campo que filtramos
 * peer-benchmarks por subsetor — vem em PT-BR (ex: "Petróleo, Gás e
 * Biocombustíveis").
 */
export type BrapiProfile = {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  sector?: string | null;
  sectorKey?: string | null;
  sectorDisp?: string | null;
  industry?: string | null;
  industryKey?: string | null;
  industryDisp?: string | null;
  cnpj?: string | null;
  website?: string | null;
  longBusinessSummary?: string | null;
  fullTimeEmployees?: number | null;
  logoUrl?: string | null;
};

/**
 * Output de `/api/v2/stocks/statistics` em `mode=current`. `data` é objeto.
 *
 * v2 mudou shape vs antiga `defaultKeyStatistics`:
 *   - `priceEarnings` → `trailingPE`
 *   - `priceBook` → `priceToBook`
 *   - `dividendYield` continua decimal (multiplicar por 100 pra %)
 *   - `yield` (anualizado, % direto)
 *   - `beta` decimal (multiplicar por 1 — já é unidade)
 */
export type BrapiKeyStatistics = {
  symbol: string;
  // valuation
  enterpriseValue?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToBook?: number | null;
  pegRatio?: number | null;
  priceSales?: number | null;
  marketCap?: number | null;
  bookValue?: number | null;
  earningsPerShare?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  // margins / profitability (decimal)
  profitMargins?: number | null;
  grossMargins?: number | null;
  ebitdaMargins?: number | null;
  operatingMargins?: number | null;
  returnOnEquity?: number | null;
  returnOnAssets?: number | null;
  // growth (decimal, YoY)
  earningsQuarterlyGrowth?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  earningsGrowthAnnual?: number | null;
  revenueGrowthAnnual?: number | null;
  // shares
  sharesOutstanding?: number | null;
  floatShares?: number | null;
  heldPercentInsiders?: number | null;
  heldPercentInstitutions?: number | null;
  // dividends (decimal)
  dividendYield?: number | null;
  yield?: number | null;
  lastDividendValue?: number | null;
  lastDividendDate?: string | null;
  // risk
  beta?: number | null;
  // misc
  enterpriseToRevenue?: number | null;
  enterpriseToEbitda?: number | null;
  fiftyTwoWeekChange?: number | null;
};

/**
 * Item da série histórica de `/api/v2/stocks/statistics?mode=history`.
 * Inclui `endDate` e `price` (preço de fechamento no quarter end) —
 * ambos vêm na resposta da brapi e são usados pra derivar earnings
 * yield histórico.
 */
export type BrapiKeyStatisticsPeriod = BrapiKeyStatistics & {
  type: "annual" | "quarterly";
  endDate: string;
  /** Preço de fechamento no quarter end (em R$). */
  price?: number | null;
};

/**
 * Output de `/api/v2/stocks/financial-data` em `mode=current`. Decimal margins.
 * Note que v2 separou EBITDA (em financial-data) de margens operacionais (em
 * statistics).
 *
 * Para `mode=history`, retorna `Array<BrapiFinancialDataHistoryPeriod>` (campos
 * de período: `endDate`, `type`, e os mesmos indicadores repetidos).
 */
export type BrapiFinancialData = {
  symbol: string;
  currentPrice?: number | null;
  // analyst — sempre null pra BR (sem sell-side)
  targetHighPrice?: number | null;
  targetLowPrice?: number | null;
  targetMeanPrice?: number | null;
  targetMedianPrice?: number | null;
  recommendationMean?: number | null;
  recommendationKey?: number | string | null;
  numberOfAnalystOpinions?: number | null;
  // size
  totalRevenue?: number | null;
  revenuePerShare?: number | null;
  ebitda?: number | null;
  grossProfits?: number | null;
  // profitability
  grossMargins?: number | null;
  ebitdaMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  returnOnEquity?: number | null;
  returnOnAssets?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  // debt & liquidity
  totalCash?: number | null;
  totalCashPerShare?: number | null;
  totalDebt?: number | null;
  debtToEquity?: number | null;
  quickRatio?: number | null;
  currentRatio?: number | null;
  // cash flow
  operatingCashflow?: number | null;
  freeCashflow?: number | null;
};

/**
 * Item da série histórica de `/api/v2/stocks/financial-data?mode=history`.
 * Mesmos campos do current + `type` + `endDate`.
 */
export type BrapiFinancialDataPeriod = BrapiFinancialData & {
  type: "annual" | "quarterly";
  endDate: string;
};

/**
 * Item do array `data` em `/api/v2/stocks/{balance-sheet,income-statement,cash-flow}`
 * com `period=quarterly|annual`. Compat com shape antigo (`BrapiBalanceSheetPeriod`
 * etc) — campo `type` indica "annual" ou "quarterly".
 */
export type BrapiIncomeStatementPeriod = {
  type: "annual" | "quarterly";
  endDate: string;
  totalRevenue?: number | null;
  costOfRevenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  ebit?: number | null;
  ebitda?: number | null;
  netIncome?: number | null;
  incomeBeforeTax?: number | null;
  incomeTaxExpense?: number | null;
  interestExpense?: number | null;
  sellingGeneralAdministrative?: number | null;
  /** Em centavos (1540 = R$ 1,54). Dividir por 100. */
    basicEarningsPerShare?: number | null;
    basicEarningsPerCommonShare?: number | null;
    dilutedEarningsPerShare?: number | null;
    dilutedEarningsPerCommonShare?: number | null;
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
  longTermDebt?: number | null;
  totalCurrentLiabilities?: number | null;
  totalLiab?: number | null;
  /** v2: totalStockholderEquity. */
  totalEquity?: number | null;
};

export type BrapiCashflowPeriod = {
  type: "annual" | "quarterly";
  endDate: string;
  operatingCashFlow?: number | null;
  freeCashFlow?: number | null;
  capitalExpenditures?: number | null;
  dividendsPaid?: number | null;
  investmentCashFlow?: number | null;
  financingCashFlow?: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai o `data` do primeiro item de `results[]`, validando changed/symbol.
 * Retorna null se ticker foi renomeado (`changed: true`) ou não veio.
 */
function extractData(results: unknown): Record<string, unknown> | null {
  if (!Array.isArray(results) || results.length === 0) return null;
  const item = results[0] as Record<string, unknown>;
  if (item.changed === true) {
    console.warn(
      `[brapi] ticker foi renomeado: requested=${item.requestedSymbol} → actual=${item.symbol}`,
    );
  }
  const data = item.data;
  if (data == null || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

function normalizeQuote(snap: Record<string, unknown>, symbol: string): BrapiQuote {
  const price = (snap.regularMarketPrice as number | null) ?? 0;
  const prev = (snap.regularMarketPreviousClose as number | null) ?? price;
  return {
    // `symbol` vem do nível superior em `/stocks/quote` (`item.symbol`),
    // não dentro de `data`. Caller passa explicitamente.
    symbol,
    shortName: (snap.shortName as string | null) ?? null,
    longName: (snap.longName as string | null) ?? null,
    currency: (snap.currency as string | null) ?? "BRL",
    price,
    change: (snap.regularMarketChange as number | null) ?? price - prev,
    changePercent:
      (snap.regularMarketChangePercent as number | null) ??
      (prev === 0 ? 0 : ((price - prev) / prev) * 100),
    marketState: price ? "REGULAR" : "CLOSED",
    dayHigh: (snap.regularMarketDayHigh as number | null) ?? 0,
    dayLow: (snap.regularMarketDayLow as number | null) ?? 0,
    dayOpen: (snap.regularMarketOpen as number | null) ?? 0,
    prevClose: prev,
    volume: (snap.regularMarketVolume as number | null) ?? 0,
    marketCap: (snap.marketCap as number | null) ?? null,
    trailingPE: null, // vem de `/statistics`, não de `/quote`
    earningsPerShare: null, // idem
    fiftyTwoWeekHigh: (snap.fiftyTwoWeekHigh as number | null) ?? null,
    fiftyTwoWeekLow: (snap.fiftyTwoWeekLow as number | null) ?? null,
    logoUrl: (snap.logourl as string | null) ?? null,
    marketTime: (snap.regularMarketTime as string | null) ?? null,
  };
}

function normalizeCandles(raws: unknown[]): BrapiCandle[] {
  return raws.map((c) => {
    const rec = c as Record<string, unknown>;
    const ts = Number(rec.date) * 1000;
    return {
      date: new Date(ts).toISOString().slice(0, 10),
      timestamp: ts,
      open: Number(rec.open ?? 0),
      high: Number(rec.high ?? 0),
      low: Number(rec.low ?? 0),
      close: Number(rec.close ?? 0),
      adjClose: Number(rec.adjustedClose ?? rec.close ?? 0),
      volume: Number(rec.volume ?? 0),
    };
  });
}

/** Limite Pro. Free tier aceita até 30 mas o plano Pro limita em 19. */
const BATCH_LIMIT = 19;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrappers públicos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cotação atual + 52w + mcap. 60s cache. Aceita 1+ símbolos; usa `/quote` batch.
 *
 * Nota de migração: substitui o antigo `/api/quote/{t}` legacy. v2 separa
 * profile e histórico em endpoints próprios (`brapiProfile`, `brapiHistorical`).
 */
export async function brapiQuote(
  symbols: string[],
): Promise<Map<string, BrapiQuote>> {
  const out = new Map<string, BrapiQuote>();
  if (symbols.length === 0) return out;

  const norm = symbols.map((s) => s.toUpperCase().replace(/\.SA$/, ""));
  const key = `brapi:v2:quote:${norm.sort().join(",")}`;
  return cached(key, 60, async () => {
    const map = new Map<string, BrapiQuote>();
    for (const batch of chunk(norm, BATCH_LIMIT)) {
      const url = `${BRAPI_BASE}/v2/stocks/quote?symbols=${batch.map(encodeURIComponent).join(",")}${authQuery()}`;
      const res = (await fetchJson(url)) as { results?: unknown[] } | null;
      const results = res?.results ?? [];
      for (const item of results) {
              const rec = item as Record<string, unknown>;
              if (rec.changed === true) {
                console.warn(
                  `[brapi] ticker renomeado: ${rec.requestedSymbol} → ${rec.symbol}`,
                );
              }
              const data = rec.data as Record<string, unknown> | null;
              if (!data) continue;
              const sym = String(rec.symbol ?? "");
              if (!sym) continue;
              const q = normalizeQuote(data, sym);
              map.set(q.symbol, q);
            }
    }
    return map;
  });
}

/**
 * Profile (sectorDisp, CNPJ, business summary). 24h cache.
 */
export async function brapiProfile(symbol: string): Promise<BrapiProfile | null> {
  const upper = symbol.toUpperCase().replace(/\.SA$/, "");
  return cached(`brapi:v2:profile:${upper}`, 24 * 60 * 60, async () => {
    const url = `${BRAPI_BASE}/v2/stocks/profile?symbols=${encodeURIComponent(upper)}${authQuery()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const data = extractData(res?.results);
    if (!data) return null;
    return data as unknown as BrapiProfile;
  });
}

/**
 * Histórico de preço (OHLC). 5min cache.
 * Range: 5d | 1mo | 3mo | 6mo | 1y | 2y | 5y. Interval: 5m | 15m | 30m | 1h | 1d | 1wk | 1mo.
 *
 * `5d` é intraday-friendly (5min candles do pregão anterior + atual).
 */
export async function brapiHistorical(
  symbol: string,
  opts: {
    range?: "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";
    interval?: "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo";
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<BrapiCandle[]> {
  const upper = symbol.toUpperCase().replace(/\.SA$/, "");
  const { range = "1y", interval = "1d", startDate, endDate } = opts;
  const key = `brapi:v2:historical:${upper}:${range}:${interval}:${startDate ?? ""}:${endDate ?? ""}`;
  return cached(key, 5 * 60, async () => {
    const params = new URLSearchParams({ symbols: upper });
    if (startDate && endDate) {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else {
      params.set("range", range);
      params.set("interval", interval);
    }
    const t = getToken();
    if (t) params.set("token", t);
    const url = `${BRAPI_BASE}/v2/stocks/historical?${params.toString()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const data = extractData(res?.results);
    if (!data) return [];
    const raws = (data.historicalDataPrice as unknown[]) ?? [];
    if (raws.length === 0) {
      console.warn(`[brapi] empty candles for ${upper} (range=${range})`);
    }
    return normalizeCandles(raws);
  });
}

/**
 * Statistics — múltiplos. Aceita `mode=current` (objeto) ou
 * `mode=history` (array). Period default = annual.
 *
 * 30min (current) ou 6h (history) de cache.
 */
export async function brapiStatistics(opts: {
  symbol: string;
  mode: "current" | "history";
  period?: "annual" | "quarterly";
}): Promise<BrapiKeyStatistics | BrapiKeyStatisticsPeriod[] | null> {
  const upper = opts.symbol.toUpperCase().replace(/\.SA$/, "");
  const period = opts.period ?? "annual";
  const ttl = opts.mode === "current" ? 30 * 60 : 6 * 60 * 60;
  const key = `brapi:v2:statistics:${upper}:${opts.mode}:${period}`;
  return cached(key, ttl, async () => {
    const params = new URLSearchParams({
      symbols: upper,
      mode: opts.mode,
      period,
    });
    const t = getToken();
    if (t) params.set("token", t);
    const url = `${BRAPI_BASE}/v2/stocks/statistics?${params.toString()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const data = extractData(res?.results);
    if (!data) return null;
    if (opts.mode === "current") return data as unknown as BrapiKeyStatistics;
        return (data as unknown as BrapiKeyStatisticsPeriod[]) ?? [];
  });
}

/**
 * Statistics batch — múltiplos tickers em uma chamada. Retorna Map por símbolo.
 * Respeita limite de 19 por request.
 *
 * Modo só `current` por enquanto — history com 19 tickers estouraria response size.
 */
export async function brapiStatisticsBatch(
  symbols: string[],
): Promise<Map<string, BrapiKeyStatistics>> {
  const out = new Map<string, BrapiKeyStatistics>();
  if (symbols.length === 0) return out;
  const norm = symbols.map((s) => s.toUpperCase().replace(/\.SA$/, ""));
  const key = `brapi:v2:statistics:batch:${norm.sort().join(",")}`;
  return cached(key, 30 * 60, async () => {
    const map = new Map<string, BrapiKeyStatistics>();
    for (const batch of chunk(norm, BATCH_LIMIT)) {
      const params = new URLSearchParams({
        symbols: batch.join(","),
        mode: "current",
        period: "annual",
      });
      const t = getToken();
      if (t) params.set("token", t);
      const url = `${BRAPI_BASE}/v2/stocks/statistics?${params.toString()}`;
      const res = (await fetchJson(url)) as { results?: unknown[] } | null;
      const results = res?.results ?? [];
      for (const item of results) {
        const rec = item as Record<string, unknown>;
        const data = rec.data as Record<string, unknown> | null;
        if (!data) continue;
        const symbol = String(data.symbol ?? rec.symbol ?? "");
        if (!symbol) continue;
        map.set(symbol, data as unknown as BrapiKeyStatistics);
      }
    }
    return map;
  });
}

/**
 * Financial-data. `mode=current` retorna objeto, `mode=history` retorna array
 * de períodos. 30min (current) / 6h (history).
 */
export async function brapiFinancialData(opts: {
  symbol: string;
  mode: "current" | "history";
  period?: "annual" | "quarterly";
}): Promise<BrapiFinancialData | BrapiFinancialDataPeriod[] | null> {
  const upper = opts.symbol.toUpperCase().replace(/\.SA$/, "");
  const period = opts.period ?? "annual";
  const ttl = opts.mode === "current" ? 30 * 60 : 6 * 60 * 60;
  const key = `brapi:v2:financial-data:${upper}:${opts.mode}:${period}`;
  return cached(key, ttl, async () => {
    const params = new URLSearchParams({
      symbols: upper,
      mode: opts.mode,
      period,
    });
    const t = getToken();
    if (t) params.set("token", t);
    const url = `${BRAPI_BASE}/v2/stocks/financial-data?${params.toString()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const data = extractData(res?.results);
    if (!data) return null;
    if (opts.mode === "current") {
      return { symbol: upper, ...(data as Record<string, unknown>) } as BrapiFinancialData;
    }
    return (data as unknown as BrapiFinancialDataPeriod[]) ?? [];
  });
}

/**
 * Balance sheet — array de períodos. `period=quarterly` retorna ~16Q.
 * 6h cache.
 */
export async function brapiBalanceSheet(opts: {
  symbol: string;
  period?: "annual" | "quarterly";
}): Promise<BrapiBalanceSheetPeriod[]> {
  const upper = opts.symbol.toUpperCase().replace(/\.SA$/, "");
  const period = opts.period ?? "quarterly";
  return cached(`brapi:v2:balance-sheet:${upper}:${period}`, 6 * 60 * 60, async () => {
    const params = new URLSearchParams({ symbols: upper, period });
    const t = getToken();
    if (t) params.set("token", t);
    const url = `${BRAPI_BASE}/v2/stocks/balance-sheet?${params.toString()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const data = extractData(res?.results);
    if (!data || !Array.isArray(data)) return [];
    return data as unknown as BrapiBalanceSheetPeriod[];
  });
}

/**
 * Income statement — array de períodos. `period=quarterly` retorna ~16Q.
 * 6h cache.
 */
export async function brapiIncomeStatement(opts: {
  symbol: string;
  period?: "annual" | "quarterly";
}): Promise<BrapiIncomeStatementPeriod[]> {
  const upper = opts.symbol.toUpperCase().replace(/\.SA$/, "");
  const period = opts.period ?? "quarterly";
  return cached(`brapi:v2:income-statement:${upper}:${period}`, 6 * 60 * 60, async () => {
    const params = new URLSearchParams({ symbols: upper, period });
    const t = getToken();
    if (t) params.set("token", t);
    const url = `${BRAPI_BASE}/v2/stocks/income-statement?${params.toString()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const data = extractData(res?.results);
    if (!data || !Array.isArray(data)) return [];
    return data as unknown as BrapiIncomeStatementPeriod[];
  });
}

/**
 * Cash flow — array de períodos.
 */
export async function brapiCashflow(opts: {
  symbol: string;
  period?: "annual" | "quarterly";
}): Promise<BrapiCashflowPeriod[]> {
  const upper = opts.symbol.toUpperCase().replace(/\.SA$/, "");
  const period = opts.period ?? "quarterly";
  return cached(`brapi:v2:cash-flow:${upper}:${period}`, 6 * 60 * 60, async () => {
    const params = new URLSearchParams({ symbols: upper, period });
    const t = getToken();
    if (t) params.set("token", t);
    const url = `${BRAPI_BASE}/v2/stocks/cash-flow?${params.toString()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const data = extractData(res?.results);
    if (!data || !Array.isArray(data)) return [];
    return data as unknown as BrapiCashflowPeriod[];
  });
}

/**
 * Indicadores do Tesouro Direto. `symbols` é uma lista de `tesouro-*`.
 * Cache 24h — taxas mudam 1x/dia.
 */
export async function brapiTreasuryIndicators(
  symbols: string[],
): Promise<Array<Record<string, unknown>>> {
  if (symbols.length === 0) return [];
  const norm = symbols.map((s) => s.toLowerCase());
  const key = `brapi:v2:treasury:indicators:${norm.sort().join(",")}`;
  return cached(key, 24 * 60 * 60, async () => {
    const out: Array<Record<string, unknown>> = [];
    for (const batch of chunk(norm, BATCH_LIMIT)) {
      const params = new URLSearchParams({ symbols: batch.join(",") });
      const t = getToken();
      if (t) params.set("token", t);
      const url = `${BRAPI_BASE}/v2/treasury/indicators?${params.toString()}`;
      const res = (await fetchJson(url)) as { results?: unknown[] } | null;
      for (const item of res?.results ?? []) {
        out.push(item as Record<string, unknown>);
      }
    }
    return out;
  });
}

/**
 * Histórico de indicadores do Tesouro Direto (série diária).
 * Cache 24h.
 */
// ─────────────────────────────────────────────────────────────────────────────
// brapiDividends — REMOVIDO na refatoração do B6 (2026-08-30).
// Inicialmente usado pra decompor o retorno total (ΔLucro + ΔMúltiplo +
// Dividendos), mas brapi /v2/stocks/dividends mistura formato entre
// eventos: `rate` é fração da cotação em dividendos recentes (ITUB4
// paga 0.018182/mês em 2026) e R$/share em dividendos antigos/avulsos
// (ITUB4 paga 1.86 anual em 2025). Sem candles históricos, não dá pra
// normalizar. Solução: usar `dividendYield` do stats-history (anualizado
// e normalizado pela brapi). Ver commit `feat(analysis): fix B6 — usar
// dividendYield do stats-history`.
// ─────────────────────────────────────────────────────────────────────────────

export type BrapiCashDividend = never;

export async function brapiTreasuryHistory(
  symbol: string,
): Promise<Array<Record<string, unknown>>> {
  const norm = symbol.toLowerCase();
  return cached(`brapi:v2:treasury:history:${norm}`, 24 * 60 * 60, async () => {
    const params = new URLSearchParams({ symbols: norm });
    const t = getToken();
    if (t) params.set("token", t);
    const url = `${BRAPI_BASE}/v2/treasury/indicators/history?${params.toString()}`;
    const res = (await fetchJson(url)) as { results?: unknown[] } | null;
    const first = res?.results?.[0] as Record<string, unknown> | undefined;
    if (!first) return [];
    const history = (first.history as unknown[]) ?? [];
    return history as Array<Record<string, unknown>>;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers públicos (não fazem HTTP — só normalizam ou formatam)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza um yield que pode vir em decimal (0.09) ou percentual (9.0).
 * v2 ainda é inconsistente (statistics retorna decimal, dictionary diz %).
 * Heurística: < 0.5 = decimal → ×100.
 */
export function normalizeYield(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value < 0.5 ? value * 100 : value;
}

/**
 * True quando symbol é B3 (4 letras + 1-2 dígitos).
 */
export function isBrazilianTicker(symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/\.SA$/, "");
  return /^[A-Z]{4}\d{1,2}$/.test(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Compat shims — wrappers antigos pra diff mínimo em callers legados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use `brapiQuote([symbol])` + `brapiHistorical()`.
 */
export async function getBrapiQuote(
  ticker: string,
  opts: { range?: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"; interval?: "1d" | "1wk" | "1mo" } = {},
): Promise<{ quote: BrapiQuote; candles: BrapiCandle[] } | null> {
  const upper = ticker.toUpperCase().replace(/\.SA$/, "");
  const [quoteMap, candles] = await Promise.all([
    brapiQuote([upper]),
    opts.range && opts.interval
      ? brapiHistorical(upper, opts)
      : Promise.resolve([] as BrapiCandle[]),
  ]);
  const quote = quoteMap.get(upper);
  if (!quote) return null;
  return { quote, candles };
}

/**
 * @deprecated Use `brapiQuote(symbols)`.
 */
export async function getBrapiQuotes(symbols: string[]): Promise<Map<string, BrapiQuote>> {
  return brapiQuote(symbols);
}

/**
 * @deprecated Use `brapiHistorical(symbol, { range, interval })`.
 */
export async function getBrapiCandles(
  ticker: string,
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" = "1y",
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<BrapiCandle[]> {
  return brapiHistorical(ticker, { range, interval });
}