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
    // BR path: bucket IBOV tickers by sector, sample 5 per sector, fetch
    // quotes via Brapi, and aggregate change%.
    const sectors = new Map<string, { count: number; symbols: string[] }>();
    for (const e of IBOV) {
      const s = e.sector;
      if (!sectors.has(s)) sectors.set(s, { count: 0, symbols: [] });
      const cur = sectors.get(s)!;
      cur.count++;
      cur.symbols.push(e.symbol);
    }
    const sampleSymbols: string[] = [];
    for (const { symbols } of sectors.values()) {
      sampleSymbols.push(...symbols.slice(0, 5));
    }
    // Fetch Brapi quotes for the sample to compute real avgChange.
    const { getBrapiQuoteBatch } = await import("@/lib/brapi-quote-batch");
    const brapiMap = await getBrapiQuoteBatch(sampleSymbols);

    const sectorsOut = IBOV_SECTORS.map((s) => {
      const cur = sectors.get(s);
      if (!cur) {
        return {
          sector: s,
          count: 0,
          avgChange: 0,
          gainers: 0,
          losers: 0,
          volume: 0,
          topMovers: [] as { symbol: string; changePercent: number }[],
        };
      }
      const changes: number[] = [];
      const movers: { symbol: string; changePercent: number }[] = [];
      let gains = 0;
      let losses = 0;
      for (const sym of cur.symbols.slice(0, 5)) {
        const b = brapiMap.get(sym.toUpperCase());
        const cp = b?.quote?.changePercent;
        if (cp != null) {
          changes.push(cp);
          if (cp >= 0) gains++;
          else losses++;
          movers.push({ symbol: sym, changePercent: cp });
        }
      }
      movers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      return {
        sector: s,
        count: cur.count,
        avgChange: changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0,
        gainers: gains,
        losers: losses,
        volume: 0,
        topMovers: movers.slice(0, 3),
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
