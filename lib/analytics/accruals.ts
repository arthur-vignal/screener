/**
 * lib/analytics/accruals.ts
 *
 * Section 4 of the spec — quality of earnings.
 *
 * Accruals = (Net Income − Operating Cash Flow) / Total Assets
 *
 * High accruals historically anticipate earnings reversal — the company
 * is booking paper profits that don't show up in cash.
 *
 * cashConversion = FCF / Net Income — companion metric.
 */

import type { BrapiBalanceSheet, BrapiCashflow } from "@/lib/brapi-full";

export type AccrualsResult = {
  /** Latest single-year accruals, percent. */
  currentPercent: number | null;
  /** 5y average accruals. */
  avg5yPercent: number | null;
  /** Series (chronological asc) for the chart. */
  series: Array<{ endDate: string; accrualsPercent: number | null; cashConversionPercent: number | null }>;
};

/**
 * Compute accruals + cash conversion for one fiscal year.
 *
 * Returns null for both if any required field is missing.
 */
export function accrualsOf(
  income: { netIncome: number | null; endDate: string },
  balance: BrapiBalanceSheet,
  cashflow: BrapiCashflow,
): { endDate: string; accrualsPercent: number | null; cashConversionPercent: number | null } {
  const { netIncome } = income;
  const ocf = cashflow.operatingCashFlow;
  const fcf = cashflow.freeCashFlow;
  const assets = balance.totalAssets;

  const accrualsPct =
    netIncome != null && ocf != null && assets != null && assets > 0
      ? ((netIncome - ocf) / assets) * 100
      : null;

  const convPct =
    netIncome != null && netIncome > 0 && fcf != null
      ? (fcf / netIncome) * 100
      : null;

  return { endDate: income.endDate, accrualsPercent: accrualsPct, cashConversionPercent: convPct };
}

/**
 * Compute accruals series across the full history.
 *
 * `history` is an array of (income, balance, cashflow) tuples in
 * chronological order. Caller is responsible for aligning the years.
 */
export function computeAccrualsTimeline(
  history: Array<{
    income: { netIncome: number | null; endDate: string };
    balance: BrapiBalanceSheet;
    cashflow: BrapiCashflow;
  }>,
): AccrualsResult {
  const series = history.map((h) => accrualsOf(h.income, h.balance, h.cashflow));
  const valid = series.filter((s) => s.accrualsPercent != null);
  const avg5yPercent =
    valid.length > 0
      ? valid.slice(-5).reduce((a, b) => a + (b.accrualsPercent ?? 0), 0) /
        Math.min(5, valid.length)
      : null;

  return {
    currentPercent: series[series.length - 1]?.accrualsPercent ?? null,
    avg5yPercent,
    series,
  };
}
