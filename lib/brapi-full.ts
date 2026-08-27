/**
 * Brapi wrapper — full fundamentals for BR tickers.
 *
 * Requires BRAPI_TOKEN env var. Bundles all available modules in a single
 * request: defaultKeyStatistics, financialData, incomeStatementHistory,
 * balanceSheetHistory, summaryProfile, dividendsData.
 *
 * All callers MUST treat the response as a partial — modules may be
 * unavailable on the user's plan. Normalize fields to null when missing.
 */

import { cached } from "./cache";

const BRAPI_BASE = "https://brapi.dev/api";

const FULL_MODULES = [
  "summaryProfile",
  "defaultKeyStatistics",
  "financialData",
  "incomeStatementHistory",
  "balanceSheetHistory",
  "incomeStatementHistoryQuarterly",
  "balanceSheetHistoryQuarterly",
  "defaultKeyStatisticsHistory",
  "defaultKeyStatisticsHistoryQuarterly",
  "cashflowHistory",
  "cashflowHistoryQuarterly",
].join(",");

export type BrapiQuote = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  currency: string;
  regularMarketPrice: number | null;
  regularMarketDayHigh: number | null;
  regularMarketDayLow: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
  regularMarketTime: string | null;
  regularMarketVolume: number | null;
  regularMarketPreviousClose: number | null;
  regularMarketOpen: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  priceEarnings: number | null;
  earningsPerShare: number | null;
  logourl: string | null;
  marketCap: number | null;
};

export type BrapiKeyStatistics = {
  enterpriseValue: number | null;
  forwardPE: number | null;
  profitMargins: number | null;
  floatShares: number | null;
  sharesOutstanding: number | null;
  beta: number | null;
  bookValue: number | null;
  priceToBook: number | null;
  pegRatio: number | null;
  earningsQuarterlyGrowth: number | null;
  netIncomeToCommon: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  enterpriseToRevenue: number | null;
  enterpriseToEbitda: number | null;
  fiftyTwoWeekChange: number | null;
  lastDividendValue: number | null;
  lastDividendDate: string | null;
  yield: number | null;
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
  marketCap: number | null;
};

export type BrapiFinancialData = {
  totalCash: number | null;
  totalCashPerShare: number | null;
  ebitda: number | null;
  totalDebt: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  totalRevenue: number | null;
  debtToEquity: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
  grossProfits: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  ebitdaMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
};

export type BrapiIncomeStatement = {
  endDate: string;
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebit: number | null;
  netIncome: number | null;
  researchDevelopment: number | null;
  sellingGeneralAdministrative: number | null;
  totalOperatingExpenses: number | null;
  /** NULL for some sectors (e.g. PETR4) — use `financialExpenses` as fallback in calculations. */
  interestExpense: number | null;
  /** Already-normalized NOPAT (excludes non-recurring). Use this for ROIC — DO NOT recompute from ebit*tax. */
  cleanNopat: number | null;
  /** Usually negative (expense). abs() it for Kd denominator. */
  financialExpenses: number | null;
  /** abs(financialExpenses) convenience for direct use in coverageOfInterest etc. */
  financialIncome: number | null;
  incomeTaxExpense: number | null;
};

export type BrapiBalanceSheet = {
  endDate: string;
  totalCurrentAssets: number | null;
  longTermInvestments: number | null;
  propertyPlantEquipment: number | null;
  totalAssets: number | null;
  totalCurrentLiabilities: number | null;
  totalLiab: number | null;
  /** Real field name in Brapi v2 is `shareholdersEquity` (not `totalStockholderEquity`). */
  shareholdersEquity: number | null;
  /** Real field name in Brapi v2 (not `totalStockholderEquity`). */
  retainedEarnings: number | null;
  netTangibleAssets: number | null;
  goodWill: number | null;
  intangibleAssets: number | null;
  /** Long-term portion of debt (loansAndFinancing + debentures etc) — Brapi v2 splits this from longTermDebt. */
  longTermLoansAndFinancing: number | null;
  longTermDebentures: number | null;
  /** Short-term portion. */
  loansAndFinancing: number | null;
  debentures: number | null;
  longTermDebt: number | null;
  shortLongTermDebt: number | null;
  cash: number | null;
  inventory: number | null;
  netReceivables: number | null;
};

