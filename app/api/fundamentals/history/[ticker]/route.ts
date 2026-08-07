import { NextRequest, NextResponse } from "next/server";
import { isBrazilianTicker } from "@/lib/brapi";
import {
  getCvmHistory,
  lookupCnpjByTicker,
  sortedQuarters,
} from "@/lib/cvm";
import { getYahooCandles } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Fundamentals history endpoint for BR tickers.
 *
 * Combines:
 *   - Yahoo Finance `.SA` (10y monthly OHLC) for price history
 *   - CVM DFP annual fundamentals (revenue, grossProfit, ebit, netIncome,
 *     totalAssets, totalLiabilities, totalEquity) since 2010
 *   - Derived series: P/E (price / quarterly EPS), margins, growth Y/Y
 *
 * Returns null for non-BR tickers so callers can decide to fall back to
 * SEC XBRL / Finnhub for US tickers.
 *
 * CNPJ resolution: ticker → CVM cadastro via lib/cvm.ts:lookupCnpjByTicker
 * (no Brapi dependency). Requires the ticker to be in the IBOV universe
 * (lib/ibovespa.ts) — for non-IBOV B3 tickers we return populated=false.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase().replace(/\.SA$/, "");
  if (!isBrazilianTicker(ticker)) {
    return NextResponse.json(
      { error: "BR-only endpoint; use SEC for US" },
      { status: 400 },
    );
  }

  const [lookup, candles] = await Promise.all([
    lookupCnpjByTicker(ticker).catch(() => null),
    getYahooCandles(`${ticker}.SA`, "5y", "1mo").catch(() => []),
  ]);

  if (!lookup) {
    return NextResponse.json(
      {
        ticker,
        populated: false,
        error: "Ticker not in IBOV / CVM cadastro lookup failed",
      },
      { status: 200 },
    );
  }

  const history = await getCvmHistory(lookup.cnpj).catch(() => null);
  if (!history) {
    return NextResponse.json(
      { ticker, populated: false, error: "CVM history unavailable" },
      { status: 200 },
    );
  }

  const quarters = sortedQuarters(history.quarters);

  // Pull up to 5y monthly prices from Yahoo to compute P/E historical series.
  // (Yahoo free tier caps at 5y; CVM DFP series goes back to 2010.)
  const pricePoints = candles.map((c) => ({
    date: c.date,
    close: c.close,
  }));

  // Build P/E historical: for each quarter end, look up the price nearest that
  // date, then divide by quarterly EPS (netIncome / sharesOutstanding).
  // sharesOutstanding requires Brapi token (defaultKeyStatistics) — null fallback
  // means P/E chart will be empty but the rest works.
  const sharesOutstanding: number | null = null;

  const series: Array<{
    endDate: string;
    revenue: number | null;
    grossProfit: number | null;
    ebit: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    eps: number | null;
    revenueGrowthYoY: number | null;
    netIncomeGrowthYoY: number | null;
  }> = quarters.map((q) => ({
    endDate: q.endDate,
    revenue: q.revenue,
    grossProfit: q.grossProfit,
    ebit: q.ebit,
    netIncome: q.netIncome,
    totalAssets: q.totalAssets,
    totalLiabilities: q.totalLiabilities,
    totalEquity: q.totalEquity,
    grossMargin:
      q.revenue && q.revenue > 0 ? q.grossProfit! / q.revenue : null,
    operatingMargin:
      q.revenue && q.revenue > 0 ? q.ebit! / q.revenue : null,
    netMargin:
      q.revenue && q.revenue > 0 ? q.netIncome! / q.revenue : null,
    eps:
      sharesOutstanding && sharesOutstanding > 0 && q.netIncome
        ? (q.netIncome * 1000) / sharesOutstanding
        : null,
    revenueGrowthYoY: null,
    netIncomeGrowthYoY: null,
  }));

  // Quarterly Y/Y growth (compare against the same quarter, prior year).
  for (let i = 0; i < series.length; i++) {
    const prior = series.find(
      (s) =>
        s.endDate.slice(0, 4) === String(Number(series[i].endDate.slice(0, 4)) - 1) &&
        s.endDate.slice(5, 7) === series[i].endDate.slice(5, 7),
    );
    series[i].revenueGrowthYoY =
      prior && prior.revenue && prior.revenue > 0 && series[i].revenue != null
        ? (series[i].revenue! - prior.revenue) / prior.revenue
        : null;
    series[i].netIncomeGrowthYoY =
      prior && prior.netIncome && prior.netIncome > 0 && series[i].netIncome != null
        ? (series[i].netIncome! - prior.netIncome) / prior.netIncome
        : null;
  }

  // Compute P/E historical for each quarter end.
  const peHistory = series.map((s) => {
    if (s.eps == null || s.eps <= 0) return { endDate: s.endDate, pe: null };
    const dt = new Date(s.endDate + "T00:00:00Z").getTime() / 1000;
    // Pick closest price point by date (≤ dt).
    let nearest = pricePoints[0];
    for (const p of pricePoints) {
      const pt = new Date(p.date + "T00:00:00Z").getTime() / 1000;
      if (pt <= dt) nearest = p;
      else break;
    }
    if (!nearest) return { endDate: s.endDate, pe: null };
    return { endDate: s.endDate, pe: nearest.close / s.eps };
  });

  const populated = series.some((s) => s.revenue != null || s.netIncome != null);

  return NextResponse.json({
    ticker,
    cnpj: lookup.cnpj,
    cvm: lookup.cvm,
    name: lookup.name,
    populated,
    quarters: series,
    peHistory,
    priceHistory: pricePoints,
    dividendsHistory: [] as Array<{ paymentDate?: string; value?: number }>,
  });
}