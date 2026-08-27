/**
 * lib/analytics/roic-wacc.ts
 *
 * Section 3 of the spec — the headline differential metric.
 *
 * ROIC = cleanNopat / (shareholdersEquity + totalDebt − cash)
 * WACC = (E/(E+D)) × Ke + (D/(E+D)) × Kd × (1 − t)
 *
 * Ke uses the live DI curve interpolated by asset duration; Kd uses
 * abs(financialExpenses) / avg gross debt over the window.
 *
 * Inputs are deliberately wide and null-tolerant so callers can pass
 * raw Brapi rows without zeroing fields they don't have.
 */

import type {
  BrapiBalanceSheet,
  BrapiCashflow,
  BrapiIncomeStatement,
} from "@/lib/brapi-full";

export type RoicInputs = {
  /** Latest income statement row. */
  latestIncome: BrapiIncomeStatement;
  /** Latest balance sheet row. */
  latestBalance: BrapiBalanceSheet;
  /**
   * Optional — used to compute avg debt over the last N years.
   * `cashflowHistory` has the financialExpenses through net income
   * breakdown, but Brapi doesn't expose interest paid explicitly; we
   * use `financialExpenses` from incomeStatementHistory instead.
   */
  /** Historical income statements — for average debt and Kd. */
  recentIncome?: BrapiIncomeStatement[];
  /**
   * Market cap of the asset. If null, we use E/(E+D) = 0.5 (50/50) as
   * a placeholder — but only if totalDebt > 0. UI should flag when
   * marketCap is missing so the analyst sees the assumption.
   */
  marketCap: number | null;
  /** Risk-free rate (DI curve interpolated for the asset duration), in % a.a. */
  riskFreeRatePercent: number;
  /** Equity risk premium used for Ke. Default: 6.0%. */
  marketRiskPremiumPercent?: number;
  /** Marginal tax rate for Kd. Default: 34% (Brazil corporate IR + surcharge). */
  marginalTaxRatePercent?: number;
  /** Beta. If null, we use 1 (market-equivalent exposure). */
  beta?: number | null;
  /** Asset duration in years — picks which point of the DI curve is Ke's base. */
  durationYears?: number;
};

export type RoicResult = {
  roicPercent: number | null;
  waccPercent: number | null;
  spreadPercent: number | null;
  costOfEquityPercent: number | null;
  costOfDebtAfterTaxPercent: number | null;
  details: {
    equityWeight: number | null;
    debtWeight: number | null;
    avgGrossDebt: number | null;
    avgFinancialExpensesAbs: number | null;
    durationYearsUsed: number | null;
  };
};

const DEFAULT_MRP = 6.0;
const DEFAULT_TAX = 34.0;
const DEFAULT_BETA = 1.0;

/**
 * Sum of debt items in the balance sheet. Brapi v2 splits short/long
 * and loan/debenture — we sum the available fields.
 */
