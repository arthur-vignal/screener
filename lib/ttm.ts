/**
 * TTM (Trailing Twelve Months) aggregation.
 *
 * Sums the last 4 reported quarters to produce a more current
 * representation than the latest annual report. StatusInvest / Investidor10
 * use this same approach to keep P/E, P/VP, ROE etc. fresh.
 *
 * Inputs: Brapi quarterly series (income statement, balance sheet, cashflow).
 * Output: aggregated metrics + the per-quarter series for charts.
 */

import type {
  BrapiIncomeStatementQuarterly,
  BrapiBalanceSheetQuarterly,
  BrapiCashflowQuarterly,
  BrapiDividend,
} from "./brapi-full";

export type TTMSummary = {
  /** End date of the most recent quarter used in the TTM window. */
  asOfQuarter: string;
  /** Number of quarters summed (1-4). */
  quartersIncluded: number;
  // DRE aggregates
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  // derived margins
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  // LPA TTM (em BRL, após normalização dos centavos)
  epsTTM: number | null;
  // último BPA (latest quarter, em BRL)
  epsLatest: number | null;
  // BPA vs quarter do ano anterior (1 year ago)
  epsYoYGrowth: number | null;
  // snapshot do último BPA disponível
  latestTotalEquity: number | null;
  latestTotalAssets: number | null;
  latestCash: number | null;
  latestLongTermDebt: number | null;
  // saldo agregado de dividendos nos últimos 4 quarters
  dividendsPaidLast4Q: number | null;
  /** Series used for the TTM (most recent 4 quarters, oldest → newest). */
  sourceQuarters: string[];
};

function sumN(
  values: Array<number | null>,
): number | null {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0);
}

function latestN<T>(
  arr: T[],
  n: number,
): T[] {
  return arr.slice(-n);
}

function lastValue<T>(
  arr: T[],
  pick: (item: T) => number | null | undefined,
): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = pick(arr[i]);
    if (v != null && Number.isFinite(v)) return v;
  }
  return null;
}

function findPriorYearQuarter<T extends { endDate: string }>(
  series: T[],
  latestQuarterEndDate: string,
): T | null {
  const latestYear = Number(latestQuarterEndDate.slice(0, 4));
  const monthDay = latestQuarterEndDate.slice(4); // "-MM-DD"
  const targetYear = String(latestYear - 1);
  return series.find((row) => row.endDate.startsWith(targetYear) && row.endDate.endsWith(monthDay)) ?? null;
}

/**
 * Compute TTM aggregates from Brapi quarterly series.
 *
 * @returns null if there are fewer than 4 reported quarters.
 */
export function computeTTM(
  income: BrapiIncomeStatementQuarterly[],
  balance: BrapiBalanceSheetQuarterly[],
  cashflow: BrapiCashflowQuarterly[],
  dividends: BrapiDividend[] = [],
): TTMSummary | null {
  if (income.length < 4) return null;
  const last4 = latestN(income, 4);
  const last4Balance = latestN(balance, 4);
  const last4Cashflow = latestN(cashflow, 4);

  const revenue = sumN(last4.map((q) => q.totalRevenue));
  const grossProfit = sumN(last4.map((q) => q.grossProfit));
  const operatingIncome = sumN(last4.map((q) => q.operatingIncome));
  const netIncome = sumN(last4.map((q) => q.netIncome));

  const epsTTM = sumN(
    last4.map((q) => q.basicEarningsPerCommonShare),
  );
  const epsLatest = lastValue(income, (q) => q.basicEarningsPerCommonShare);

  const latestQuarter = last4[last4.length - 1];
  const priorYearQuarter = findPriorYearQuarter(income, latestQuarter.endDate);
  const epsYoYGrowth =
    epsLatest != null && priorYearQuarter
      ? priorYearQuarter.basicEarningsPerCommonShare != null &&
        priorYearQuarter.basicEarningsPerCommonShare > 0
        ? (epsLatest - priorYearQuarter.basicEarningsPerCommonShare) /
          priorYearQuarter.basicEarningsPerCommonShare
        : null
      : null;

  const latestTotalEquity = lastValue(balance, (q) => q.totalStockholderEquity);
  const latestTotalAssets = lastValue(balance, (q) => q.totalAssets);
  const latestCash = lastValue(balance, (q) => q.cash);
  const latestLongTermDebt = lastValue(balance, (q) => q.longTermDebt);

  const dividendsPaidLast4Q = sumN(last4Cashflow.map((q) => q.dividendsPaid));

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
    latestTotalEquity,
    latestTotalAssets,
    latestCash,
    latestLongTermDebt,
    dividendsPaidLast4Q,
    sourceQuarters: last4.map((q) => q.endDate),
  };
}

