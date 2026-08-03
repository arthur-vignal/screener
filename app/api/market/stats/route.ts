import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getFundamentalsBatch } from "@/lib/fundamentals";
import { SP500, SP500_BY_SECTOR } from "@/lib/snp500";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Aggregate market statistics, CoinMarketCap-style.
 * Returns:
 *  - totalStats: overall market (market cap, P/E median, P/VP median)
 *  - sectorBreakdown: per-sector averages
 *  - movers: top gainers / losers
 *  - valuationDistribution: buckets of P/E
 *  - riskIndicators: % of stocks above 200d MA, etc
 */
export async function GET() {
  return NextResponse.json(
    await cached("market:stats:v2", 6 * 3600, async () => {
      const symbols = SP500.map((s) => s.symbol);

      // Fetch fundamentals (Yahoo + SEC) for all S&P 500 — batched
      const fundMap = await getFundamentalsBatch(symbols);

      // Build a flat list with sector info
      const rows = symbols.map((sym) => {
        const f = fundMap.get(sym);
        const sector = SP500.find((s) => s.symbol === sym)?.sector ?? "Other";
        return {
          sym,
          sector,
          f,
        };
      });

      // Filter out those without fundamentals
      const valid = rows.filter((r) => r.f != null);

      // === Overall stats ===
      const pes = valid
        .map((v) => v.f!.pe)
        .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
      const pbvs = valid
        .map((v) => v.f!.pb)
        .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
      const evEbitdas = valid
        .map((v) => v.f!.ps)
        .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
      const dy = valid
        .map((v) => v.f!.marketCap)
        .filter((v): v is number => typeof v === "number" && isFinite(v));
      const roes = valid
        .map((v) => v.f!.roe)
        .filter((v): v is number => typeof v === "number" && isFinite(v));
      const margins = valid
        .map((v) => v.f!.netMargin)
        .filter((v): v is number => typeof v === "number" && isFinite(v));

      const median = (arr: number[]): number => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      };
      const mean = (arr: number[]): number =>
        arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

      const totalMarketCap = valid.reduce(
        (a, v) => a + (v.f!.marketCap ?? 0),
        0,
      );

      const overallStats = {
        totalMarketCap,
        peMedian: median(pes),
        peMean: mean(pes),
        pbMedian: median(pbvs),
        pbMean: mean(pbvs),
        evEbitdaMedian: median(evEbitdas),
        marketCapMedian: median(dy),
        roeMedian: median(roes),
        profitMarginMedian: median(margins),
        coverage: valid.length,
      };

      // === Sector breakdown ===
      const sectorStats: Record<
        string,
        {
          count: number;
          marketCap: number;
          peMedian: number;
          pbMedian: number;
          psMedian: number;
          roeMedian: number;
          netMarginMedian: number;
        }
      > = {};

      for (const sector of Object.keys(SP500_BY_SECTOR)) {
        const sectorSymbols = SP500_BY_SECTOR[sector] || [];
        const sectorRows = sectorSymbols
          .map((s) => valid.find((r) => r.sym === s.symbol)?.f)
          .filter((f): f is NonNullable<typeof f> => f != null);

        if (sectorRows.length === 0) continue;

        const sPE = sectorRows
          .map((f) => f.pe)
          .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
        const sPB = sectorRows
          .map((f) => f.pb)
          .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
        const sPS = sectorRows
          .map((f) => f.ps)
          .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
        const sROE = sectorRows
          .map((f) => f.roe)
          .filter((v): v is number => typeof v === "number" && isFinite(v));
        const sMargin = sectorRows
          .map((f) => f.netMargin)
          .filter((v): v is number => typeof v === "number" && isFinite(v));

        sectorStats[sector] = {
          count: sectorRows.length,
          marketCap: sectorRows.reduce((a, f) => a + (f.marketCap ?? 0), 0),
          peMedian: median(sPE),
          pbMedian: median(sPB),
          psMedian: median(sPS),
          roeMedian: median(sROE),
          netMarginMedian: median(sMargin),
        };
      }

      // === Movers (top gainers / losers) ===
      const movers = valid
        .filter((r) => r.f!.changePercent != null && isFinite(r.f!.changePercent!))
        .map((r) => ({
          symbol: r.sym,
          price: r.f!.price,
          changePercent: r.f!.changePercent!,
        }));

      const gainers = [...movers]
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 10);
      const losers = [...movers]
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 10);

      // === Valuation distribution (P/E buckets) ===
      const distribution = [
        { bucket: "< 0 (loss)", count: pes.filter((p) => p < 0).length },
        { bucket: "0-15", count: pes.filter((p) => p >= 0 && p < 15).length },
        { bucket: "15-25", count: pes.filter((p) => p >= 15 && p < 25).length },
        { bucket: "25-50", count: pes.filter((p) => p >= 25 && p < 50).length },
        { bucket: "> 50", count: pes.filter((p) => p >= 50).length },
      ];

      // === Risk indicators ===
      const expensive = pes.filter((p) => p > 50).length;
      const cheap = pes.filter((p) => p > 0 && p < 10).length;
      const loss = valid.filter((v) => (v.f!.roe ?? 0) < 0).length;
      const distressed =
        valid.filter((v) => (v.f!.pb ?? 99) < 1).length;

      const riskIndicators = {
        expensiveRatio: pes.length > 0 ? expensive / pes.length : 0,
        cheapRatio: pes.length > 0 ? cheap / pes.length : 0,
        lossRatio: valid.length > 0 ? loss / valid.length : 0,
        distressedRatio: valid.length > 0 ? distressed / valid.length : 0,
      };

      return {
        overall: overallStats,
        sectors: sectorStats,
        gainers,
        losers,
        distribution,
        risk: riskIndicators,
        generatedAt: Date.now(),
      };
    }),
  );
}
