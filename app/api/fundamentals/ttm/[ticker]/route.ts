import { NextRequest, NextResponse } from "next/server";
import { isBrazilianTicker } from "@/lib/brapi";
import { getBrapiFull } from "@/lib/brapi-full";
import { computeTTMHybrid } from "@/lib/ttm-hybrid";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * TTM (Trailing Twelve Months) summary endpoint for BR tickers.
 *
 * Returns:
 *   - aggregated income statement (revenue, grossProfit, ebit, netIncome)
 *   - balance sheet snapshot
 *   - margins (gross, operating, net)
 *   - growth Y/Y (vs TTM-1 where comparable)
 *   - the source quarters used
 *
 * Brapi preferred for EPS / dividends, CVM-seed (lib/cvm-data) for income
 * when the latest quarter is more recent than Brapi's coverage.
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

  const brapi = await getBrapiFull(ticker).catch(() => null);
  if (!brapi) {
    return NextResponse.json(
      {
        ticker,
        populated: false,
        error: "Brapi indisponível (token ou rede)",
      },
      { status: 200 },
    );
  }

  const ttm = await computeTTMHybrid(
    ticker,
    brapi.incomeStatementQuarterly,
    brapi.balanceSheetQuarterly,
    brapi.cashflowQuarterly,
    brapi.dividends,
    brapi.keyStatistics?.sharesOutstanding ?? null,
  );

  if (!ttm) {
    return NextResponse.json({
      ticker,
      populated: false,
      error: "Dados insuficientes para TTM",
    });
  }

  return NextResponse.json({
    ticker,
    populated: true,
    asOf: new Date().toISOString(),
    asOfQuarter: ttm.asOfQuarter,
    quartersIncluded: ttm.quartersIncluded,
    sourceQuarters: ttm.sourceQuarters,
    revenue: ttm.revenue,
    grossProfit: ttm.grossProfit,

    netIncome: ttm.netIncome,
    grossMargin: ttm.grossMargin,
    operatingMargin: ttm.operatingMargin,
    netMargin: ttm.netMargin,
    epsTTM: ttm.epsTTM,
    epsLatest: ttm.epsLatest,
    epsYoYGrowth: ttm.epsYoYGrowth,
    latestTotalEquity: ttm.latestTotalEquity,
    latestTotalAssets: ttm.latestTotalAssets,
    latestCash: ttm.latestCash,
    latestLongTermDebt: ttm.latestLongTermDebt,
    dividendsPaidLast4Q: ttm.dividendsPaidLast4Q,
  });
}