/**
 * Derived metrics from TTM aggregates + Brapi quote snapshot.
 *
 * Use these instead of Brapi's `priceEarnings` field when you want
 * a more current signal (4 quarters including the latest reported).
 */
export function derivedTTMMetrics(
  ttm: TTMSummary,
  price: number | null,
  sharesOutstanding: number | null,
  enterpriseValue: number | null,
  bookValuePerShare: number | null,
  totalRevenueTTM: number | null,
  operatingIncomeTTM: number | null,
  netIncomeTTM: number | null,
): {
  peRatio: number | null;
  priceToBook: number | null;
  evEbitda: number | null;
  evRevenue: number | null;
  roe: number | null;
  roa: number | null;
  eps: number | null;
  revenuePerShare: number | null;
  earningsYield: number | null;
} {
  // P/E (TTM) = price / LPA-TTM
  let peRatio: number | null = null;
  if (price != null && ttm.epsTTM != null && ttm.epsTTM > 0) {
    peRatio = price / ttm.epsTTM;
  } else if (price != null && sharesOutstanding && sharesOutstanding > 0 && netIncomeTTM != null) {
    // Fallback: derive EPS from TTM netIncome / sharesOutstanding
    const epsDerived = (netIncomeTTM * 1000) / sharesOutstanding;
    if (epsDerived > 0) peRatio = price / epsDerived;
  }

  // P/VP — bookValuePerShare from Brapi is already a per-share value
  let priceToBook: number | null = null;
  if (price != null && bookValuePerShare != null && bookValuePerShare > 0) {
    priceToBook = price / bookValuePerShare;
  }

  // EV/EBITDA — we don't have TTM EBITDA direct, so use operatingIncome + D&A approx
  // Brapi's defaultKeyStatistics.enterpriseToEbitda is yearly; we keep it as fallback.
  // For TTM, we can use EV / (operatingIncome + estimated D&A) if EBITDA isn't available.
  const evEbitda = null; // computed in caller if operatingCashflow available

  // EV/Receita (TTM)
  let evRevenue: number | null = null;
  if (enterpriseValue != null && totalRevenueTTM != null && totalRevenueTTM > 0) {
    evRevenue = enterpriseValue / totalRevenueTTM;
  }

  // ROE (TTM) = TTM netIncome / latest equity
  let roe: number | null = null;
  if (netIncomeTTM != null && ttm.latestTotalEquity != null && ttm.latestTotalEquity > 0) {
    roe = netIncomeTTM / ttm.latestTotalEquity;
  }

  // ROA (TTM) = TTM netIncome / latest assets
  let roa: number | null = null;
  if (netIncomeTTM != null && ttm.latestTotalAssets != null && ttm.latestTotalAssets > 0) {
    roa = netIncomeTTM / ttm.latestTotalAssets;
  }

  // EPS = TTM EPS BRL
  const eps = ttm.epsTTM;

  // Receita / ação
  let revenuePerShare: number | null = null;
  if (totalRevenueTTM != null && sharesOutstanding != null && sharesOutstanding > 0) {
    revenuePerShare = (totalRevenueTTM * 1000) / sharesOutstanding;
  }

  // Earnings Yield = 1 / P/E
  let earningsYield: number | null = null;
  if (peRatio != null && peRatio > 0) earningsYield = 1 / peRatio;

  return {
    peRatio,
    priceToBook,
    evEbitda,
    evRevenue,
    roe,
    roa,
    eps,
    revenuePerShare,
    earningsYield,
  };
}

/**
 * Yield-on-price from the last 4 quarters of dividends (annualized).
 */
export function computeDividendYieldTTM(
  cashflow: BrapiCashflowQuarterly[],
  price: number | null,
  sharesOutstanding: number | null,
): number | null {
  if (cashflow.length < 4) return null;
  const last4 = latestN(cashflow, 4);
  const dividendsPaid = sumN(last4.map((q) => q.dividendsPaid));
  if (dividendsPaid == null || price == null || sharesOutstanding == null || sharesOutstanding <= 0) {
    return null;
  }
  // dividendsPaid is total cash outflow. Per share = dividendsPaid / sharesOutstanding.
  // Yield = per-share / price.
  const perShare = (dividendsPaid * 1000) / sharesOutstanding;
  return price > 0 ? perShare / price : null;
}
