/**
 * lib/analytics/metrics-table.ts
 *
 * Builds the metric list consumed by `<MetricsTable>`. Each entry has:
 *   - the current value
 *   - the historical series (one per fiscal year)
 *   - the YoY and period-over-period variation percentages
 *
 * This is a pure function — no JSX, no React. The UI is in
 * `app/asset/[symbol]/components/metrics-table.tsx`.
 *
 * The list is hand-picked to match the spec sections 2-8. To add a new
 * metric: implement the extractor + add to METRICS.
 */

import { totalDebtOf } from "./roic-wacc";
import { computeYieldLiquido, dividendStreak } from "./yield-liquido";
import { computeAccrualsTimeline } from "./accruals";
import { computeFScoreTimeline } from "./fscore";
import { LABELS } from "./labels";
import { currentValue, historicalValue, type KeyStatisticsShape } from "./key-mapper";

export type Period = "1y" | "3y" | "5y" | "max";
export type ComparisonMode = "yoy" | "period";

export type MetricRow = {
  /** Stable key — matches LABELS keys where possible. */
  key: string;
  label: string;
  description: string;
  unit: string;
  category: MetricCategory;
  /** Current value (most recent fiscal year). */
  current: number | null;
  /** Variation vs the comparison anchor (YoY or period). null if not computable. */
  variationPercent: number | null;
  /** Direction hint for color (always "neutral" if variation is null). */
  direction: "up" | "down" | "neutral";
  /** Chronological-asc historical series (oldest first). */
  history: Array<{ endDate: string; value: number | null }>;
  /** Optional derived formatter — if absent, value is rendered raw. */
  format?: "currency" | "percent" | "multiple" | "number";
  /** Number of decimal places. Default: 2. */
  decimals?: number;
};

export type MetricCategory =
  | "valuation"
  | "rentabilidade"
  | "qualidade"
  | "capital"
  | "proventos"
  | "dva"
  | "risco";

export const CATEGORY_ORDER: MetricCategory[] = [
  "valuation",
  "rentabilidade",
  "qualidade",
  "capital",
  "proventos",
  "dva",
  "risco",
];

export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  valuation: "Valuation",
  rentabilidade: "Rentabilidade",
  qualidade: "Qualidade",
  capital: "Capital",
  proventos: "Proventos",
  dva: "DVA",
  risco: "Risco",
};

export const PERIOD_LABELS: Record<Period, string> = {
  "1y": "1 ano",
  "3y": "3 anos",
  "5y": "5 anos",
  max: "máx.",
};

/** Years to look back per Period selection. */
function yearsForPeriod(p: Period): number {
  switch (p) {
    case "1y":
      return 1;
    case "3y":
      return 3;
    case "5y":
      return 5;
    case "max":
      return 16;
  }
}

/** Compute percent variation between two values. NaN-safe. */
function pct(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0 || !Number.isFinite(curr) || !Number.isFinite(prev)) {
    return null;
  }
  return ((curr - prev) / Math.abs(prev)) * 100;
}

/** Direction classifier — used only for color, not value semantics. */
function directionOf(v: number | null): "up" | "down" | "neutral" {
  if (v == null || !Number.isFinite(v)) return "neutral";
  if (v > 0.01) return "up";
  if (v < -0.01) return "down";
  return "neutral";
}

/** Build a row from a current + history. Handles variation calc. */
function buildRow(
  args: Omit<MetricRow, "variationPercent" | "direction" | "history"> & {
    history: Array<{ endDate: string; value: number | null }>;
  },
  period: Period,
  mode: ComparisonMode,
): MetricRow {
  const h = args.history;
  const curr = args.current;
  let variation: number | null = null;
  if (h.length >= 2 && curr != null) {
    if (mode === "yoy") {
      // Compare to 1 year back
      // A série vem em ordem DECRESCENTE da Brapi (mais recente primeiro).
      // O penúltimo mais recente (h[1]) é o ano anterior.
      const prev = h.length >= 2 ? h[1]?.value ?? null : null;
      variation = pct(curr, prev);
    } else {
      // period-over-period: índice decrescente: mais antigo está no fim
      const n = yearsForPeriod(period);
      // queremos comparar com h[n] (n posições antes do atual, em ordem decrescente)
      if (n < h.length) {
        const prev = h[n]?.value ?? null;
        variation = pct(curr, prev);
      } else {
        variation = null;
      }
    }
  }
  return { ...args, variationPercent: variation, direction: directionOf(variation) };
}

