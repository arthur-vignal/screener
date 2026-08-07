import { NextRequest, NextResponse } from "next/server";
import { getFinancials, getProfile, getQuote } from "@/lib/finnhub";
import { getFundamentals } from "@/lib/fundamentals";
import { getFinvizStock } from "@/lib/finviz";
import { isBrazilianTicker } from "@/lib/brapi";
import { getYahooQuoteSnapshot } from "@/lib/yahoo";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Asset detail endpoint.
 *
 * US tickers:  Finnhub (profile + rich metrics) + Yahoo (price via fundamentals)
 *              + SEC EDGAR (ratios) + Finviz (snapshot table).
 * BR tickers:  Yahoo Finance `.SA` (price + 52w + day range) + IBOV_BY_SYMBOL
 *              sector fallback. Fundamentals-rich metrics are unavailable
 *              without a paid provider; the CVM DFP series is served from
 *              /api/fundamentals/history/[ticker] for historical series.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase().replace(/\.SA$/, "");

  // Brazilian path: Yahoo (.SA) for quote/snapshot + IBOV sector fallback.
  // Fundamentals-rich metrics require a paid data provider; left as null.
  if (isBrazilianTicker(ticker)) {
    try {
      const yahoo = await getYahooQuoteSnapshot(`${ticker}.SA`);
      if (!yahoo) {
        return NextResponse.json(
          { error: `${ticker} não encontrado` },
          { status: 404 },
        );
      }
      const ibov = IBOV_BY_SYMBOL[ticker];
      return NextResponse.json({
        ticker,
        name: yahoo.longName ?? yahoo.shortName ?? ibov?.name ?? null,
        exchange: "B3",
        sector: ibov?.sector ?? null,
        industry: null,
        logo: null,
        currency: yahoo.currency || "BRL",
        country: "BR",
        website: null,
        employees: null,
        summary: null,
        quote: {
          symbol: ticker,
          price: yahoo.price,
          prevClose: yahoo.prevClose,
          change: yahoo.change,
          changePercent: yahoo.changePercent,
          dayHigh: yahoo.dayHigh ?? 0,
          dayLow: yahoo.dayLow ?? 0,
          dayOpen: 0,
          volume: yahoo.volume ?? 0,
          fiftyTwoWeekHigh: yahoo.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: yahoo.fiftyTwoWeekLow ?? 0,
        },
        marketCap: null,
        metrics: {
          // All valuation/profitability/dividend metrics are null for BR
          // under the Yahoo-only strategy. CVM DFP series is served via
          // /api/fundamentals/history/[ticker].
          peRatio: null,
          forwardPE: null,
          pegRatio: null,
          priceToBook: null,
          priceToSales: null,
          evEbitda: null,
          evRevenue: null,
          roe: null,
          roa: null,
          roic: null,
          operatingMargin: null,
          profitMargin: null,
          grossMargin: null,
          eps: null,
          forwardEps: null,
          bookValuePerShare: null,
          revenuePerShare: null,
          earningsGrowthQuarterly: null,
          earningsGrowthAnnual: null,
          revenueGrowthQuarterly: null,
          revenueGrowthAnnual: null,
          freeCashFlow: null,
          operatingCashFlow: null,
          dividendRate: null,
          dividendYield: null,
          lastDividendValue: null,
          lastDividendDate: null,
          payoutRatio: null,
          beta: null,
          yearHigh: yahoo.fiftyTwoWeekHigh ?? null,
          yearLow: yahoo.fiftyTwoWeekLow ?? null,
          sharesOutstanding: null,
          floatShares: null,
          heldPercentInsiders: null,
          heldPercentInstitutions: null,
          targetHighPrice: null,
          targetLowPrice: null,
          targetMeanPrice: null,
          targetMedianPrice: null,
          recommendationMean: null,
          recommendationKey: null,
          numberOfAnalystOpinions: null,
          totalCash: null,
          totalCashPerShare: null,
          totalDebt: null,
          debtEquity: null,
          currentRatio: null,
          quickRatio: null,
          ebitda: null,
          totalRevenue: null,
        },
        historicals: { income: [], balance: [] },
        source: "yahoo-br",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  try {
    // Fetch from all sources in parallel
    const [quote, profile, fins, fundamentals, finviz] = await Promise.all([
      getQuote(ticker).catch(() => null),
      getProfile(ticker).catch(() => null),
      getFinancials(ticker).catch(() => null),
      getFundamentals(ticker).catch(() => null),
      getFinvizStock(ticker).catch(() => null),
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
      finviz: finviz?.snapshot ?? {},
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
      source: "us-bundle",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