export type BrapiIncomeStatementQuarterly = {
  endDate: string;
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebit: number | null;
  netIncome: number | null;
  totalOperatingExpenses: number | null;
  interestExpense: number | null;
  incomeTaxExpense: number | null;
  basicEarningsPerCommonShare: number | null;
  dilutedEarningsPerCommonShare: number | null;
  /** Reported in centavos (divide by 100 for BRL). */
  basicEarningsPerPreferredShare: number | null;
};

export type BrapiBalanceSheetQuarterly = {
  endDate: string;
  totalCurrentAssets: number | null;
  totalAssets: number | null;
  totalCurrentLiabilities: number | null;
  totalLiab: number | null;
  /** Brapi v2 field name. */
  shareholdersEquity: number | null;
  longTermDebt: number | null;
  cash: number | null;
  inventory: number | null;
  netReceivables: number | null;
};

export type BrapiCashflowQuarterly = {
  endDate: string;
  totalCashFromOperatingActivities: number | null;
  capitalExpenditures: number | null;
  freeCashFlow: number | null;
  dividendsPaid: number | null;
};

/**
 * Annual cash flow (up to 16 years per Brapi). The Brapi module is
 * `cashflowHistory` (singular, no Quarterly suffix) and contains
 * `operatingCashFlow` (not `cashGeneratedInOperations` as I initially
 * misread). Use this for long-horizon accruals + FCF conversion series.
 */
export type BrapiCashflow = {
  endDate: string;
  /** Real Brapi v2 field name for operating cash flow. */
  operatingCashFlow: number | null;
  /** Pre-OFCF adjustments sub-totals (kept for accruals debugging). */
  incomeFromOperations: number | null;
  changesInAssetsAndLiabilities: number | null;
  otherOperatingActivities: number | null;
  /** CapEx-implied; Brapi reports sign as negative for outflow. */
  investmentCashFlow: number | null;
  financingCashFlow: number | null;
  freeCashFlow: number | null;
  increaseOrDecreaseInCash: number | null;
  initialCashBalance: number | null;
  finalCashBalance: number | null;
};

/**
 * Annual key-statistics series (up to 16 years). Drives the historical
 * z-score in section 2 (Valuation): each year's multiple is a sample,
 * current year is z-scored against μ/σ of the series.
 *
 * Field names mirror `defaultKeyStatisticsHistory` from the Brapi
 * modules list. NOT the same as `defaultKeyStatistics` (current snapshot).
 */
export type BrapiKeyStatisticsHistory = {
  endDate: string;
  trailingPE: number | null;
  priceToBook: number | null;
  bookValue: number | null;
  enterpriseValue: number | null;
  enterpriseToRevenue: number | null;
  enterpriseToEbitda: number | null;
  price: number | null;
  marketCap: number | null;
  pegRatio: number | null;
  earningsPerShare: number | null;
  trailingEps: number | null;
  forwardPE: number | null;
  profitMargins: number | null;
  earningsQuarterlyGrowth: number | null;
  netIncomeToCommon: number | null;
  /** Brapi field name starts with digit — access as `row["52WeekChange"]`. */
  fiftyTwoWeekChange: number | null;
  lastDividendValue: number | null;
  lastDividendDate: string | null;
  dividendYield: number | null;
  yield: number | null;
};

export type BrapiDividend = {
  assetIssued: string;
  paymentDate: string;
  rate: number;
  approvedOn: string | null;
  label: string;
  lastDatePrior: string | null;
};

export type BrapiProfile = {
  longBusinessSummary: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  fullTimeEmployees: number | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
};

export type BrapiFull = {
  quote: BrapiQuote;
  keyStatistics: BrapiKeyStatistics | null;
  financialData: BrapiFinancialData | null;
  incomeStatementHistory: BrapiIncomeStatement[];
  balanceSheetHistory: BrapiBalanceSheet[];
  incomeStatementQuarterly: BrapiIncomeStatementQuarterly[];
  balanceSheetQuarterly: BrapiBalanceSheetQuarterly[];
  /** Annual cashflow (16y). Distinct from `cashflowQuarterly`. */
  cashflowHistory: BrapiCashflow[];
  cashflowQuarterly: BrapiCashflowQuarterly[];
  /** Annual key-statistics series — drives the valuation z-score. */
  keyStatisticsHistory: BrapiKeyStatisticsHistory[];
  dividends: BrapiDividend[];
  profile: BrapiProfile | null;
  source: "brapi-full";
  fetchedAt: string;
};

