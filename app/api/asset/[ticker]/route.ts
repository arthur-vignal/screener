import { NextRequest, NextResponse } from "next/server";
import { getFinancials, getProfile, getQuote } from "@/lib/finnhub";
import { getFundamentals } from "@/lib/fundamentals";
import { getFinvizStock } from "@/lib/finviz";
import { getBrapiFundamentals, isBrazilianTicker } from "@/lib/brapi";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Asset detail endpoint.
 *
 * US tickers:  Finnhub (profile + rich metrics) + Yahoo (price via fundamentals)
 *              + SEC EDGAR (ratios) + Finviz (snapshot table).
 * BR tickers:  Brapi with all free modules (price, profile, key statistics,
 *              financial data, income + balance history) + IBOV sector fallback.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase().replace(/\.SA$/, "");

  // Brazilian path: full Brapi bundle (quote, profile, key stats, financials,
  // income + balance history).
  if (isBrazilianTicker(ticker)) {
    try {
      const brapi = await getBrapiFundamentals(ticker);
      if (!brapi) {
        return NextResponse.json(
          { error: `${ticker} não encontrado` },
          { status: 404 },
        );
      }
      const q = brapi.quote;
      const ks = brapi.keyStatistics;
      const fd = brapi.financialData;
      const pr = brapi.profile;
      const ibov = IBOV_BY_SYMBOL[ticker];
      const change = q.change;
      const changePercent = q.changePercent;
      return NextResponse.json({
        ticker,
        name: q.longName ?? q.shortName ?? ibov?.name ?? null,
        exchange: "B3",
        sector:
          pr.sectorDisp ?? pr.sector ?? ibov?.sector ?? null,
        industry: pr.industryDisp ?? pr.industry ?? null,
        logo: q.logoUrl ?? null,
        currency: "BRL",
        country: pr.country ?? "BR",
        website: pr.website ?? null,
        employees: pr.fullTimeEmployees ?? null,
        summary: pr.longBusinessSummary ?? null,
        quote: {
          symbol: ticker,
          price: q.price,
          prevClose: q.prevClose,
          change,
          changePercent,
          dayHigh: q.dayHigh || 0,
          dayLow: q.dayLow || 0,
          dayOpen: q.dayOpen || 0,
          volume: q.volume || 0,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
        },
        marketCap: q.marketCap ?? null,
        metrics: {
          // Valuation
          peRatio: q.trailingPE ?? (ks.trailingEps && ks.trailingEps > 0 ? q.price / ks.trailingEps : null),
          forwardPE: ks.forwardPE ?? null,
          pegRatio: ks.pegRatio ?? null,
          priceToBook: ks.priceBook ?? (ks.bookValue && ks.bookValue > 0 ? q.price / ks.bookValue : null),
          priceToSales: ks.priceSales ?? null,
          evEbitda: null,
          evRevenue: ks.enterpriseValue ?? null,
          // Profitability
          roe: ks.returnOnEquity ?? fd.returnOnEquity ?? null,
          roa: ks.returnOnAssets ?? null,
          roic: null, // not directly available on Brapi free
          operatingMargin: ks.operatingMargins ?? fd.operatingMargins ?? null,
          profitMargin: ks.profitMargins ?? fd.profitMargins ?? null,
          grossMargin: ks.grossMargins ?? fd.grossMargins ?? null,
          // Per-share
          eps: ks.trailingEps ?? q.earningsPerShare ?? null,
          forwardEps: ks.forwardEps ?? null,
          bookValuePerShare: ks.bookValue ?? null,
          revenuePerShare: null,
          // Growth
          earningsGrowthQuarterly: ks.earningsQuarterlyGrowth ?? fd.earningsGrowth ?? null,
          earningsGrowthAnnual: ks.earningsAnnualGrowth ?? null,
          revenueGrowthQuarterly: ks.revenueQuarterlyGrowth ?? fd.revenueGrowth ?? null,
          revenueGrowthAnnual: ks.revenueAnnualGrowth ?? null,
          // Cash flow
          freeCashFlow: ks.freeCashflow ?? fd.freeCashflow ?? null,
          operatingCashFlow: ks.operatingCashflow ?? fd.operatingCashflow ?? null,
          // Dividends
          dividendRate: ks.trailingAnnualDividendRate ?? null,
          dividendYield: ks.trailingAnnualDividendYield ?? null,
          lastDividendValue: ks.lastDividendValue ?? null,
          lastDividendDate: ks.lastDividendDate ?? null,
          payoutRatio: null,
          // Risk
          beta: ks.beta ?? null,
          yearHigh: q.fiftyTwoWeekHigh ?? null,
          yearLow: q.fiftyTwoWeekLow ?? null,
          // Share structure
          sharesOutstanding: ks.sharesOutstanding ?? null,
          floatShares: ks.floatShares ?? null,
          heldPercentInsiders: ks.heldPercentInsiders ?? null,
          heldPercentInstitutions: ks.heldPercentInstitutions ?? null,
          // Analyst targets
          targetHighPrice: fd.targetHighPrice ?? null,
          targetLowPrice: fd.targetLowPrice ?? null,
          targetMeanPrice: fd.targetMeanPrice ?? null,
          targetMedianPrice: fd.targetMedianPrice ?? null,
          recommendationMean: fd.recommendationMean ?? null,
          recommendationKey: fd.recommendationKey ?? null,
          numberOfAnalystOpinions: fd.numberOfAnalystOpinions ?? null,
          // Balance sheet (current snapshot)
          totalCash: ks.totalCash ?? fd.totalCash ?? null,
          totalCashPerShare: fd.totalCashPerShare ?? null,
          totalDebt: ks.totalDebt ?? fd.totalDebt ?? null,
          debtEquity: ks.debtToEquity ?? null,
          currentRatio: ks.currentRatio ?? fd.currentRatio ?? null,
          quickRatio: ks.quickRatio ?? fd.quickRatio ?? null,
          ebitda: fd.ebitda ?? null,
          totalRevenue: fd.totalRevenue ?? null,
        },
        // Historical quarterly series (sorted descending: latest first).
        historicals: {
          income: brapi.historicals.income.map((p) => ({
            type: p.type,
            endDate: p.endDate,
            totalRevenue: p.totalRevenue ?? null,
            grossProfit: p.grossProfit ?? null,
            operatingIncome: p.operatingIncome ?? null,
            netIncome: p.netIncome ?? null,
            ebitda: p.ebitda ?? null,
            ebit: p.ebit ?? null,
            eps: p.dilutedEarningsPerShare ?? p.basicEarningsPerShare ?? p.earningsPerShare ?? null,
          })),
          balance: brapi.historicals.balance.map((p) => ({
            type: p.type,
            endDate: p.endDate,
            totalAssets: p.totalAssets ?? null,
            totalLiabilities: p.totalLiab ?? null,
            totalEquity: p.totalStockholderEquity ?? null,
            cash: p.cash ?? null,
            longTermDebt: p.longTermDebt ?? null,
          })),
        },
        source: "brapi",
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
