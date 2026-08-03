import { NextRequest, NextResponse } from "next/server";
import { getFinancials, getProfile, getQuote } from "@/lib/finnhub";
import { getFundamentals } from "@/lib/fundamentals";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Asset detail endpoint: combines Finnhub (rich metrics) + Yahoo (price) + SEC (fundamentals).
 *
 * Finnhub gives ROE, beta, margins, payout, etc.
 * SEC gives P/E, P/VP, EPS, book value, ROE (TTM).
 * Yahoo gives price, 52w high/low, volume.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    // Fetch from all sources in parallel
    const [quote, profile, fins, fundamentals] = await Promise.all([
      getQuote(ticker).catch(() => null),
      getProfile(ticker).catch(() => null),
      getFinancials(ticker).catch(() => null),
      getFundamentals(ticker).catch(() => null),
    ]);

    if (!quote && !fundamentals) {
      return NextResponse.json(
        { error: `${ticker} não encontrado` },
        { status: 404 },
      );
    }

    const m = fins?.metric ?? {};

    // Prefer SEC for: P/E, P/VP, ROE, EPS, BV
    // Prefer Finnhub for: beta, margins, payout, dividend
    // Use Yahoo for: price, 52w, volume, dayHigh/Low
    const quoteYahoo = fundamentals;
    const fQuote = quote;

    const price = quoteYahoo?.price ?? fQuote?.c ?? 0;
    const prevClose = quoteYahoo?.prevClose ?? fQuote?.pc ?? 0;
    const change = price - prevClose;
    const changePercent = prevClose === 0 ? 0 : (change / prevClose) * 100;

    return NextResponse.json({
      ticker,
      name: profile?.name ?? quoteYahoo?.name ?? null,
      exchange: profile?.exchange ?? quoteYahoo?.exchange ?? null,
      sector: (profile as { finnhubIndustry?: string } | null)?.finnhubIndustry ?? quoteYahoo?.sector ?? null,
      industry: (profile as { finnhubIndustry?: string } | null)?.finnhubIndustry ?? null,
      logo: (profile as { logo?: string } | null)?.logo ?? null,
      currency: "USD",
      quote: {
        symbol: ticker,
        price,
        prevClose,
        change,
        changePercent,
        dayHigh: quoteYahoo?.dayHigh ?? fQuote?.d ?? 0,
        dayLow: quoteYahoo?.dayLow ?? 0,
        dayOpen: fQuote?.o ?? 0,
        volume: quoteYahoo?.volume ?? 0,
        fiftyTwoWeekHigh: quoteYahoo?.fiftyTwoWeekHigh ?? m["52WeekHigh"] ?? 0,
        fiftyTwoWeekLow: quoteYahoo?.fiftyTwoWeekLow ?? m["52WeekLow"] ?? 0,
      },
      marketCap: quoteYahoo?.marketCap ?? null,
      profile,
      metrics: {
        // Valuation (prefer SEC, fallback Finnhub)
        peRatio: quoteYahoo?.pe ?? m.peBasicExtraTTM ?? m.peTTM ?? null,
        pegRatio: m.pegRatio ?? null,
        priceToBook: quoteYahoo?.pb ?? m.priceToBookRatio ?? null,
        priceToSales: quoteYahoo?.ps ?? m.psRatioTTM ?? m.priceToSalesRatioTTM ?? null,
        evEbitda: m.evEbitda ?? null,
        evRevenue: m.evRevenue ?? null,
        // Profitability (SEC preferred, Finnhub fallback)
        roe: quoteYahoo?.roe ?? m.roeTTM ?? m.roeAnnual ?? null,
        roa: m.roaTTM ?? m.roaAnnual ?? null,
        roic: m.roicTTM ?? m.roicAnnual ?? null,
        operatingMargin: quoteYahoo?.operatingMargin ?? m.operatingMarginTTM ?? null,
        profitMargin: quoteYahoo?.netMargin ?? m.profitMarginTTM ?? null,
        grossMargin: m.grossMarginTTM ?? m.grossMarginAnnual ?? null,
        // Per-share
        eps: quoteYahoo?.eps ?? m.epsBasicExtraTTM ?? m.epsTTM ?? null,
        bookValuePerShare: quoteYahoo?.bookValuePerShare ?? m.bookValuePerShareQuarterly ?? null,
        revenuePerShare: m.revenuePerShareTTM ?? null,
        // Cash flow
        freeCashFlowYield: m.freeCashFlowYieldTTM ?? null,
        // Dividends
        dividendYield: m.dividendYieldIndicatedAnnual ?? m.dividendYieldTTM ?? null,
        payoutRatio: m.payoutRatioTTM ?? m.payoutRatioAnnual ?? null,
        // Risk
        beta: m.beta ?? null,
        yearHigh: m["52WeekHigh"] ?? null,
        yearLow: m["52WeekLow"] ?? null,
        debtEquity: m.debtEquityRatio ?? null,
        currentRatio: m.currentRatio ?? null,
      },
      // SEC metadata (asOf = period of latest filing)
      secAsOf: fundamentals?.asOf ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