function getToken(): string | null {
  return process.env.BRAPI_TOKEN ?? null;
}

type RawBrapiResult = {
  symbol: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string;
  regularMarketVolume?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  priceEarnings?: number;
  earningsPerShare?: number;
  logourl?: string;
  marketCap?: number;
  defaultKeyStatistics?: Record<string, unknown>;
  /** Series version of `defaultKeyStatistics` — one row per fiscal year. */
  defaultKeyStatisticsHistory?: Array<Record<string, unknown>>;
  financialData?: Record<string, unknown>;
  incomeStatementHistory?: Array<Record<string, unknown>>;
  balanceSheetHistory?: Array<Record<string, unknown>>;
  incomeStatementHistoryQuarterly?: Array<Record<string, unknown>>;
  balanceSheetHistoryQuarterly?: Array<Record<string, unknown>>;
  /** Annual cash flow (Brapi module name). Distinct from the Quarterly variant below. */
  cashflowHistory?: Array<Record<string, unknown>>;
  cashflowHistoryQuarterly?: Array<Record<string, unknown>>;
  summaryProfile?: Record<string, unknown>;
  dividendsData?: { cashDividends?: Array<Record<string, unknown>> };
};

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return String(v);
}

function parseQuote(r: RawBrapiResult): BrapiQuote {
  return {
    symbol: r.symbol,
    shortName: str(r.shortName),
    longName: str(r.longName),
    currency: r.currency ?? "BRL",
    regularMarketPrice: num(r.regularMarketPrice),
    regularMarketDayHigh: num(r.regularMarketDayHigh),
    regularMarketDayLow: num(r.regularMarketDayLow),
    regularMarketChange: num(r.regularMarketChange),
    regularMarketChangePercent: num(r.regularMarketChangePercent),
    regularMarketTime: str(r.regularMarketTime),
    regularMarketVolume: num(r.regularMarketVolume),
    regularMarketPreviousClose: num(r.regularMarketPreviousClose),
    regularMarketOpen: num(r.regularMarketOpen),
    fiftyTwoWeekHigh: num(r.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(r.fiftyTwoWeekLow),
    priceEarnings: num(r.priceEarnings),
    earningsPerShare: num(r.earningsPerShare),
    logourl: str(r.logourl),
    marketCap: num(r.marketCap),
  };
}

function parseKeyStatistics(r: RawBrapiResult): BrapiKeyStatistics | null {
  if (!r.defaultKeyStatistics) return null;
  const k = r.defaultKeyStatistics;
  return {
    enterpriseValue: num(k.enterpriseValue),
    forwardPE: num(k.forwardPE),
    profitMargins: num(k.profitMargins),
    floatShares: num(k.floatShares),
    sharesOutstanding: num(k.sharesOutstanding),
    beta: num(k.beta),
    bookValue: num(k.bookValue),
    priceToBook: num(k.priceToBook),
    pegRatio: num(k.pegRatio),
    earningsQuarterlyGrowth: num(k.earningsQuarterlyGrowth),
    netIncomeToCommon: num(k.netIncomeToCommon),
    trailingEps: num(k.trailingEps),
    forwardEps: num(k.forwardEps),
    enterpriseToRevenue: num(k.enterpriseToRevenue),
    enterpriseToEbitda: num(k.enterpriseToEbitda),
    fiftyTwoWeekChange: num(k["52WeekChange"]),
    lastDividendValue: num(k.lastDividendValue),
    lastDividendDate: str(k.lastDividendDate),
    yield: num(k.yield),
    heldPercentInsiders: num(k.heldPercentInsiders),
    heldPercentInstitutions: num(k.heldPercentInstitutions),
    marketCap: num(k.marketCap),
  };
}

function parseFinancialData(r: RawBrapiResult): BrapiFinancialData | null {
  if (!r.financialData) return null;
  const f = r.financialData;
  return {
    totalCash: num(f.totalCash),
    totalCashPerShare: num(f.totalCashPerShare),
    ebitda: num(f.ebitda),
    totalDebt: num(f.totalDebt),
    quickRatio: num(f.quickRatio),
    currentRatio: num(f.currentRatio),
    totalRevenue: num(f.totalRevenue),
    debtToEquity: num(f.debtToEquity),
    returnOnAssets: num(f.returnOnAssets),
    returnOnEquity: num(f.returnOnEquity),
    grossProfits: num(f.grossProfits),
    freeCashflow: num(f.freeCashflow),
    operatingCashflow: num(f.operatingCashflow),
    earningsGrowth: num(f.earningsGrowth),
    revenueGrowth: num(f.revenueGrowth),
    grossMargins: num(f.grossMargins),
    ebitdaMargins: num(f.ebitdaMargins),
    operatingMargins: num(f.operatingMargins),
    profitMargins: num(f.profitMargins),
  };
}

function parseIncomeStatement(r: RawBrapiResult): BrapiIncomeStatement[] {
  if (!r.incomeStatementHistory) return [];
  return r.incomeStatementHistory
    .filter((row) => row.type === "yearly")
    .map((row) => ({
      endDate: str(row.endDate) ?? "",
      totalRevenue: num(row.totalRevenue),
      costOfRevenue: num(row.costOfRevenue),
      grossProfit: num(row.grossProfit),
      operatingIncome: num(row.operatingIncome),
      ebit: num(row.ebit),
      netIncome: num(row.netIncome),
      researchDevelopment: num(row.researchDevelopment),
      sellingGeneralAdministrative: num(row.sellingGeneralAdministrative),
      totalOperatingExpenses: num(row.totalOperatingExpenses),
      // interestExpense is often NULL (PETR4 example) — keep field for
      // type completeness; consumers should fall back to `financialExpenses`.
      interestExpense: num(row.interestExpense),
      // Already-normalized NOPAT (excludes non-recurring). For ROIC: use
      // cleanNopat directly, do NOT recompute from ebit*tax.
      cleanNopat: num(row.cleanNopat),
      // Usually negative (expense). abs() it for Kd denominator.
      financialExpenses: num(row.financialExpenses),
      financialIncome: num(row.financialIncome),
      incomeTaxExpense: num(row.incomeTaxExpense),
    }))
    .filter((row) => row.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
}

function parseBalanceSheet(r: RawBrapiResult): BrapiBalanceSheet[] {
  if (!r.balanceSheetHistory) return [];
  return r.balanceSheetHistory
    .filter((row) => row.type === "yearly")
    .map((row) => ({
      endDate: str(row.endDate) ?? "",
      totalCurrentAssets: num(row.totalCurrentAssets),
      longTermInvestments: num(row.longTermInvestments),
      propertyPlantEquipment: num(row.propertyPlantEquipment),
      totalAssets: num(row.totalAssets),
      totalCurrentLiabilities: num(row.totalCurrentLiabilities),
      totalLiab: num(row.totalLiab),
      // Brapi v2 field name (NOT totalStockholderEquity — that one comes
      // back NULL even on the response example I probed).
      shareholdersEquity: num(row.shareholdersEquity),
      retainedEarnings: num(row.retainedEarnings),
      netTangibleAssets: num(row.netTangibleAssets),
      goodWill: num(row.goodWill),
      intangibleAssets: num(row.intangibleAssets),
      // Debt granularity: Brapi v2 splits short/long and loan/debenture.
      // Sum these to get total debt for ROIC denominator.
      longTermLoansAndFinancing: num(row.longTermLoansAndFinancing),
      longTermDebentures: num(row.longTermDebentures),
      loansAndFinancing: num(row.loansAndFinancing),
      debentures: num(row.debentures),
      longTermDebt: num(row.longTermDebt),
      shortLongTermDebt: num(row.shortLongTermDebt),
      cash: num(row.cash),
      inventory: num(row.inventory),
      netReceivables: num(row.netReceivables),
    }))
    .filter((row) => row.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
}

function parseIncomeStatementQuarterly(r: RawBrapiResult): BrapiIncomeStatementQuarterly[] {
  if (!r.incomeStatementHistoryQuarterly) return [];
  return r.incomeStatementHistoryQuarterly
    .filter((row) => row.type === "quarterly")
    .map((row) => ({
      endDate: str(row.endDate) ?? "",
      totalRevenue: num(row.totalRevenue),
      costOfRevenue: num(row.costOfRevenue),
      grossProfit: num(row.grossProfit),
      operatingIncome: num(row.operatingIncome),
      ebit: num(row.ebit),
      netIncome: num(row.netIncome),
      totalOperatingExpenses: num(row.totalOperatingExpenses),
      interestExpense: num(row.interestExpense),
      incomeTaxExpense: num(row.incomeTaxExpense),
      // Brapi quarterly EPS is reported in thousandths of BRL
      // (PETR4 Q1 2026 = 2530 -> R$ 2.53). Divide by 1000 to get BRL.
      basicEarningsPerCommonShare: num(row.basicEarningsPerCommonShare) != null
        ? num(row.basicEarningsPerCommonShare)! / 1000
        : null,
      dilutedEarningsPerCommonShare: num(row.dilutedEarningsPerCommonShare) != null
        ? num(row.dilutedEarningsPerCommonShare)! / 1000
        : null,
      basicEarningsPerPreferredShare: num(row.basicEarningsPerPreferredShare) != null
        ? num(row.basicEarningsPerPreferredShare)! / 1000
        : null,
    }))
    .filter((row) => row.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
}

function parseBalanceSheetQuarterly(r: RawBrapiResult): BrapiBalanceSheetQuarterly[] {
  if (!r.balanceSheetHistoryQuarterly) return [];
  return r.balanceSheetHistoryQuarterly
    .filter((row) => row.type === "quarterly")
    .map((row) => ({
      endDate: str(row.endDate) ?? "",
      totalCurrentAssets: num(row.totalCurrentAssets),
      totalAssets: num(row.totalAssets),
      totalCurrentLiabilities: num(row.totalCurrentLiabilities),
      totalLiab: num(row.totalLiab),
      shareholdersEquity: num(row.shareholdersEquity),
      longTermDebt: num(row.longTermDebt),
      cash: num(row.cash),
      inventory: num(row.inventory),
      netReceivables: num(row.netReceivables),
    }))
    .filter((row) => row.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
}

function parseCashflowQuarterly(r: RawBrapiResult): BrapiCashflowQuarterly[] {
  if (!r.cashflowHistoryQuarterly) return [];
  return r.cashflowHistoryQuarterly
    .filter((row) => row.type === "quarterly")
    .map((row) => ({
      endDate: str(row.endDate) ?? "",
      totalCashFromOperatingActivities: num(row.totalCashFromOperatingActivities),
      capitalExpenditures: num(row.capitalExpenditures),
      freeCashFlow: num(row.freeCashFlow),
      dividendsPaid: num(row.dividendsPaid),
    }))
    .filter((row) => row.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
}

function parseKeyStatisticsHistory(r: RawBrapiResult): BrapiKeyStatisticsHistory[] {
  if (!r.defaultKeyStatisticsHistory) return [];
  return r.defaultKeyStatisticsHistory
    .filter((row) => row.type === "yearly")
    .map((row) => ({
      endDate: str(row.endDate) ?? "",
      trailingPE: num(row.trailingPE),
      priceToBook: num(row.priceToBook),
      bookValue: num(row.bookValue),
      enterpriseValue: num(row.enterpriseValue),
      enterpriseToRevenue: num(row.enterpriseToRevenue),
      enterpriseToEbitda: num(row.enterpriseToEbitda),
      price: num(row.price),
      marketCap: num(row.marketCap),
      pegRatio: num(row.pegRatio),
      earningsPerShare: num(row.earningsPerShare),
      trailingEps: num(row.trailingEps),
      forwardPE: num(row.forwardPE),
      profitMargins: num(row.profitMargins),
      earningsQuarterlyGrowth: num(row.earningsQuarterlyGrowth),
      netIncomeToCommon: num(row.netIncomeToCommon),
      // Brapi field name starts with digit — bracket-access the source row.
      fiftyTwoWeekChange: num(row["52WeekChange"]),
      lastDividendValue: num(row.lastDividendValue),
      lastDividendDate: str(row.lastDividendDate),
      dividendYield: num(row.dividendYield),
      yield: num(row.yield),
    }))
    .filter((row) => row.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
}

function parseCashflow(r: RawBrapiResult): BrapiCashflow[] {
  if (!r.cashflowHistory) return [];
  return r.cashflowHistory
    .filter((row) => row.type === "yearly")
    .map((row) => ({
      endDate: str(row.endDate) ?? "",
      operatingCashFlow: num(row.operatingCashFlow),
      incomeFromOperations: num(row.incomeFromOperations),
      changesInAssetsAndLiabilities: num(row.changesInAssetsAndLiabilities),
      otherOperatingActivities: num(row.otherOperatingActivities),
      investmentCashFlow: num(row.investmentCashFlow),
      financingCashFlow: num(row.financingCashFlow),
      freeCashFlow: num(row.freeCashFlow),
      increaseOrDecreaseInCash: num(row.increaseOrDecreaseInCash),
      initialCashBalance: num(row.initialCashBalance),
      finalCashBalance: num(row.finalCashBalance),
    }))
    .filter((row) => row.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));
}

function parseDividends(r: RawBrapiResult): BrapiDividend[] {
  const cash = r.dividendsData?.cashDividends ?? [];
  return cash
    .map((d) => ({
      assetIssued: str(d.assetIssued) ?? "",
      paymentDate: str(d.paymentDate) ?? "",
      rate: num(d.rate) ?? 0,
      approvedOn: str(d.approvedOn),
      label: str(d.label) ?? "DIVIDENDO",
      lastDatePrior: str(d.lastDatePrior),
    }))
    .filter((d) => d.paymentDate)
    .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1));
}

function parseProfile(r: RawBrapiResult): BrapiProfile | null {
  if (!r.summaryProfile) return null;
  const p = r.summaryProfile;
  return {
    longBusinessSummary: str(p.longBusinessSummary),
    sector: str(p.sector),
    industry: str(p.industry),
    website: str(p.website),
    fullTimeEmployees: num(p.fullTimeEmployees),
    country: str(p.country),
    state: str(p.state),
    city: str(p.city),
    address: str(p.address),
    phone: str(p.phone),
  };
}

/**
 * Fetch full Brapi bundle for a ticker. Returns null if BRAPI_TOKEN is unset
 * or the upstream fails. Cached for 30 minutes (modules don't change intra-day).
 */
export async function getBrapiFull(ticker: string): Promise<BrapiFull | null> {
  const token = getToken();
  if (!token) return null;
  const upper = ticker.toUpperCase();
  // NOTE: namespace is "brapi-full-v2:" (NOT "brapi:full:"). The
  // getBrapiFundamentals() function in lib/brapi.ts uses "brapi:full:"
  // for the same upstream endpoint but produces a DIFFERENT quote
  // shape (its own normalize() — { price, dayHigh, ... } vs our
  // parseQuote() — { regularMarketPrice, regularMarketDayHigh, ... }).
  // Sharing the cache key between two functions with different output
  // shapes causes the second caller to receive the wrong shape and
  // silently drop fields like price/prevClose/volume in the response.
  // The bug bit us in Aug 2026: prod /api/asset/[symbol] started
  // returning only 52w + marketCap (the 3 fields that happen to have
  // the same name in both shapes) while every other quote field came
  // back null.
  return cached(`brapi-full-v2:${upper}`, 30 * 60, async () => {
    const url = `${BRAPI_BASE}/quote/${upper}?modules=${FULL_MODULES}&dividends=true&token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!r.ok) {
      console.error(`[brapi-full] ${upper} ${r.status}`);
      return null;
    }
    const json = (await r.json()) as { results?: RawBrapiResult[] };
    const raw = json.results?.[0];
    if (!raw) return null;
    return {
      quote: parseQuote(raw),
      keyStatistics: parseKeyStatistics(raw),
      financialData: parseFinancialData(raw),
      incomeStatementHistory: parseIncomeStatement(raw),
      balanceSheetHistory: parseBalanceSheet(raw),
      incomeStatementQuarterly: parseIncomeStatementQuarterly(raw),
      balanceSheetQuarterly: parseBalanceSheetQuarterly(raw),
      cashflowHistory: parseCashflow(raw),
      cashflowQuarterly: parseCashflowQuarterly(raw),
      keyStatisticsHistory: parseKeyStatisticsHistory(raw),
      dividends: parseDividends(raw),
      profile: parseProfile(raw),
      source: "brapi-full",
      fetchedAt: new Date().toISOString(),
    } satisfies BrapiFull;
  });
}
