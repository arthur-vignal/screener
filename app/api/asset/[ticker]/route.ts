import { NextRequest, NextResponse } from "next/server";
import { getFinancials, getProfile, getQuote } from "@/lib/finnhub";
import { getYahooQuotes } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    const [quote, profile, fins, quoteMap] = await Promise.all([
      getQuote(ticker),
      getProfile(ticker),
      getFinancials(ticker),
      getYahooQuotes([ticker]),
    ]);
    const yahoo = quoteMap.get(ticker);

    if (!quote || !profile) {
      return NextResponse.json(
        { error: `${ticker} não encontrado` },
        { status: 404 },
      );
    }

    const m = fins?.metric ?? {};
    return NextResponse.json({
      ticker,
      quote: yahoo ?? quote,
      profile,
      metrics: {
        peRatio: m.peBasicExtraTTM ?? null,
        pegRatio: m.pegRatio ?? null,
        priceToBook: m.priceToBookRatio ?? null,
        evEbitda: m.evEbitda ?? null,
        evRevenue: m.evRevenue ?? null,
        roe: m.roeTTM ?? null,
        roa: m.roaTTM ?? null,
        roic: m.roicTTM ?? null,
        operatingMargin: m.operatingMarginTTM ?? null,
        profitMargin: m.profitMarginTTM ?? null,
        grossMargin: m.grossMarginTTM ?? null,
        freeCashFlowYield: m.freeCashFlowYieldTTM ?? null,
        dividendYield: m.dividendYieldIndicatedAnnual ?? null,
        payoutRatio: m.payoutRatioTTM ?? null,
        beta: m.beta ?? null,
        yearHigh: m["52WeekHigh"] ?? null,
        yearLow: m["52WeekLow"] ?? null,
        eps: m.epsBasicExtraTTM ?? null,
        bookValuePerShare: m.bookValuePerShareQuarterly ?? null,
        revenuePerShare: m.revenuePerShareTTM ?? null,
        debtEquity: m.debtEquityRatio ?? null,
        currentRatio: m.currentRatio ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
