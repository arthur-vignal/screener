import { NextRequest, NextResponse } from "next/server";
import { isBrazilianTicker } from "@/lib/brapi";
import { getBrapiFull } from "@/lib/brapi-full";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Fundamentals history endpoint for BR tickers.
 *
 * Returns annual time series from Brapi Pro:
 *   - incomeStatementHistory (revenue, grossProfit, ebit, netIncome)
 *   - balanceSheetHistory (totalAssets, totalLiab, totalEquity)
 *   - dividendsData (cashDividends)
 *
 * + derived per-year margins and growth Y/Y
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

  const income = brapi.incomeStatementHistory;
  const balance = brapi.balanceSheetHistory;
  const dividends = brapi.dividends;

  // Merge income + balance by endDate.
  type Quarter = {
    endDate: string;
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

  const balanceByDate = new Map(balance.map((b) => [b.endDate, b]));
  const allDates = new Set<string>([
    ...income.map((i) => i.endDate),
    ...balance.map((b) => b.endDate),
  ]);
  const sortedDates = Array.from(allDates).sort();

  const quarters: Quarter[] = sortedDates.map((dt) => {
    const inc = income.find((i) => i.endDate === dt);
    const bal = balanceByDate.get(dt);
    const revenue = inc?.totalRevenue ?? null;
    const grossProfit = inc?.grossProfit ?? null;
    const operatingIncome = inc?.operatingIncome ?? null;
    const netIncome = inc?.netIncome ?? null;
    return {
      endDate: dt,
      revenue,
      grossProfit,
      ebit: operatingIncome, // operatingIncome ≈ EBIT for our purposes
      netIncome,
      totalAssets: bal?.totalAssets ?? null,
      totalLiabilities: bal?.totalLiab ?? null,
      totalEquity: bal?.totalStockholderEquity ?? null,
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
    const prior = quarters.find((q) => q.endDate.startsWith(priorYear));
    cur.revenueGrowthYoY =
      prior && prior.revenue && prior.revenue > 0 && cur.revenue != null
        ? (cur.revenue - prior.revenue) / prior.revenue
        : null;
    cur.netIncomeGrowthYoY =
      prior && prior.netIncome && prior.netIncome > 0 && cur.netIncome != null
        ? (cur.netIncome - prior.netIncome) / prior.netIncome
        : null;
  }

  return NextResponse.json({
    ticker,
    source: brapi.source,
    asOf: brapi.fetchedAt,
    populated: quarters.length > 0,
    quarters,
    dividends: dividends.map((d) => ({
      paymentDate: d.paymentDate,
      value: d.rate,
      label: d.label,
    })),
  });
}
