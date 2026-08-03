import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getYahooSummary } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Sector average fundamentals.
 * Returns mean / median for key metrics across all S&P 500 stocks in a sector.
 *
 * Query: ?sector=Technology
 *
 * Cache: 24h (sector averages change rarely)
 */
export async function GET(req: NextRequest) {
  const sector = req.nextUrl.searchParams.get("sector") ?? "";
  if (!sector) {
    return NextResponse.json({ error: "sector required" }, { status: 400 });
  }

  return NextResponse.json(
    await cached(
      `sector:avg:${sector}`,
      24 * 3600,
      async () => {
        // Get symbols in this sector
        const { SP500 } = await import("@/lib/snp500");
        const all = SP500 || [];
        const symbols = all.filter((s) => s.sector === sector).slice(0, 50);
        if (symbols.length === 0) {
          return { sector, metrics: {}, count: 0 };
        }

        // Fetch summary for each (parallel)
        const summaries = (
          await Promise.all(
            symbols.map((s) => getYahooSummary(s.symbol).catch(() => null)),
          )
        ).filter((s) => s != null) as NonNullable<
          Awaited<ReturnType<typeof getYahooSummary>>
        >[];

        // Compute means for key metrics
        const metricKeys = [
          "trailingPE",
          "priceToBook",
          "priceToSales",
          "evToEBITDA",
          "profitMargin",
          "operatingMargin",
          "grossMargin",
          "roe",
          "roa",
          "earningsGrowth",
          "revenueGrowth",
          "dividendYield",
        ] as const;

        const metrics: Record<string, { mean: number; median: number; count: number }> = {};
        for (const key of metricKeys) {
          const values = summaries
            .map((s) => s[key] as number | null)
            .filter((v): v is number => typeof v === "number" && isFinite(v));
          if (values.length === 0) continue;
          values.sort((a, b) => a - b);
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const median =
            values.length % 2 === 0
              ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
              : values[(values.length - 1) / 2];
          metrics[key] = { mean, median, count: values.length };
        }

        return { sector, metrics, count: summaries.length };
      },
    ),
  );
}