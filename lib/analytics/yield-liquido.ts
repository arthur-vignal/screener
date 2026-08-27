/**
 * lib/analytics/yield-liquido.ts
 *
 * Section 6 of the spec. Differentiates dividend yield by the tax
 * treatment of each component:
 *   - DIVIDENDO: isento de IR pessoa física
 *   - JCP: tributado em 15% na fonte
 *
 * Two companies with the same gross yield can have very different
 * net yields once this distinction is applied. No Brazilian retail
 * platform publishes this — that's the differentiation.
 *
 * Also computes the streak (consecutive years paying) and a
 * payout-vs-retained-earnings sustainability ratio.
 */

import type { BrapiDividend } from "@/lib/brapi-full";

/** Brazilian withholding tax on JCP (15%). */
export const JCP_WITHHOLDING = 0.15;

export type YieldLiquidoResult = {
  /** grossYieldPercent: sum of last-12-month dividends / price × 100. */
  grossYieldPercent: number | null;
  /** Same as gross but with 15% tax applied only to JCP component. */
  yieldLiquidoPercent: number | null;
  /** Share of total dividends paid as JCP (0..1). */
  pctJCP: number | null;
  /** Sum of last 12 months of all dividends (before tax). */
  totalRate12m: number | null;
  /** Number of distinct calendar years with at least one payment. */
  yearsPaying: number | null;
  /** Most recent calendar year with a payment. */
  mostRecentYear: number | null;
};

function yearOf(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.getUTCFullYear() : null;
}

/**
 * Compute yield metrics from the cash dividends array + a current price.
 *
 * `dividends` is the full cashDividends[] from Brapi, sorted desc by
 * paymentDate. `price` is the current regularMarketPrice.
 */
export function computeYieldLiquido(
  dividends: BrapiDividend[],
  price: number | null,
): YieldLiquidoResult {
  if (price == null || price <= 0 || dividends.length === 0) {
    return {
      grossYieldPercent: null,
      yieldLiquidoPercent: null,
      pctJCP: null,
      totalRate12m: null,
      yearsPaying: null,
      mostRecentYear: null,
    };
  }

  // last 12 months from "now" — but we don't have a date param so use
  // the most recent paymentDate as the anchor (matches the spec which
  // talks about "últimos 12 meses relativos ao pagamento mais recente").
  const sorted = [...dividends].sort((a, b) =>
    a.paymentDate < b.paymentDate ? 1 : -1,
  );
  const mostRecent = sorted[0].paymentDate;
  const anchor = new Date(mostRecent).getTime();
  const cutoff = anchor - 365 * 24 * 60 * 60 * 1000;

  const last12 = sorted.filter((d) => {
    const t = new Date(d.paymentDate).getTime();
    return t >= cutoff && t <= anchor;
  });

  let gross = 0;
  let afterTax = 0;
  for (const d of last12) {
    const rate = d.rate ?? 0;
    gross += rate;
    if (d.label === "JCP") {
      afterTax += rate * (1 - JCP_WITHHOLDING);
    } else {
      afterTax += rate;
    }
  }

  const jcpSum = last12
    .filter((d) => d.label === "JCP")
    .reduce((s, d) => s + (d.rate ?? 0), 0);

  const yearsPayingSet = new Set<number>();
  for (const d of sorted) {
    const y = yearOf(d.paymentDate);
    if (y != null) yearsPayingSet.add(y);
  }
  const yearsPaying = yearsPayingSet.size;
  const mostRecentYear = yearOf(mostRecent);

  return {
    grossYieldPercent: (gross / price) * 100,
    yieldLiquidoPercent: (afterTax / price) * 100,
    pctJCP: gross > 0 ? (jcpSum / gross) * 100 : null,
    totalRate12m: gross,
    yearsPaying,
    mostRecentYear,
  };
}

/**
 * Streak — how many consecutive years (ending at the most recent year)
 * had at least one payment. Useful as a "consistency" badge.
 */
export function dividendStreak(dividends: BrapiDividend[]): {
  currentStreak: number;
  longestStreak: number;
  mostRecentYear: number | null;
} {
  if (dividends.length === 0) {
    return { currentStreak: 0, longestStreak: 0, mostRecentYear: null };
  }
  const yearsSet = new Set<number>();
  for (const d of dividends) {
    const y = yearOf(d.paymentDate);
    if (y != null) yearsSet.add(y);
  }
  const years = [...yearsSet].sort((a, b) => a - b);
  const mostRecentYear = years[years.length - 1];

  let longest = 0;
  let run = 0;
  for (let i = 0; i < years.length; i++) {
    if (i === 0 || years[i] === years[i - 1] + 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  // current streak = run starting from mostRecentYear backwards
  let current = 0;
  for (let i = years.length - 1; i >= 0; i--) {
    if (i === years.length - 1 || years[i] === years[i + 1] - 1) {
      current++;
    } else break;
  }

  return { currentStreak: current, longestStreak: longest, mostRecentYear };
}

/**
 * Payout sustainability: total dividends (cash + JCP) over net income.
 * >80% is generally a flag; <40% leaves room for reinvestment.
 */
export function payoutSustainability(
  dividends12m: number | null,
  netIncome: number | null,
): number | null {
  if (dividends12m == null || netIncome == null || netIncome <= 0) return null;
  return (dividends12m / netIncome) * 100;
}
