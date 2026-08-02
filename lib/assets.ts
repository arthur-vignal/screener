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
 * Search assets by symbol prefix OR company name.
 * Returns ranked list:
 *   1. exact symbol match
 *   2. symbol starts with query
 *   3. symbol contains query
 *   4. company name starts with query
 *   5. company name contains query
 */
export function searchAssets(query: string, types?: AssetType[]): AssetSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const all: AssetSummary[] = [];
  const addToList = (symbol: string, type: AssetType) => {
    all.push({
      symbol: type === "crypto" ? symbol.replace("-USD", "") : symbol,
      name: getCompanyName(symbol),
      type,
    });
  };

  if (!types || types.includes("stock")) for (const s of STOCKS) addToList(s, "stock");
  if (!types || types.includes("etf")) for (const s of ETFS) addToList(s, "etf");
  if (!types || types.includes("crypto")) for (const s of CRYPTOS) addToList(s, "crypto");

  const exactSym = all.filter((a) => a.symbol.toLowerCase() === q);
  const prefixSym = all.filter(
    (a) => a.symbol.toLowerCase().startsWith(q) && a.symbol.toLowerCase() !== q,
  );
  const containsSym = all.filter(
    (a) =>
      !a.symbol.toLowerCase().startsWith(q) && a.symbol.toLowerCase().includes(q),
  );
  const prefixName = all.filter(
    (a) =>
      !a.symbol.toLowerCase().includes(q) && a.name.toLowerCase().startsWith(q),
  );
  const containsName = all.filter(
    (a) =>
      !a.symbol.toLowerCase().includes(q) &&
      !a.name.toLowerCase().startsWith(q) &&
      a.name.toLowerCase().includes(q),
  );

  // Multi-word: split query into terms, all must match somewhere
  const terms = q.split(/\s+/).filter(Boolean);
  const multiWord = terms.length > 1
    ? all.filter((a) => {
        const haystack = `${a.symbol} ${a.name}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      })
    : [];

  // Combine ranked, dedupe by symbol
  const seen = new Set<string>();
  const ranked = [...exactSym, ...prefixSym, ...containsSym, ...prefixName, ...containsName, ...multiWord];
  const out: AssetSummary[] = [];
  for (const r of ranked) {
    const key = `${r.symbol}-${r.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= 20) break;
  }
  return out;
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
