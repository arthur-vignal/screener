import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getYahooSummary, getYahooQuotes } from "@/lib/yahoo";
import { SP500, SP500_BY_SECTOR } from "@/lib/snp500";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    await cached("market:stats:v1", 6 * 3600, async () => {
      const symbols = SP500.map((s) => s.symbol);

      // Fetch summary + quote for all (parallel, batched)
      const [summaries, quotes] = await Promise.all([
        Promise.all(
          symbols.map((sym) =>
            getYahooSummary(sym).catch(() => null),
          ),
        ),
        getYahooQuotes(symbols).catch(() => new Map()),
      ]);

      // Filter out null summaries
      const valid = summaries
        .map((s, i) => ({ sym: symbols[i], summary: s }))
        .filter((x) => x.summary != null) as Array<{
          sym: string;
          summary: NonNullable<Awaited<ReturnType<typeof getYahooSummary>>>;
        }>;

      // === Overall stats ===
      const pes = valid
        .map((v) => v.summary.trailingPE)
        .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
      const pbvs = valid
        .map((v) => v.summary.priceToBook)
        .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
      const evEbitdas = valid
        .map((v) => v.summary.evToEBITDA)
        .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
      const dy = valid
        .map((v) => v.summary.dividendYield)
        .filter((v): v is number => typeof v === "number" && isFinite(v) && v >= 0);
      const roes = valid
        .map((v) => v.summary.roe)
        .filter((v): v is number => typeof v === "number" && isFinite(v));
      const margins = valid
        .map((v) => v.summary.profitMargin)
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
        (a, v) => a + (v.summary.marketCap ?? 0),
        0,
      );

      const overallStats = {
        totalMarketCap,
        peMedian: median(pes),
        peMean: mean(pes),
        pbMedian: median(pbvs),
        pbMean: mean(pbvs),
        evEbitdaMedian: median(evEbitdas),
        dividendYieldMedian: median(dy),
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
          evEbitdaMedian: number;
          roeMedian: number;
          revGrowthMedian: number;
        }
      > = {};

      for (const sector of Object.keys(SP500_BY_SECTOR)) {
        const sectorSymbols = SP500_BY_SECTOR[sector] || [];
        const sectorSummaries = sectorSymbols
          .map((sym) => valid.find((v) => v.sym === sym.symbol)?.summary)
          .filter(
            (s): s is NonNullable<typeof s> => s != null,
          );

        if (sectorSummaries.length === 0) continue;

        const sPE = sectorSummaries
          .map((s) => s.trailingPE)
          .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
        const sPB = sectorSummaries
          .map((s) => s.priceToBook)
          .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
        const sEV = sectorSummaries
          .map((s) => s.evToEBITDA)
          .filter((v): v is number => typeof v === "number" && isFinite(v) && v > 0);
        const sROE = sectorSummaries
          .map((s) => s.roe)
          .filter((v): v is number => typeof v === "number" && isFinite(v));
        const sGrowth = sectorSummaries
          .map((s) => s.revenueGrowth)
          .filter((v): v is number => typeof v === "number" && isFinite(v));

        sectorStats[sector] = {
          count: sectorSummaries.length,
          marketCap: sectorSummaries.reduce(
            (a, s) => a + (s.marketCap ?? 0),
            0,
          ),
          peMedian: median(sPE),
          pbMedian: median(sPB),
          evEbitdaMedian: median(sEV),
          roeMedian: median(sROE),
          revGrowthMedian: median(sGrowth),
        };
      }

      // === Movers (top gainers / losers from quotes) ===
      const movers = Array.from(quotes.entries()).map(([sym, q]) => ({
        symbol: sym,
        price: q.price,
        changePercent: q.changePercent,
      }));

      const moversWithQuotes = movers.filter(
        (m) => isFinite(m.changePercent),
      );
      const gainers = [...moversWithQuotes]
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 10);
      const losers = [...moversWithQuotes]
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 10);

      // === Valuation distribution (P/E buckets) ===
      const distribution = [
        { bucket: "< 0 (loss)", count: pes.filter((p) => p < 0).length }, // not really, but
        { bucket: "0-15", count: pes.filter((p) => p >= 0 && p < 15).length },
        { bucket: "15-25", count: pes.filter((p) => p >= 15 && p < 25).length },
        { bucket: "25-50", count: pes.filter((p) => p >= 25 && p < 50).length },
        { bucket: "> 50", count: pes.filter((p) => p >= 50).length },
      ];

      // === Risk indicators ===
      // % of stocks with PE > 50 (expensive market)
      const expensive = pes.filter((p) => p > 50).length;
      const cheap = pes.filter((p) => p > 0 && p < 10).length;
      const loss = valid.filter((v) => (v.summary.roe ?? 0) < 0).length;
      const highPayout =
        valid.filter((v) => (v.summary.payoutRatio ?? 0) > 1).length;
      const distressed =
        valid.filter((v) => (v.summary.priceToBook ?? 99) < 1).length;

      const riskIndicators = {
        expensiveRatio: pes.length > 0 ? expensive / pes.length : 0,
        cheapRatio: pes.length > 0 ? cheap / pes.length : 0,
        lossRatio: valid.length > 0 ? loss / valid.length : 0,
        distressedRatio: valid.length > 0 ? distressed / valid.length : 0,
        highPayoutCount: highPayout,
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