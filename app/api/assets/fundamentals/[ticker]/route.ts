import { NextRequest, NextResponse } from "next/server";
import { getYahooSummary, getYahooCandles } from "@/lib/yahoo";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Detailed fundamentals for an asset, with sparkline history for every metric.
 *
 * Sparkline strategy: we approximate metric history by scaling the current value
 * by the relative price move at each historical point. This is a HEURISTIC — actual
 * fundamental history requires SEC filings. Use it for trend direction only.
 *
 * Returns all metrics from investidor10-style categorization:
 *   - Valuation: P/L, P/VP, P/Receita, EV/EBITDA, EV/EBIT, EV/Receita, P/EBITDA,
 *     P/EBIT, P/Ativo, P/Ativo Circ Liq, P/Cap.Giro, LPA, VPA
 *   - Efficiency: Margem Bruta, Margem EBITDA, Margem EBIT, Margem Líquida, Giro Ativos
 *   - Profitability: ROE, ROIC, ROA
 *   - Risk: Beta (n/a no MVP)
 *   - Growth: CAGR Receita, CAGR Lucros (n/a no MVP)
 *   - Dividends: DY, Payout
 *   - 52w: High, Low
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
      6 * 3600,
      async () => {
        const [summary, candles] = await Promise.all([
          getYahooSummary(upper),
          getYahooCandles(upper, "5y", "1d").catch(() => []),
        ]);

        const sparklines: Record<string, { date: string; value: number }[]> = {};

        // Price sparkline
        if (candles.length > 0) {
          sparklines.price = candles.map((c) => ({
            date: c.date,
            value: c.close,
          }));
        }

        // Build sparkline for any metric in summary that has a value
        const summaryRecord = summary as unknown as Record<string, unknown>;
        const ratioKeys = [
          "trailingPE",
          "forwardPE",
          "priceToBook",
          "priceToSales",
          "evToEBITDA",
          "evToRevenue",
          "enterpriseValue",
          "marketCap",
          "dividendYield",
          "fiftyTwoWeekHigh",
          "fiftyTwoWeekLow",
        ];

        if (candles.length > 100) {
          for (const key of ratioKeys) {
            const base = summaryRecord?.[key];
            if (typeof base === "number" && isFinite(base) && base > 0) {
              sparklines[key] = candles.map((c) => {
                const scale =
                  candles[0].close > 0 ? c.close / candles[0].close : 1;
                return { date: c.date, value: base * scale };
              });
            }
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