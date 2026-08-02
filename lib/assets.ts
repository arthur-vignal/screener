/**
 * Universal asset search across stocks, ETFs, and crypto.
 * Uses Yahoo Finance for everything (single source of truth, free).
 */

import { cached } from "./cache";
import { SP500 } from "./snp500";

// Build sector map: S&P 500 (authoritative) + ETF/Crypto by type
import { getCompanyName } from "./asset-names";

export type AssetType = "stock" | "etf" | "crypto";
export type AssetSummary = {
  symbol: string;
  name: string;
  type: AssetType;
  exchange?: string;
  sector?: string;
};

const BASE = "https://query2.finance.yahoo.com";

async function fetchYahoo(path: string, params: Record<string, string>): Promise<Response> {
  const qs = new URLSearchParams(params).toString();
  return fetch(`${BASE}${path}?${qs}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
}

/**
 * Curated lists. Live "universal search" would need a premium API.
 * We expose a curated set of ~150 stocks + 30 ETFs + 50 cryptos.
 */
const STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  "AVGO", "ORCL", "CRM", "AMD", "INTC", "CSCO", "ADBE", "NFLX",
  "JPM", "BAC", "WFC", "GS", "MS", "BLK", "AXP", "C",
  "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "DHR",
  "WMT", "PG", "KO", "PEP", "MCD", "NKE", "SBUX", "TGT", "COST", "HD",
  "BA", "CAT", "GE", "HON", "UPS", "RTX", "LMT", "DE",
  "XOM", "CVX", "COP", "SLB", "EOG", "OXY",
  "F", "GM", "TM", "STLA", "RIVN",
  "T", "VZ", "TMUS", "CMCSA",
  "AMT", "PLD", "CCI",
  "NEE", "DUK", "SO",
  "LIN", "APD", "ECL",
  "PM", "MO", "CL", "EL",
  "MAR", "HLT", "BKNG",
  "COIN", "MSTR", "PLTR", "SNOW", "CRWD", "NET", "PANW", "ZS",
  "ABNB", "DASH", "UBER", "LYFT", "PYPL", "SHOP", "SPOT",
  "GME", "AMC", "BB", "NOK",
  "TLRY", "ACB", "CGC",
  "FUBO", "RBLX",
  "DDOG", "MDB", "TEAM", "ADSK", "DOCU", "ZM",
  "VWO", "IEFA", "EFA", "IEMG", "AGG", "BND", "LQD", "HYG",
];

const ETFS = [
  "SPY", "VOO", "IVV", "VTI", "QQQ", "VEA", "VTV", "IEFA",
  "VWO", "IEMG", "IJR", "VUG", "IWF", "BNDX", "IWM", "VIG",
  "IJH", "VGT", "VXUS", "ITOT", "SCHB", "EFA", "VB", "SCHD",
  "VV", "TLT", "BIV", "GLD", "VO", "IVE", "QUAL", "DIA",
  "VYM", "MGV", "SCHF", "MBB", "TIP", "IEI", "SHY", "BSV",
];

const CRYPTOS = [
  "BTC-USD", "ETH-USD", "USDT-USD", "BNB-USD", "SOL-USD", "XRP-USD",
  "USDC-USD", "ADA-USD", "AVAX-USD", "DOGE-USD", "TRX-USD", "LINK-USD",
  "DOT-USD", "MATIC-USD", "SHIB-USD", "LTC-USD", "BCH-USD", "NEAR-USD",
  "ATOM-USD", "UNI-USD", "XLM-USD", "ICP-USD", "APT-USD", "FIL-USD",
  "ARB-USD", "QNT-USD", "AAVE-USD", "GRT-USD", "ALGO-USD", "SAND-USD",
  "AXS-USD", "MANA-USD", "FTM-USD", "FLOW-USD", "EGLD-USD", "CHZ-USD",
  "CRV-USD", "ENJ-USD", "ZEC-USD", "DASH-USD", "BAT-USD", "ZRX-USD",
  "FET-USD", "RPL-USD", "GRT-USD", "LDO-USD", "ARB-USD", "OP-USD",
  "MNT-USD", "RNDR-USD", "TIA-USD", "SEI-USD", "PYTH-USD",
];

const TYPE_BY_SYMBOL = new Map<string, AssetType>();
for (const s of STOCKS) TYPE_BY_SYMBOL.set(s, "stock");
for (const s of ETFS) TYPE_BY_SYMBOL.set(s, "etf");
for (const s of CRYPTOS) TYPE_BY_SYMBOL.set(s, "crypto");

export function getAllSymbols(): string[] {
  return [...STOCKS, ...ETFS, ...CRYPTOS];
}

export function getAssetType(symbol: string): AssetType {
  return TYPE_BY_SYMBOL.get(symbol.toUpperCase()) ?? "stock";
}

export function searchAssets(query: string, types?: AssetType[]): AssetSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all: AssetSummary[] = [];
  for (const sym of getAllSymbols()) {
    const upper = sym.toUpperCase();
    const t = TYPE_BY_SYMBOL.get(upper) ?? "stock";
    if (types && types.length > 0 && !types.includes(t)) continue;
    all.push({
      symbol: upper,
      name: getCompanyName(upper) || sym,
      type: t,
      sector: SECTOR_BY_SYMBOL.get(upper) ?? "",
    });
  }
  const score = (a: AssetSummary): number => {
    const sym = a.symbol.toLowerCase();
    const name = a.name.toLowerCase();
    if (sym === q) return 100;
    if (sym.startsWith(q)) return 80;
    if (sym.includes(q)) return 60;
    if (name.startsWith(q)) return 40;
    if (name.includes(q)) return 20;
    return 0;
  };
  return all
    .map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a);
}

/**
 * Quote for any asset type (stock, ETF, crypto).
 * ETFs and stocks use /v8/finance/chart (free).
 * Cryptos use the same endpoint with the "BTC-USD" format.
 */
export 
type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  prevClose: number;
  volume: number;
};

type SparkResult = {
  symbol: string;
  response: Array<{
    meta: {
      currency?: string;
      symbol?: string;
      regularMarketPrice?: number;
      chartPreviousClose?: number;
      regularMarketDayHigh?: number;
      regularMarketDayLow?: number;
      regularMarketVolume?: number;
    };
    indicators: {
      quote: Array<{
        open: number[];
        high: number[];
        low: number[];
        close: number[];
        volume: number[];
      }>;
    };
  }>;
};

type SparkResponse = {
  spark: {
    result: SparkResult[];
    error: unknown | null;
  };
};

/**
 * Batch fetch quotes using Yahoo Spark endpoint.
 * Returns a Map of symbol -> Quote. Uses a single HTTP request regardless of N symbols.
 */
async function getQuotesBatch(symbols: string[]): Promise<Map<string, Quote | null>> {
  if (symbols.length === 0) return new Map();
  const formatted = symbols.map((s) => s.toUpperCase());
  return cached(`yahoo:spark:${formatted.slice().sort().join(",")}`, 60, async () => {
    try {
      const qs = new URLSearchParams({ symbols: formatted.join(","), range: "1d", interval: "1d" });
      const r = await fetch(`${BASE.replace("query2", "query1")}/v7/finance/spark?${qs}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) {
        const map = new Map<string, Quote | null>();
        formatted.forEach((s) => map.set(s, null));
        return map;
      }
      const data = (await r.json()) as SparkResponse;
      const map = new Map<string, Quote | null>();
      for (const sym of formatted) map.set(sym, null);
      for (const item of data.spark?.result ?? []) {
        const r0 = item.response?.[0];
        if (!r0) continue;
        const meta = r0.meta;
        const q = r0.indicators.quote[0];
        if (!q || q.close.length === 0) continue;
        const last = q.close.length - 1;
        const price = meta.regularMarketPrice ?? q.close[last] ?? 0;
        const prevClose = q.close[last - 1] ?? meta.chartPreviousClose ?? price;
        const quote: Quote = {
          symbol: item.symbol,
          price,
          change: price - prevClose,
          changePercent: prevClose === 0 ? 0 : ((price - prevClose) / prevClose) * 100,
          currency: meta.currency ?? "USD",
          dayHigh: meta.regularMarketDayHigh ?? q.high[last] ?? 0,
          dayLow: meta.regularMarketDayLow ?? q.low[last] ?? 0,
          dayOpen: q.open[last] ?? 0,
          prevClose,
          volume: meta.regularMarketVolume ?? q.volume[last] ?? 0,
        };
        map.set(item.symbol.toUpperCase(), quote);
      }
      return map;
    } catch {
      const map = new Map<string, Quote | null>();
      formatted.forEach((s) => map.set(s, null));
      return map;
    }
  });
}

