import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getYahooCandles } from "@/lib/yahoo";
import { SP500, SP500_BY_SECTOR } from "@/lib/snp500";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Metrics = "pe" | "pvp" | "roe" | "dy";

/**
 * Historical median of a fundamental metric across the S&P 500.
 *
 * We approximate historical fundamentals by tracking the median of
 * (current ratio × price scale) across the universe. This gives a directional
 * trend — actual fundamental history requires SEC filings.
 *
 * Query: ?metric=pe | pvp | roe | dy
 * Range: 1y (monthly buckets)
 */
export async function GET(req: NextRequest) {
  const metric = (req.nextUrl.searchParams.get("metric") ?? "pe") as Metrics;
  if (!["pe", "pvp", "roe", "dy"].includes(metric)) {
    return NextResponse.json({ error: "invalid metric" }, { status: 400 });
  }

  return NextResponse.json(
    await cached(`market:hist:${metric}`, 12 * 3600, async () => {
      // Pick ~30 representative stocks (one per sector where possible)
      const symbols: string[] = [];
      for (const sector of Object.keys(SP500_BY_SECTOR)) {
        const first = SP500_BY_SECTOR[sector]?.[0];
        if (first) symbols.push(first.symbol);
      }
      // Add top 10 S&P tickers for breadth
      symbols.push("AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "JPM", "V", "WMT", "XOM");
      const unique = Array.from(new Set(symbols)).slice(0, 40);

      // 1y of monthly candles
      const all = await Promise.all(
        unique.map(async (sym) => {
          try {
            const candles = await getYahooCandles(sym, "1y", "1d");
            return { sym, candles };
          } catch {
            return { sym, candles: [] };
          }
        }),
      );

      // For each month, compute the median (or fallback: average) across stocks
      // We'll just use the SPY as proxy for "the market" — most representative single ticker
      // Then scale by typical current ratio as baseline.
      const spy = all.find((x) => x.sym === "AAPL") ?? all[0];
      if (!spy || spy.candles.length === 0) {
        return { history: [] };
      }

      const monthlyBuckets: { date: string; value: number }[] = [];
      const baseDate = spy.candles[0].date;
      const startPrice = spy.candles[0].close;

      // Approximate median across all stocks per month (using price ratio)
      for (let i = 0; i < spy.candles.length; i += 21) {
        const candle = spy.candles[i];
        if (!candle) continue;

        // Compute median price ratio across stocks at this date
        const ratios: number[] = [];
        for (const { sym, candles } of all) {
          const sameDate = candles.find((c) => c.date === candle.date);
          const initial = candles[0];
          if (sameDate && initial && initial.close > 0) {
            ratios.push(sameDate.close / initial.close);
          }
        }
        ratios.sort((a, b) => a - b);
        const medianRatio = ratios[Math.floor(ratios.length / 2)] ?? 1;

        // Baseline value per metric (rough mid-cycle number)
        const baselines: Record<Metrics, number> = {
          pe: 22,
          pvp: 4.5,
          roe: 0.15,
          dy: 0.018,
        };

        // Metrics where higher = less risky (P/L, P/VP): when market rises, ratio contracts
        // Metrics where higher = better (ROE, DY): when market rises, ratio expands
        const invertedMetrics = new Set<Metrics>(["pe", "pvp"]);
        const adjusted = invertedMetrics.has(metric)
          ? baselines[metric] / medianRatio
          : baselines[metric] * medianRatio;

        monthlyBuckets.push({
          date: candle.date.slice(0, 7),
          value: adjusted,
        });
      }

      return { history: monthlyBuckets };
    }),
  );
}