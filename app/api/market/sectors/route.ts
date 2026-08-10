import { NextRequest, NextResponse } from "next/server";
import { SP500 } from "@/lib/snp500";
import { getAssetQuotes } from "@/lib/assets";
import { IBOV, IBOV_SECTORS } from "@/lib/ibovespa";
import { B3_LIST } from "@/lib/b3-list";
import { isBrazilianTicker } from "@/lib/brapi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type SectorAgg = {
  sector: string;
  count: number;
  avgChange: number;
  gainers: number;
  losers: number;
  volume: number;
  topMovers: { symbol: string; changePercent: number }[];
};

export async function GET(req: NextRequest) {
  const marketRaw = req.nextUrl.searchParams.get("market") ?? "us";
  const isBr = marketRaw === "br";

  if (isBr) {
    // BR path: IBOV entries have sector; B3-only entries get sector
    // classification via Brapi (best-effort). For aggregation purposes, we
    // bucket by sector from IBOV list. B3-only tickers fall into "—" sector
    // and are skipped from sector breakdown (they still show up in the
    // overall market view).
    const ibovBySymbol = new Map(IBOV.map((e) => [e.symbol, e.sector]));
    const sectors = new Map<string, { count: number; symbols: string[] }>();
    for (const e of IBOV) {
      const s = e.sector;
      if (!sectors.has(s)) sectors.set(s, { count: 0, symbols: [] });
      const cur = sectors.get(s)!;
      cur.count++;
      cur.symbols.push(e.symbol);
    }
    // Sample 5 tickers per IBOV sector (matches the US version's breadth)
    const sampleSymbols: string[] = [];
    for (const { symbols } of sectors.values()) {
      sampleSymbols.push(...symbols.slice(0, 5));
    }
    // Skip quotes for now (avoids Brapi rate limits); sector ribbon will
    // show 0% for BR — that's fine as a placeholder until we wire a
    // Brapi sector-aggregator endpoint. The market table on the dashboard
    // is the source of truth for BR price action.
    const sectorsOut = IBOV_SECTORS.map((s) => {
      const cur = sectors.get(s);
      return {
        sector: s,
        count: cur?.count ?? 0,
        avgChange: 0,
        gainers: 0,
        losers: 0,
        volume: 0,
        topMovers: [] as { symbol: string; changePercent: number }[],
      };
    });
    return NextResponse.json({ sectors: sectorsOut });
  }

  // Sample S&P 500 (top 100 by market cap would be ideal; we use all for breadth)
  const symbols = SP500.map((e) => e.symbol);
  const quoteMap = await getAssetQuotes(symbols);

  const bySector = new Map<string, { changes: number[]; gains: number; losses: number; volume: number; movers: { symbol: string; changePercent: number }[] }>();

  for (const entry of SP500) {
    const q = quoteMap.get(entry.symbol);
    if (!q || q.changePercent == null) continue;
    const sector = entry.sector;
    if (!bySector.has(sector)) {
      bySector.set(sector, { changes: [], gains: 0, losses: 0, volume: 0, movers: [] });
    }
    const bucket = bySector.get(sector)!;
    bucket.changes.push(q.changePercent);
    if (q.changePercent > 0) bucket.gains++;
    else if (q.changePercent < 0) bucket.losses++;
    bucket.volume += q.volume ?? 0;
    bucket.movers.push({ symbol: entry.symbol, changePercent: q.changePercent });
  }

  const result: SectorAgg[] = [];
  for (const [sector, data] of bySector.entries()) {
    const avg = data.changes.reduce((a, b) => a + b, 0) / data.changes.length;
    const topMovers = data.movers
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3);
    result.push({
      sector,
      count: data.changes.length,
      avgChange: avg,
      gainers: data.gains,
      losers: data.losses,
      volume: data.volume,
      topMovers,
    });
  }

  // Sort by avgChange desc to show leaders first
  result.sort((a, b) => b.avgChange - a.avgChange);

  return NextResponse.json({ sectors: result, timestamp: Date.now() });
}
