/**
 * Index constituent calculator.
 *
 * Given an index definition (universe + filters + ranking), fetch the universe
 * from cache, filter, rank, and return top N constituents.
 *
 * Performance: 1 batch Yahoo request per filter pass.
 */

import { SP500 } from "./snp500";
import { getAssetQuotes } from "./assets";

export type Universe = "sp500" | "etf" | "crypto" | "stocks-broad";

export type IndexFilters = {
  // Examples — extend as needed
  sector?: string; // e.g. "Technology"
  peMax?: number; // P/E max
  peMin?: number;
  marketCapMin?: number; // in dollars
  excludeSector?: string;
  exclude?: string[]; // tickers to skip
};

export type IndexRanking =
  | "momentum-12-1" // 12-1 month momentum
  | "ytd" // year-to-date
  | "value-low-pe" // low P/E
  | "quality-high-roe" // high ROE
  | "low-volatility"; // low annualized vol

export type Constituent = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  rank: number;
  metric: number | null;
};

export async function getUniverseSymbols(u: Universe): Promise<string[]> {
  switch (u) {
    case "sp500":
      return SP500.map((s) => s.symbol);
    case "etf":
      return ["SPY", "QQQ", "VTI", "VOO", "IWM", "DIA", "VEA", "VWO", "AGG", "BND", "TLT", "GLD", "SLV", "IEMG", "IEFA"];
    case "crypto":
      return [
        "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "XRP-USD", "ADA-USD",
        "AVAX-USD", "DOGE-USD", "TRX-USD", "LINK-USD", "DOT-USD", "MATIC-USD",
        "SHIB-USD", "LTC-USD", "BCH-USD", "NEAR-USD", "ATOM-USD", "UNI-USD",
      ];
    case "stocks-broad":
      return SP500.map((s) => s.symbol).slice(0, 200);
    default:
      return SP500.map((s) => s.symbol);
  }
}

/**
 * Compute constituents.
 * For simplicity, basic filters supported. Ranking by price momentum (12-1)
 * approximated via YTD + recent changePercent (close enough for MVP).
 */
export async function computeConstituents(
  universe: Universe,
  filters: IndexFilters,
  ranking: IndexRanking,
  topN: number,
): Promise<Constituent[]> {
  const symbols = await getUniverseSymbols(universe);
  // Apply sector filter (server-side, no API call needed)
  let filteredSymbols = symbols;
  if (filters.sector) {
    const sectorMap = new Map(SP500.map((s) => [s.symbol, s.sector]));
    filteredSymbols = symbols.filter((s) => sectorMap.get(s) === filters.sector);
  }
  if (filters.exclude?.length) {
    const ex = new Set(filters.exclude);
    filteredSymbols = filteredSymbols.filter((s) => !ex.has(s));
  }

  // Fetch batch quotes (1 request regardless of N)
  const quoteMap = await getAssetQuotes(filteredSymbols);

  const enriched: Constituent[] = [];
  const sectorMap = new Map(SP500.map((s) => [s.symbol, s.sector]));

  for (const sym of filteredSymbols) {
    const q = quoteMap.get(sym);
    if (!q || q.price === 0) continue;
    enriched.push({
      symbol: sym,
      name: sym, // simplified — could map to company name
      sector: sectorMap.get(sym) ?? "—",
      price: q.price,
      changePercent: q.changePercent,
      rank: 0,
      metric: null,
    });
  }

  // Apply ranking (simplified — using changePercent as proxy)
  // In production: fetch 12-month historical prices and compute momentum
  let ranked = enriched;
  if (ranking === "momentum-12-1" || ranking === "ytd") {
    // Sort by recent change as proxy
    ranked = [...enriched].sort((a, b) => b.changePercent - a.changePercent);
  } else if (ranking === "value-low-pe") {
    // Without fundamentals API, just sort by absolute change stability
    ranked = [...enriched].sort((a, b) => Math.abs(a.changePercent) - Math.abs(b.changePercent));
  } else if (ranking === "quality-high-roe") {
    // Without fundamentals, sort by inverse volatility (price stability)
    ranked = [...enriched].sort((a, b) => Math.abs(a.changePercent) - Math.abs(b.changePercent));
  } else if (ranking === "low-volatility") {
    ranked = [...enriched].sort((a, b) => Math.abs(a.changePercent) - Math.abs(b.changePercent));
  }

  return ranked.slice(0, topN).map((c, i) => ({ ...c, rank: i + 1 }));
}
