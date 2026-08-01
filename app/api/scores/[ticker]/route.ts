import { NextRequest, NextResponse } from "next/server";
import { getFinancials, getRecommendation } from "@/lib/finnhub";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  try {
    const [fins, rec] = await Promise.all([
      getFinancials(ticker),
      getRecommendation(ticker),
    ]);
    const m = fins?.metric ?? {};
    return NextResponse.json({
      metrics: {
        roe: m.roeTTM ?? null,
        roa: m.roaTTM ?? null,
        grossMargin: m.grossMarginTTM ?? null,
        operatingMargin: m.operatingMarginTTM ?? null,
        earningsGrowth: m.epsGrowthTTMYoy ?? null,
        revenueGrowth: m.revenueGrowthTTMYoy ?? null,
        dividendYield: m.dividendYieldIndicatedAnnual ?? null,
        payoutRatio: m.payoutRatioTTM ?? null,
        beta: m.beta ?? null,
        priceToBook: m.priceToBookRatio ?? null,
      },
      recommendation: rec,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
