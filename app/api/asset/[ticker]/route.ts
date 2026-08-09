import { NextRequest, NextResponse } from "next/server";
import { getFinancials, getProfile, getQuote } from "@/lib/finnhub";
import { getFundamentals } from "@/lib/fundamentals";
import { getFinvizStock } from "@/lib/finviz";
import { isBrazilianTicker } from "@/lib/brapi";
import { getBrapiFull } from "@/lib/brapi-full";
import { getYahooQuoteSnapshot } from "@/lib/yahoo";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Asset detail endpoint.
 *
 * US tickers:  Finnhub (profile + rich metrics) + Yahoo (price via fundamentals)
 *              + SEC EDGAR (ratios) + Finviz (snapshot table).
 * BR tickers:  Brapi Pro (full bundle: quote + financialData + defaultKeyStatistics
 *              + incomeStatementHistory + balanceSheetHistory + dividendsData +
 *              summaryProfile). Falls back to Yahoo `.SA` only when BRAPI_TOKEN
 *              is unset or Brapi returns null.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase().replace(/\.SA$/, "");

  // Brazilian path: Brapi Pro full bundle.
  if (isBrazilianTicker(ticker)) {
    const brapi = await getBrapiFull(ticker).catch(() => null);
    if (!brapi) return yahooBrFallback(ticker);
    const q = brapi.quote;
    const k = brapi.keyStatistics;
    const f = brapi.financialData;
    const p = brapi.profile;
    const ibov = IBOV_BY_SYMBOL[ticker];
    return NextResponse.json({
      ticker,
      name: q.longName ?? q.shortName ?? ibov?.name ?? null,
      exchange: "B3",
      sector: p?.sector ?? ibov?.sector ?? null,
      industry: p?.industry ?? ibov?.sector ?? null,
      logo: q.logourl,
      currency: q.currency || "BRL",
      country: p?.country ?? "BR",
      website: p?.website,
      employees: p?.fullTimeEmployees,
      summary: p?.longBusinessSummary,
      quote: {
        symbol: ticker,
        price: q.regularMarketPrice ?? 0,
        prevClose: q.regularMarketPreviousClose ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        dayHigh: q.regularMarketDayHigh ?? 0,
        dayLow: q.regularMarketDayLow ?? 0,
        dayOpen: q.regularMarketOpen ?? 0,
        volume: q.regularMarketVolume ?? 0,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
      },
      marketCap: q.marketCap ?? k?.marketCap ?? null,
      metrics: {
        peRatio: q.priceEarnings,
        forwardPE: k?.forwardPE,
        pegRatio: k?.pegRatio,
        priceToBook: k?.priceToBook,
        priceToSales: f?.totalRevenue && q.marketCap ? q.marketCap / f.totalRevenue : null,
        evEbitda: k?.enterpriseToEbitda,
        evRevenue: k?.enterpriseToRevenue,
        earningsYield: q.priceEarnings && q.priceEarnings > 0 ? 1 / q.priceEarnings : null,
        roe: f?.returnOnEquity,
        roa: f?.returnOnAssets,
        roic: null,
        operatingMargin: f?.operatingMargins,
        profitMargin: f?.profitMargins,
        grossMargin: f?.grossMargins,
        ebitdaMargin: f?.ebitdaMargins,
        eps: q.earningsPerShare,
        forwardEps: k?.forwardEps,
        bookValuePerShare: k?.bookValue,
        revenuePerShare:
          k?.sharesOutstanding && f?.totalRevenue
            ? (f.totalRevenue * 1000) / k.sharesOutstanding
            : null,
        earningsGrowthQuarterly: k?.earningsQuarterlyGrowth,
        earningsGrowthAnnual: f?.earningsGrowth,
        revenueGrowthQuarterly: null,
        revenueGrowthAnnual: f?.revenueGrowth,
        freeCashFlow: f?.freeCashflow,
        operatingCashFlow: f?.operatingCashflow,
        ebitda: f?.ebitda,
        dividendRate: k?.lastDividendValue,
        dividendYield: k?.yield,
        lastDividendValue: k?.lastDividendValue,
        lastDividendDate: k?.lastDividendDate,
        payoutRatio: null,
        beta: k?.beta,
        yearHigh: q.fiftyTwoWeekHigh,
        yearLow: q.fiftyTwoWeekLow,
        totalCash: f?.totalCash,
        totalCashPerShare: f?.totalCashPerShare,
        totalDebt: f?.totalDebt,
        debtEquity: f?.debtToEquity,
        currentRatio: f?.currentRatio,
        quickRatio: f?.quickRatio,
        totalRevenue: f?.totalRevenue,
        sharesOutstanding: k?.sharesOutstanding,
        floatShares: k?.floatShares,
        heldPercentInsiders: k?.heldPercentInsiders,
        heldPercentInstitutions: k?.heldPercentInstitutions,
        targetHighPrice: null,
        targetLowPrice: null,
        targetMeanPrice: null,
        targetMedianPrice: null,
        recommendationMean: null,
        recommendationKey: null,
        numberOfAnalystOpinions: null,
      },
      fundamentals: {
        enterpriseValue: k?.enterpriseValue,
        fiftyTwoWeekChange: k?.fiftyTwoWeekChange,
        netIncomeToCommon: k?.netIncomeToCommon,
        grossProfits: f?.grossProfits,
      },
      historicals: {
        income: brapi.incomeStatementHistory,
        balance: brapi.balanceSheetHistory,
        dividends: brapi.dividends,
      },
      asOf: brapi.fetchedAt,
      source: "brapi-full",
    });
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
        peRatio: quoteYahoo?.pe ?? m.peBasicExtraTTM ?? m.peTTM ?? null,
        pegRatio: m.pegRatio ?? null,
        priceToBook: quoteYahoo?.pb ?? m.priceToBookRatio ?? null,
        priceToSales: quoteYahoo?.ps ?? m.psRatioTTM ?? m.priceToSalesRatioTTM ?? null,
        evEbitda: m.evEbitda ?? null,
        evRevenue: m.evRevenue ?? null,
        roe: quoteYahoo?.roe ?? m.roeTTM ?? m.roeAnnual ?? null,
        roa: m.roaTTM ?? m.roaAnnual ?? null,
        roic: m.roicTTM ?? m.roicAnnual ?? null,
        operatingMargin: quoteYahoo?.operatingMargin ?? m.operatingMarginTTM ?? null,
        profitMargin: quoteYahoo?.netMargin ?? m.profitMarginTTM ?? null,
        grossMargin: m.grossMarginTTM ?? m.grossMarginAnnual ?? null,
        eps: quoteYahoo?.eps ?? m.epsBasicExtraTTM ?? m.epsTTM ?? null,
        bookValuePerShare: quoteYahoo?.bookValuePerShare ?? m.bookValuePerShareQuarterly ?? null,
        revenuePerShare: m.revenuePerShareTTM ?? null,
        freeCashFlowYield: m.freeCashFlowYieldTTM ?? null,
        dividendYield: m.dividendYieldIndicatedAnnual ?? m.dividendYieldTTM ?? null,
        payoutRatio: m.payoutRatioTTM ?? m.payoutRatioAnnual ?? null,
        beta: m.beta ?? null,
        yearHigh: m["52WeekHigh"] ?? null,
        yearLow: m["52WeekLow"] ?? null,
        debtEquity: m.debtEquityRatio ?? null,
        currentRatio: m.currentRatio ?? null,
      },
      secAsOf: fundamentals?.asOf ?? null,
      source: "us-bundle",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Yahoo-only fallback for BR tickers when BRAPI_TOKEN is unset or Brapi
 * upstream errors. Returns minimal data with null-valued metrics.
 */
async function yahooBrFallback(ticker: string) {
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
      historicals: { income: [], balance: [], dividends: [] },
      source: "yahoo-br-fallback",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
