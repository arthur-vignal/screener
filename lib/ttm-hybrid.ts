import {
  BrapiIncomeStatementQuarterly,
  BrapiCashflowQuarterly,
  BrapiDividend,
} from "./brapi-full";
import { computeTTM, TTMSummary } from "./ttm";
import { loadCvmSeeds, CvmQuarterlySeed } from "./cvm-seed";

/**
 * Merge Brapi quarterly data with CVM seed JSONs.
 *
 * Strategy: union both series by endDate. For dates present in both, prefer
 * CVM seed (more recent — Brapi lags by ~1 quarter). For dates only in Brapi
 * (older history), use Brapi.
 */

type MergedQuarter = {
  endDate: string;
  totalRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebit: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cash: number | null;
  longTermDebt: number | null;
  /** From Brapi cashflow */
  dividendsPaid: number | null;
  /** From Brapi quarterly EPS, in BRL */
  basicEarningsPerCommonShare: number | null;
  source: "brapi" | "cvm-seed" | "brapi+cvm";
};

/**
 * Combine Brapi quarterly + CVM seed into a single sorted series and
 * recompute TTM. Falls back to Brapi-only TTM if no seeds available.
 */
export async function computeTTMHybrid(
  ticker: string,
  brapiIncome: BrapiIncomeStatementQuarterly[],
  brapiBalance: Parameters<typeof computeTTM>[1],
  brapiCashflow: BrapiCashflowQuarterly[],
  brapiDividends: BrapiDividend[] = [],
  sharesOutstanding: number | null = null,
): Promise<TTMSummary | null> {
  const seeds = await loadCvmSeeds(ticker);

  // Build map keyed by endDate
  const merged = new Map<string, MergedQuarter>();

  // Add CVM seeds first (will be overwritten by Brapi if both present)
  for (const s of seeds) {
    merged.set(s.endDate, {
      endDate: s.endDate,
      totalRevenue: s.totalRevenue,
      grossProfit: s.grossProfit,
      operatingIncome: s.operatingIncome,
      ebit: s.ebit,
      netIncome: s.netIncome,
      totalAssets: s.totalAssets,
      totalLiabilities: s.totalLiabilities,
      totalEquity: s.totalEquity,
      cash: null,
      longTermDebt: null,
      dividendsPaid: null,
      basicEarningsPerCommonShare: null,
      source: "cvm-seed",
    });
  }

  // Add/merge Brapi quarterly (Brapi values win for fields Brapi has)
  for (const q of brapiIncome) {
    const existing = merged.get(q.endDate);
    const mergedQuarter: MergedQuarter = existing ?? {
      endDate: q.endDate,
      totalRevenue: null,
      grossProfit: null,
      operatingIncome: null,
      ebit: null,
      netIncome: null,
      totalAssets: null,
      totalLiabilities: null,
      totalEquity: null,
      cash: null,
      longTermDebt: null,
      dividendsPaid: null,
      basicEarningsPerCommonShare: null,
      source: "brapi",
    };
    mergedQuarter.totalRevenue = q.totalRevenue ?? mergedQuarter.totalRevenue;
    mergedQuarter.grossProfit = q.grossProfit ?? mergedQuarter.grossProfit;
    mergedQuarter.operatingIncome = q.operatingIncome ?? mergedQuarter.operatingIncome;
    mergedQuarter.ebit = q.ebit ?? mergedQuarter.ebit;
    mergedQuarter.netIncome = q.netIncome ?? mergedQuarter.netIncome;
    mergedQuarter.basicEarningsPerCommonShare = q.basicEarningsPerCommonShare;
    mergedQuarter.source = existing ? "brapi+cvm" : "brapi";
    merged.set(q.endDate, mergedQuarter);
  }

  // Add Brapi balance sheet
  for (const b of brapiBalance) {
    const existing = merged.get(b.endDate);
    if (existing) {
      existing.totalAssets = b.totalAssets ?? existing.totalAssets;
      existing.totalLiabilities = b.totalLiab ?? existing.totalLiabilities;
      existing.totalEquity = b.totalStockholderEquity ?? existing.totalEquity;
      existing.cash = b.cash ?? existing.cash;
      existing.longTermDebt = b.longTermDebt ?? existing.longTermDebt;
    } else {
      merged.set(b.endDate, {
        endDate: b.endDate,
        totalRevenue: null,
        grossProfit: null,
        operatingIncome: null,
        ebit: null,
        netIncome: null,
        totalAssets: b.totalAssets,
        totalLiabilities: b.totalLiab,
        totalEquity: b.totalStockholderEquity,
        cash: b.cash,
        longTermDebt: b.longTermDebt,
        dividendsPaid: null,
        basicEarningsPerCommonShare: null,
        source: "brapi",
      });
    }
  }

  // Add Brapi cashflow (dividendsPaid)
  for (const c of brapiCashflow) {
    const existing = merged.get(c.endDate);
    if (existing) {
      existing.dividendsPaid = c.dividendsPaid ?? existing.dividendsPaid;
    }
  }

  // Sort by date ascending
  const allQuarters = Array.from(merged.values()).sort((a, b) =>
    a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0,
  );

  if (allQuarters.length < 4) {
    // Not enough to compute TTM; fall back to Brapi-only
    return computeTTM(brapiIncome, brapiBalance, brapiCashflow, brapiDividends);
  }

  // Take last 4 quarters
  const last4 = allQuarters.slice(-4);

  const sumNum = (xs: Array<number | null>): number | null => {
    const valid = xs.filter((v): v is number => v != null && Number.isFinite(v));
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0);
  };

  const revenue = sumNum(last4.map((q) => q.totalRevenue));
  const grossProfit = sumNum(last4.map((q) => q.grossProfit));
  const operatingIncome = sumNum(last4.map((q) => q.operatingIncome));
  const netIncome = sumNum(last4.map((q) => q.netIncome));
  // Prefer EPS from TTM netIncome / current sharesOutstanding (works for any
  // quarter coverage including CVM-seed Q where Brapi has no EPS). This is more
  // robust than summing per-quarter EPS because Brapi can be missing quarters.
  // netIncome is in BRL, sharesOutstanding is in absolute units -> multiply by 1000.
  const epsTTM =
    netIncome != null && sharesOutstanding != null && sharesOutstanding > 0
      ? netIncome / sharesOutstanding
      : sumNum(last4.map((q) => q.basicEarningsPerCommonShare));

  const latestQuarter = last4[last4.length - 1];
  const priorYear = String(Number(latestQuarter.endDate.slice(0, 4)) - 1);
  const monthDay = latestQuarter.endDate.slice(4);
  const prior = allQuarters.find(
    (q) => q.endDate.startsWith(priorYear) && q.endDate.endsWith(monthDay),
  );
  const epsLatest = last4[last4.length - 1].basicEarningsPerCommonShare;
  const epsYoYGrowth =
    epsLatest != null && prior?.basicEarningsPerCommonShare != null && prior.basicEarningsPerCommonShare > 0
      ? (epsLatest - prior.basicEarningsPerCommonShare) / prior.basicEarningsPerCommonShare
      : null;

  return {
    asOfQuarter: latestQuarter.endDate,
    quartersIncluded: last4.length,
    revenue,
    grossProfit,
    operatingIncome,
    netIncome,
    grossMargin: revenue && revenue > 0 ? grossProfit! / revenue : null,
    operatingMargin: revenue && revenue > 0 ? operatingIncome! / revenue : null,
    netMargin: revenue && revenue > 0 ? netIncome! / revenue : null,
    epsTTM,
    epsLatest,
    epsYoYGrowth,
    latestTotalEquity: latestQuarter.totalEquity,
    latestTotalAssets: latestQuarter.totalAssets,
    latestCash: latestQuarter.cash,
    latestLongTermDebt: latestQuarter.longTermDebt,
    dividendsPaidLast4Q: sumNum(last4.map((q) => q.dividendsPaid)),
    sourceQuarters: last4.map((q) => q.endDate),
  } satisfies TTMSummary;
}
