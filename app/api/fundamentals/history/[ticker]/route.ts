import { NextRequest, NextResponse } from "next/server";
import { isBrazilianTicker } from "@/lib/brapi";
import { getBrapiFull } from "@/lib/brapi-full";
import { loadCvmSeeds } from "@/lib/cvm-seed";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Fundamentals history endpoint for BR tickers.
 *
 * Combines official CVM ITR/DFP (via lib/cvm-seed) with Brapi Pro quarterly
 * and annual financials. Returns annual time series (BR fiscal years) plus
 * TTM earnings-growth context.
 *
 * Returns populated=false for non-BR tickers.
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

  const [brapi, cvmSeeds] = await Promise.all([
    getBrapiFull(ticker).catch(() => null),
    loadCvmSeeds(ticker),
  ]);

  if (!brapi && cvmSeeds.length === 0) {
    return NextResponse.json(
      {
        ticker,
        populated: false,
        error: "Sem dados disponíveis (Brapi e CVM off)",
      },
      { status: 200 },
    );
  }

  // Merge income + balance by endDate across both sources.
  type Quarter = {
    endDate: string;
    source: string;
    revenue: number | null;
    grossProfit: number | null;
    ebit: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    longTermDebt: number | null;
    cash: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    revenueGrowthYoY: number | null;
    netIncomeGrowthYoY: number | null;
  };

  // Aggregate seeds by endDate (CVM seed already has DFP/ITR per date)
  const cvmByDate = new Map(cvmSeeds.map((s) => [s.endDate, s]));

  // Build from Brapi annual + Brapi quarterly + CVM seeds
  const balanceByDate = new Map<string, { totalAssets: number | null; totalLiabilities: number | null; totalEquity: number | null; cash: number | null; longTermDebt: number | null }>();
  if (brapi) {
    for (const b of brapi.balanceSheetHistory) {
      balanceByDate.set(b.endDate, {
        totalAssets: b.totalAssets,
        totalLiabilities: b.totalLiab,
        totalEquity: b.totalStockholderEquity,
        cash: b.cash,
        longTermDebt: b.longTermDebt,
      });
    }
  }

  const allDates = new Set<string>([
    ...cvmSeeds.map((s) => s.endDate),
    ...(brapi?.incomeStatementHistory.map((i) => i.endDate) ?? []),
    ...(brapi?.balanceSheetHistory.map((b) => b.endDate) ?? []),
  ]);
  const sortedDates = Array.from(allDates).sort();

  const quarters: Quarter[] = sortedDates.map((dt) => {
    const cvm = cvmByDate.get(dt);
    const brapiInc = brapi?.incomeStatementHistory.find((i) => i.endDate === dt);
    const bal = balanceByDate.get(dt);

    // Prefer CVM seed (more recent), fallback to Brapi
    const revenue = cvm?.totalRevenue ?? brapiInc?.totalRevenue ?? null;
    const grossProfit = cvm?.grossProfit ?? brapiInc?.grossProfit ?? null;
    const operatingIncome = cvm?.operatingIncome ?? brapiInc?.operatingIncome ?? null;
    const netIncome = cvm?.netIncome ?? brapiInc?.netIncome ?? null;

    const source = cvm
      ? cvm.source === "ITR"
        ? "CVM ITR"
        : "CVM DFP"
      : "Brapi";

    return {
      endDate: dt,
      source,
      revenue,
      grossProfit,
      ebit: operatingIncome,
      netIncome,
      totalAssets: cvm?.totalAssets ?? bal?.totalAssets ?? null,
      totalLiabilities: cvm?.totalLiabilities ?? bal?.totalLiabilities ?? null,
      totalEquity: cvm?.totalEquity ?? bal?.totalEquity ?? null,
      longTermDebt: bal?.longTermDebt ?? null,
      cash: bal?.cash ?? null,
      grossMargin: revenue && revenue > 0 ? grossProfit! / revenue : null,
      operatingMargin: revenue && revenue > 0 ? operatingIncome! / revenue : null,
      netMargin: revenue && revenue > 0 ? netIncome! / revenue : null,
      revenueGrowthYoY: null,
      netIncomeGrowthYoY: null,
    };
  });

  // Y/Y growth (compare against prior year, same date).
  for (let i = 0; i < quarters.length; i++) {
    const cur = quarters[i];
    const priorYear = String(Number(cur.endDate.slice(0, 4)) - 1);
    const prior = quarters.find(
      (q) =>
        q.endDate.startsWith(priorYear) &&
        q.endDate.endsWith(cur.endDate.slice(5)),
    );
    cur.revenueGrowthYoY =
      prior && prior.revenue && prior.revenue > 0 && cur.revenue != null
        ? (cur.revenue - prior.revenue) / prior.revenue
        : null;
    cur.netIncomeGrowthYoY =
      prior && prior.netIncome && prior.netIncome > 0 && cur.netIncome != null
        ? (cur.netIncome - prior.netIncome) / prior.netIncome
        : null;
  }

  // Brapi dividends (only reliable source for now)
  const dividends = (brapi?.dividends ?? []).map((d) => ({
    paymentDate: d.paymentDate,
    value: d.rate,
    label: d.label,
  }));

  return NextResponse.json({
    ticker,
    source: "brapi+cvm-seed",
    asOf: new Date().toISOString(),
    populated: quarters.length > 0,
    quarters,
    dividends,
  });
}

// Hint: TTM (Trailing 12 Months) calculation moved to lib/ttm-hybrid.ts.
// The cvm-fundamentals-panel consumes this endpoint and computes TTM
// from the last 4 quarters when available.

