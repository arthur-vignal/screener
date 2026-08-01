/**
 * Universal asset search across stocks, ETFs, and crypto.
 * Uses Yahoo Finance for everything (single source of truth, free).
 */

import { cached } from "./cache";

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

/**
 * Quote for any asset type (stock, ETF, crypto).
 * ETFs and stocks use /v8/finance/chart (free).
 * Cryptos use the same endpoint with the "BTC-USD" format.
 */
export async function getAssetQuote(symbol: string) {
  const formatted = symbol.toUpperCase();
  return cached(`yahoo:quote:${formatted}`, 60, async () => {
    const r = await fetchYahoo("/v8/finance/chart/" + encodeURIComponent(formatted), {
      range: "1d",
      interval: "1d",
    });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      chart?: {
        result?: Array<{
          meta: {
            regularMarketPrice?: number;
            currency?: string;
            symbol?: string;
            chartPreviousClose?: number;
          };
          timestamp: number[];
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
    };
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const last = result.timestamp.length - 1;
    const q = result.indicators.quote[0];
    const price = meta.regularMarketPrice ?? q.close[last] ?? 0;
    const prevClose = q.close[last - 1] ?? meta.chartPreviousClose ?? price;
    return {
      symbol: meta.symbol ?? formatted,
      price,
      change: price - prevClose,
      changePercent: prevClose === 0 ? 0 : ((price - prevClose) / prevClose) * 100,
      currency: meta.currency ?? "USD",
      dayHigh: q.high[last] ?? 0,
      dayLow: q.low[last] ?? 0,
      dayOpen: q.open[last] ?? 0,
      prevClose,
      volume: q.volume[last] ?? 0,
    };
  });
}

/**
 * Search assets by symbol prefix or name substring.
 * Returns ranked list (symbol exact > symbol prefix > name match).
 */
export function searchAssets(query: string, types?: AssetType[]): AssetSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const all: AssetSummary[] = [];
  if (!types || types.includes("stock")) {
    for (const s of STOCKS) all.push({ symbol: s, name: s, type: "stock" });
  }
  if (!types || types.includes("etf")) {
    for (const s of ETFS) all.push({ symbol: s, name: s, type: "etf" });
  }
  if (!types || types.includes("crypto")) {
    for (const s of CRYPTOS) all.push({
      symbol: s.replace("-USD", ""),
      name: s.replace("-USD", ""),
      type: "crypto",
    });
  }

  const exact = all.filter((a) => a.symbol.toLowerCase() === q);
  const prefix = all.filter(
    (a) => a.symbol.toLowerCase().startsWith(q) && a.symbol.toLowerCase() !== q,
  );
  const substring = all.filter(
    (a) =>
      !a.symbol.toLowerCase().startsWith(q) &&
      (a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)),
  );

  return [...exact, ...prefix, ...substring].slice(0, 20);
}

/**
 * Get sectors for filter. Yahoo returns industry per symbol; we cache.
 */
export type Sector = {
  symbol: string;
  industry: string;
};

const SECTOR_KEY = "yahoo:sectors:batch";

export async function getSectorsFor(symbols: string[]): Promise<Map<string, string>> {
  const sortedKey = symbols.slice().sort().join(",");
  return cached(SECTOR_KEY + ":" + sortedKey, 24 * 3600, async () => {
    const map = new Map<string, string>();
    if (symbols.length === 0) return map;
    // Fetch summary in batch via /v7/finance/quote (no auth required for basic fields)
    // but we need industry — fetch via /v10/finance/quoteSummary? No, that's auth.
    // Use /v8/finance/chart and look up via a hardcoded map for common tickers.
    const knownIndustries: Record<string, string> = {
      AAPL: "Technology", MSFT: "Technology", GOOGL: "Media", AMZN: "Retail",
      NVDA: "Semiconductors", META: "Media", TSLA: "Automobiles",
      JPM: "Banking", BAC: "Banking", GS: "Banking", MS: "Banking",
      XOM: "Energy", CVX: "Energy", COP: "Energy",
      UNH: "Healthcare", JNJ: "Healthcare", LLY: "Pharmaceuticals",
      PFE: "Pharmaceuticals", ABBV: "Pharmaceuticals",
      WMT: "Retail", HD: "Retail", NKE: "Apparel", MCD: "Restaurants",
      KO: "Beverages", PEP: "Beverages",
      DIS: "Media", NFLX: "Media",
      V: "Financial Services", MA: "Financial Services",
      COST: "Retail", SBUX: "Restaurants",
      BA: "Aerospace", CAT: "Machinery", GE: "Industrials",
      F: "Automobiles", GM: "Automobiles",
      BTC: "Cryptocurrency", ETH: "Cryptocurrency",
      // ETFs
      SPY: "ETF", VOO: "ETF", QQQ: "ETF", VTI: "ETF",
      IVV: "ETF", VEA: "ETF", VTV: "ETF", IEFA: "ETF",
      VWO: "ETF", IEMG: "ETF", IJR: "ETF", VUG: "ETF", IWF: "ETF",
      BNDX: "ETF", IWM: "ETF", VIG: "ETF", IJH: "ETF", VGT: "ETF",
      VXUS: "ETF", ITOT: "ETF", SCHB: "ETF", EFA: "ETF", VB: "ETF",
      SCHD: "ETF", VV: "ETF", TLT: "ETF", BIV: "ETF", GLD: "ETF",
      VO: "ETF", IVE: "ETF", QUAL: "ETF", DIA: "ETF", VYM: "ETF",
      MGV: "ETF", SCHF: "ETF", MBB: "ETF", TIP: "ETF", IEI: "ETF",
      SHY: "ETF", BSV: "ETF",
    };
    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      if (knownIndustries[upper]) {
        map.set(upper, knownIndustries[upper]);
      } else {
        map.set(upper, "—");
      }
    }
    return map;
  });
}