/**
 * Build the full metric list for a given bundle + period + comparison.
 */
/**
 * Loose shape consumed by buildMetricRows. The page-level adapter
 * converts whatever bundle source it has into this minimal shape.
 */
export type MetricsBundleInput = {
  quote: {
    regularMarketPrice: number | null;
    marketCap: number | null;
  };
  keyStatistics: {
    enterpriseValue: number | null;
    forwardPE: number | null;
    profitMargins: number | null;
    floatShares: number | null;
    sharesOutstanding: number | null;
    beta: number | null;
    bookValue: number | null;
    priceToBook: number | null;
    pegRatio: number | null;
    earningsPerShare: number | null;
    trailingEps: number | null;
    enterpriseToRevenue: number | null;
    enterpriseToEbitda: number | null;
    fiftyTwoWeekChange: number | null;
    yield: number | null;
    dividendYield: number | null;
    marketCap: number | null;
    priceEarnings: number | null;
  } | null;
  incomeStatementHistory: Array<{
    endDate: string;
    netIncome: number | null;
    cleanNopat: number | null;
  }>;
  balanceSheetHistory: Array<{
    endDate: string;
    cash: number | null;
    shareholdersEquity: number | null;
    totalAssets: number | null;
    /** Granular debt fields — at least one is required to compute totalDebtOf(). */
    loansAndFinancing?: number | null;
    longTermLoansAndFinancing?: number | null;
    debentures?: number | null;
    longTermDebentures?: number | null;
    longTermDebt?: number | null;
    shortLongTermDebt?: number | null;
  }>;
  cashflowHistory: Array<{
    endDate: string;
    operatingCashFlow: number | null;
    freeCashFlow: number | null;
  }>;
  keyStatisticsHistory: Array<{
    endDate: string;
    trailingPE: number | null;
    priceToBook: number | null;
    bookValue: number | null;
    enterpriseValue: number | null;
    enterpriseToRevenue: number | null;
    enterpriseToEbitda: number | null;
    marketCap: number | null;
    pegRatio: number | null;
    earningsPerShare: number | null;
    trailingEps: number | null;
    forwardPE: number | null;
    profitMargins: number | null;
    earningsQuarterlyGrowth: number | null;
    netIncomeToCommon: number | null;
    fiftyTwoWeekChange: number | null;
    lastDividendValue: number | null;
    lastDividendDate: string | null;
    dividendYield: number | null;
    yield: number | null;
  }>;
  dividends: Array<{
    rate: number;
    paymentDate: string;
    label: string;
    // additional fields ignored by consumers but kept loose for compatibility
    assetIssued?: string;
    approvedOn?: string | null;
    lastDatePrior?: string | null;
  }>;
};

/**
 * Look up trailing PE — Brapi v2's modules view stores it under
 * `defaultKeyStatistics.priceEarnings` rather than `quote.priceEarnings`.
 */
function trailingPEOf(bundle: MetricsBundleInput): number | null {
  const ks = bundle.keyStatistics;
  if (!ks) return null;
  return (
    (ks as { priceEarnings?: number | null }).priceEarnings ??
    (ks as { trailingPE?: number | null }).trailingPE ??
    null
  );
}

function epsOf(bundle: MetricsBundleInput): number | null {
  return bundle.keyStatistics?.earningsPerShare ?? null;
}

