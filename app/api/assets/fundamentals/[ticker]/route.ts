import { NextRequest, NextResponse } from "next/server";
import { getYahooSummary, getYahooCandles } from "@/lib/yahoo";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Detailed fundamentals for an asset, suitable for the rich portfolio table.
 * Returns:
 *  - current: YahooSummary (current snapshot of fundamentals)
 *  - sparklines: { metric: { date, value }[] } for in-line charts
 *  - sector: string (for peer comparison)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  return NextResponse.json(
    await cached(
      `fund:${upper}`,
      6 * 3600, // 6h
      async () => {
        const [summary, candles] = await Promise.all([
          getYahooSummary(upper),
          getYahooCandles(upper, "5y", "1d").catch(() => []),
        ]);

        if (!summary) {
          return { error: "summary not available", ticker: upper };
        }

        // Build sparklines for indicators we have data for
        // (price derived from candles; ratios computed from current + past)
        const sparklines: Record<string, { date: string; value: number }[]> = {};

        // Price (use 5y candles)
        if (candles.length > 0) {
          sparklines.price = candles.map((c) => ({
            date: c.date,
            value: c.close,
          }));
        }

        // For fundamental sparklines, we approximate by applying current ratios
        // scaled by historical price. This is a heuristic — actual fundamental
        // history requires SEC filings (not available in MVP).
        const ratioMetrics: { key: string; base: number | null }[] = [
          { key: "marketCap", base: summary.marketCap },
          { key: "evToEBITDA", base: summary.evToEBITDA },
          { key: "priceToBook", base: summary.priceToBook },
          { key: "trailingPE", base: summary.trailingPE },
        ];
        for (const m of ratioMetrics) {
          if (m.base != null && candles.length > 100) {
            sparklines[m.key] = candles.map((c) => {
              // Approximate: scale current ratio by price vs initial price
              const scale = candles.length > 0 ? c.close / candles[0].close : 1;
              const value = m.base! * scale;
              return { date: c.date, value };
            });
          }
        }

        return {
          ticker: upper,
          current: summary,
          sparklines,
        };
      },
    ),
  );
}