/**
 * Single-symbol quote. Used internally for other endpoints.
 */
export async function getAssetQuote(symbol: string): Promise<Quote | null> {
  const upper = symbol.toUpperCase();
  const map = await getQuotesBatch([upper]);
  return map.get(upper) ?? null;
}

/**
 * Batch quote for multiple symbols. ONE HTTP request.
 */
export async function getAssetQuotes(symbols: string[]): Promise<Map<string, Quote | null>> {
  return getQuotesBatch(symbols);
}

/**
 * Get sectors for filter. Yahoo returns industry per symbol; we cache.
 */
export type Sector = {
  symbol: string;
  industry: string;
};

const SECTOR_BY_SYMBOL = new Map<string, string>();
for (const e of SP500) {
  SECTOR_BY_SYMBOL.set(e.symbol, e.sector);
}
for (const sym of ETFS) {
  if (!SECTOR_BY_SYMBOL.has(sym)) SECTOR_BY_SYMBOL.set(sym, "ETF");
}
for (const sym of CRYPTOS) {
  if (!SECTOR_BY_SYMBOL.has(sym)) SECTOR_BY_SYMBOL.set(sym, "Cryptocurrency");
}

const SECTOR_KEY = "yahoo:sectors:batch";

export async function getSectorsFor(symbols: string[]): Promise<Map<string, string>> {
  const sortedKey = symbols.slice().sort().join(",");
  return cached(SECTOR_KEY + ":" + sortedKey, 24 * 3600, async () => {
    const map = new Map<string, string>();
    if (symbols.length === 0) return map;
    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      const sector = SECTOR_BY_SYMBOL.get(upper);
      if (sector) {
        map.set(upper, sector);
      } else {
        // Fallback by type
        const hasDash = upper.includes("-");
        if (hasDash) map.set(upper, "Cryptocurrency");
        else if (upper.length <= 5) map.set(upper, "ETF");
        else map.set(upper, "—");
      }
    }
    return map;
  });
}
