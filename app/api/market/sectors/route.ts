import { NextRequest, NextResponse } from "next/server";
import { SP500 } from "@/lib/snp500";
import { getAssetQuotes } from "@/lib/assets";

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

export async function GET(_req: NextRequest) {
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