export function buildMetricRows(
  bundle: MetricsBundleInput,
  period: Period,
  mode: ComparisonMode,
): MetricRow[] {
  const rows: MetricRow[] = [];

  // ── Valuation ──────────────────────────────────────────────
  rows.push(
    buildRow(
      {
        key: "trailingPE",
        label: LABELS.trailingPE.label,
        description: LABELS.trailingPE.description,
        unit: LABELS.trailingPE.unit,
        category: "valuation",
        current: trailingPEOf(bundle),
        history: bundle.keyStatisticsHistory.map((r) => ({
          endDate: r.endDate,
          value: historicalValue("trailingPE", r as never),
        })),
        format: "multiple",
      },
      period,
      mode,
    ),
  );

  rows.push(
    buildRow(
      {
        key: "priceToBook",
        label: LABELS.priceToBook.label,
        description: LABELS.priceToBook.description,
        unit: LABELS.priceToBook.unit,
        category: "valuation",
        current: currentValue("priceToBook", bundle?.keyStatistics as KeyStatisticsShape),
        history: bundle.keyStatisticsHistory.map((r) => ({
          endDate: r.endDate,
          value: historicalValue("priceToBook", r as KeyStatisticsShape),
        })),
        format: "multiple",
      },
      period,
      mode,
    ),
  );

  rows.push(
    buildRow(
      {
        key: "enterpriseToEbitda",
        label: LABELS.enterpriseToEbitda.label,
        description: LABELS.enterpriseToEbitda.description,
        unit: LABELS.enterpriseToEbitda.unit,
        category: "valuation",
        current: currentValue("enterpriseToEbitda", bundle?.keyStatistics as KeyStatisticsShape),
        history: bundle.keyStatisticsHistory.map((r) => ({
          endDate: r.endDate,
          value: historicalValue("enterpriseToEbitda", r as KeyStatisticsShape),
        })),
        format: "multiple",
      },
      period,
      mode,
    ),
  );

  rows.push(
    buildRow(
      {
        key: "enterpriseValue",
        label: LABELS.enterpriseValue.label,
        description: LABELS.enterpriseValue.description,
        unit: LABELS.enterpriseValue.unit,
        category: "valuation",
        current: currentValue("enterpriseValue", bundle?.keyStatistics as KeyStatisticsShape),
        history: bundle.keyStatisticsHistory.map((r) => ({
          endDate: r.endDate,
          value: historicalValue("enterpriseValue", r as KeyStatisticsShape),
        })),
        format: "currency",
      },
      period,
      mode,
    ),
  );

  rows.push(
    buildRow(
      {
        key: "dividendYield",
        label: "Dividend Yield",
        description: "Yield bruto anualizado reportado pela Brapi.",
        unit: "%",
        category: "valuation",
        current: currentValue("dividendYield", bundle?.keyStatistics as KeyStatisticsShape),
        history: bundle.keyStatisticsHistory.map((r) => ({
          endDate: r.endDate,
          // dy já vem em % (key-mapper converte se necessário)
          value: historicalValue("dividendYield", r as KeyStatisticsShape),
        })),
        format: "percent",
      },
      period,
      mode,
    ),
  );

  // ── Rentabilidade / ROIC ──────────────────────────────────
  // ROIC per year. incomeStatementHistory and balanceSheetHistory are
  // both sorted ascending by endDate (parser contract); index alignment
  // is safe.
  const roicHistory = bundle.incomeStatementHistory
    .map((inc, i) => {
      const bs = bundle.balanceSheetHistory[i];
      if (!inc || !bs || inc.cleanNopat == null || bs.shareholdersEquity == null) {
        return { endDate: inc?.endDate ?? "", value: null };
      }
      const debt = totalDebtOf(bs as never) ?? 0;
      const cash = bs.cash ?? 0;
      const invested = bs.shareholdersEquity + debt - cash;
      if (invested <= 0) return { endDate: inc.endDate, value: null };
      return { endDate: inc.endDate, value: (inc.cleanNopat / invested) * 100 };
    })
    .filter((r) => r.endDate);

  rows.push(
    buildRow(
      {
        key: "roic",
        label: LABELS.roic.label,
        description: LABELS.roic.description,
        unit: LABELS.roic.unit,
        category: "rentabilidade",
        current: roicHistory[roicHistory.length - 1]?.value ?? null,
        history: roicHistory,
        format: "percent",
      },
      period,
      mode,
    ),
  );

  // ── Qualidade / Accruals ──────────────────────────────────
  // cashflowHistory, incomeStatementHistory, balanceSheetHistory all
  // sorted ascending — index alignment is safe.
  const accrualHistory = bundle.cashflowHistory
    .map((cf, i) => {
      const inc = bundle.incomeStatementHistory[i];
      const bs = bundle.balanceSheetHistory[i];
      if (!cf || !inc || !bs) return { endDate: cf?.endDate ?? "", value: null };
      const ni = inc.netIncome;
      const ocf = cf.operatingCashFlow;
      const ta = bs.totalAssets;
      if (ni == null || ocf == null || ta == null || ta <= 0) {
        return { endDate: cf.endDate, value: null };
      }
      return {
        endDate: cf.endDate,
        value: ((ni - ocf) / ta) * 100,
      };
    })
    .filter((r) => r.endDate);

  rows.push(
    buildRow(
      {
        key: "accruals",
        label: LABELS.accruals.label,
        description: LABELS.accruals.description,
        unit: LABELS.accruals.unit,
        category: "qualidade",
        current: accrualHistory[accrualHistory.length - 1]?.value ?? null,
        history: accrualHistory,
        format: "percent",
      },
      period,
      mode,
    ),
  );

  // ── Capital / Debt ────────────────────────────────────────
  const debtHistory = bundle.balanceSheetHistory
    .map((bs) => ({
      endDate: bs.endDate,
      value: totalDebtOf(bs as never),
    }));

  rows.push(
    buildRow(
      {
        key: "totalDebt",
        label: "Dívida bruta",
        description:
          "Soma das linhas granulares de Brapi v2 (loansAndFinancing, debentures, etc).",
        unit: "BRL",
        category: "capital",
        current: totalDebtOf(bundle.balanceSheetHistory[bundle.balanceSheetHistory.length - 1] as never) ?? null,
        history: debtHistory,
        format: "currency",
      },
      period,
      mode,
    ),
  );

  // ── Proventos / Yield líquido ─────────────────────────────
  const price = bundle.quote.regularMarketPrice;
  const yld = computeYieldLiquido(bundle.dividends as never, price);
  // Build a yearly yield series.
  const yearlyDividends = new Map<number, number>();
  const yearlyDividendsAfterTax = new Map<number, number>();
  for (const d of bundle.dividends) {
    const year = new Date(d.paymentDate).getUTCFullYear();
    if (!Number.isFinite(year)) continue;
    yearlyDividends.set(year, (yearlyDividends.get(year) ?? 0) + (d.rate ?? 0));
    const afterTax = d.label === "JCP" ? (d.rate ?? 0) * 0.85 : d.rate ?? 0;
    yearlyDividendsAfterTax.set(
      year,
      (yearlyDividendsAfterTax.get(year) ?? 0) + afterTax,
    );
  }
  const yieldHistory = [...yearlyDividends.keys()]
    .sort((a, b) => a - b)
    .map((year) => ({
      endDate: `${year}-12-31`,
      value: price != null && price > 0
        ? ((yearlyDividends.get(year) ?? 0) / price) * 100
        : null,
    }));

  rows.push(
    buildRow(
      {
        key: "yieldLiquido",
        label: LABELS.yieldLiquido.label,
        description: LABELS.yieldLiquido.description,
        unit: LABELS.yieldLiquido.unit,
        category: "proventos",
        current: yld.yieldLiquidoPercent,
        history: yieldHistory,
        format: "percent",
      },
      period,
      mode,
    ),
  );

  // ── Risco ────────────────────────────────────────────────
  rows.push(
    buildRow(
      {
        key: "beta",
        label: LABELS.beta.label,
        description: LABELS.beta.description,
        unit: LABELS.beta.unit,
        category: "risco",
        current: bundle.keyStatistics?.beta ?? null,
        history: [],
        format: "multiple",
      },
      period,
      mode,
    ),
  );

  return rows;
}

/**
 * Build the full series for the dropdown expansion (chronological asc).
 * Returns just endDate + value pairs so the row component is dumb.
 */
export type MetricSeries = Array<{ endDate: string; value: number | null }>;

/**
 * Helper for the expanded dropdown — computes YoY % between consecutive
 * historical entries.
 */
export function withYoYDelta(
  series: MetricSeries,
): Array<{ endDate: string; value: number | null; deltaPercent: number | null }> {
  const out: Array<{ endDate: string; value: number | null; deltaPercent: number | null }> = [];
  for (let i = 0; i < series.length; i++) {
    const curr = series[i];
    const prev = i > 0 ? series[i - 1] : null;
    out.push({ ...curr, deltaPercent: prev ? pct(curr.value, prev.value) : null });
  }
  return out;
}

// Re-export streak for header use
export { dividendStreak };