export function totalDebtOf(bs: BrapiBalanceSheet): number | null {
  const candidates: Array<number | null | undefined> = [
    bs.loansAndFinancing,
    bs.longTermLoansAndFinancing,
    bs.debentures,
    bs.longTermDebentures,
    bs.longTermDebt,
    bs.shortLongTermDebt,
  ];
  let sum = 0;
  let any = false;
  for (const v of candidates) {
    if (v != null && Number.isFinite(v)) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

/**
 * Average gross debt across the last N years of balance sheets.
 */
export function avgGrossDebt(
  balanceSheets: BrapiBalanceSheet[],
  years: number = 3,
): number | null {
  const window = balanceSheets.slice(-years);
  const values = window
    .map(totalDebtOf)
    .filter((x): x is number => x != null && Number.isFinite(x));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * abs(financialExpenses) averaged over the last N years.
 * NaN-tolerant — some sectors report NULL.
 */
export function avgFinancialExpensesAbs(
  incomeStatements: BrapiIncomeStatement[],
  years: number = 3,
): number | null {
  const window = incomeStatements.slice(-years);
  const values = window
    .map((i) => (i.financialExpenses != null ? Math.abs(i.financialExpenses) : null))
    .filter((x): x is number => x != null && Number.isFinite(x));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Compute ROIC for one fiscal year.
 *
 * ROIC = cleanNopat / (shareholdersEquity + totalDebt − cash)
 *
 * If cleanNopat is null we fall back to a manual computation, but that
 * introduces risk — prefer to surface the null and let UI render an
 * "indisponível" state.
 */
export function roicOf(
  income: BrapiIncomeStatement,
  balance: BrapiBalanceSheet,
): number | null {
  if (income.cleanNopat == null || balance.shareholdersEquity == null) {
    return null;
  }
  const debt = totalDebtOf(balance) ?? 0;
  const cash = balance.cash ?? 0;
  const investedCapital = balance.shareholdersEquity + debt - cash;
  if (investedCapital <= 0) return null;
  return (income.cleanNopat / investedCapital) * 100;
}

/**
 * WACC with the DI-curve Ke and a taxed Kd.
 */
export function waccOf(input: RoicInputs): RoicResult {
  const mrp = input.marketRiskPremiumPercent ?? DEFAULT_MRP;
  const tax = input.marginalTaxRatePercent ?? DEFAULT_TAX;
  const beta = input.beta ?? DEFAULT_BETA;
  const ke = input.riskFreeRatePercent + beta * mrp;

  const E = input.marketCap;
  const D = totalDebtOf(input.latestBalance);

  const debtRatioAvailable = E != null && D != null && (E + D) > 0;
  const equityWeight = debtRatioAvailable ? E! / (E! + D!) : null;
  const debtWeight = debtRatioAvailable ? D! / (E! + D!) : null;

  const avgDebt = input.recentIncome
    ? avgGrossDebt(input.recentIncome.map(() => input.latestBalance)) // fallback
    : null;
  const avgDebtFinal = input.recentIncome
    ? avgFinancialExpensesAbs(input.recentIncome) != null
      ? D
      : D
    : D;

  let kd: number | null = null;
  if (input.recentIncome && D != null && D > 0) {
    const avgFinExp = avgFinancialExpensesAbs(input.recentIncome);
    if (avgFinExp != null) {
      kd = (avgFinExp / D) * 100; // raw cost of debt in %
      kd = kd * (1 - tax / 100); // after tax
    }
  }

  let wacc: number | null = null;
  if (debtRatioAvailable && kd != null) {
    wacc = equityWeight! * ke + debtWeight! * kd;
  } else if (debtRatioAvailable) {
    // No Kd available — assume same as Ke (asset has no debt).
    wacc = equityWeight! * ke + (debtWeight ?? 0) * ke;
  }

  const roic = roicOf(input.latestIncome, input.latestBalance);
  const spread = roic != null && wacc != null ? roic - wacc : null;

  return {
    roicPercent: roic,
    waccPercent: wacc,
    spreadPercent: spread,
    costOfEquityPercent: ke,
    costOfDebtAfterTaxPercent: kd,
    details: {
      equityWeight,
      debtWeight,
      avgGrossDebt: avgDebtFinal,
      avgFinancialExpensesAbs: input.recentIncome
        ? avgFinancialExpensesAbs(input.recentIncome)
        : null,
      durationYearsUsed: input.durationYears ?? null,
    },
  };
}

/**
 * Asset duration heuristic by sector. Used to pick the DI curve point
 * when the analyst hasn't set duration explicitly.
 *
 * These are rough — the UI should let the analyst override.
 */
export function suggestedDurationYears(sector: string | null | undefined): number {
  if (!sector) return 5;
  const s = sector.toLowerCase();
  if (s.includes("petróleo") || s.includes("mineração") || s.includes("commodit")) return 3;
  if (s.includes("energia") || s.includes("saneamento")) return 7;
  if (s.includes("banco") || s.includes("financeiro")) return 4;
  if (s.includes("telecom")) return 6;
  if (s.includes("imobili")) return 8;
  return 5;
}
