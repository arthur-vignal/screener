/**
 * lib/analytics/key-mapper.ts
 *
 * Maps between Brapi's inconsistent field names (some on `quote`, some
 * on `defaultKeyStatistics`, some on `defaultKeyStatisticsHistory`) and
 * a single canonical key the rest of the analytics layer uses.
 *
 * Source-of-truth rules (2026-08-27 — Arthur's bug report):
 *
 *   - **P/L (trailingPE)**: prioriza `priceEarnings` (EOD), fallback
 *     `trailingPE` (live), fallback `keyStatistics.trailingPE` (snapshot).
 *     Cada fonte pode divergir durante o pregão — sem unificação, dois
 *     lugares da UI mostravam números diferentes pro mesmo ativo.
 *
 *   - **Dividend Yield**: a Brapi v2 retorna `dividendYield` como
 *     `unit='decimal'` (fração 0-1) e `yield` como `unit='%'` (já
 *     percentual). Preferimos `yield` quando existir; senão multiplicamos
 *     `dividendYield` por 100.
 *
 *   - **Outras métricas**: leem direto do `keyStatistics` correspondente.
 */

export type CanonicalField =
  | "trailingPE"
  | "priceToBook"
  | "bookValue"
  | "enterpriseValue"
  | "enterpriseToRevenue"
  | "enterpriseToEbitda"
  | "marketCap"
  | "dividendYield"
  | "earningsPerShare"
  | "pegRatio";

/**
 * Shape de entrada — mesma forma do `MetricsBundleInput.keyStatistics`.
 * Mantemos loose (`Record<string, unknown>`) pra tolerar campos extras
 * sem quebrar, e fazemos narrowing por chave.
 */
export type KeyStatisticsShape = Record<string, unknown>;

export function currentValue(
  field: CanonicalField,
  ks: KeyStatisticsShape | null | undefined,
): number | null {
  if (!ks) return null;
  switch (field) {
    case "trailingPE": {
      // priceEarnings (EOD) > trailingPE (live) > keyStatistics.trailingPE
      const pe = num(ks.priceEarnings) ?? num(ks.trailingPE);
      return pe;
    }
    case "priceToBook":
      return num(ks.priceToBook);
    case "bookValue":
      return num(ks.bookValue);
    case "enterpriseValue":
      return num(ks.enterpriseValue);
    case "enterpriseToRevenue":
      return num(ks.enterpriseToRevenue);
    case "enterpriseToEbitda":
      return num(ks.enterpriseToEbitda);
    case "marketCap":
      return num(ks.marketCap);
    case "dividendYield": {
      // yield (já em %) > dividendYield (decimal) * 100
      const y = num(ks.yield);
      if (y != null) return y;
      const dy = num(ks.dividendYield);
      if (dy != null) return dy * 100;
      return null;
    }
    case "earningsPerShare":
      return num(ks.earningsPerShare) ?? num(ks.trailingEps);
    case "pegRatio":
      return num(ks.pegRatio);
  }
}

/**
 * Extract a field from a BrapiKeyStatisticsHistory row.
 */
export function historicalValue(
  field: CanonicalField,
  row: KeyStatisticsShape,
): number | null {
  if (!row) return null;
  switch (field) {
    case "trailingPE":
      return num(row.trailingPE);
    case "priceToBook":
      return num(row.priceToBook);
    case "bookValue":
      return num(row.bookValue);
    case "enterpriseValue":
      return num(row.enterpriseValue);
    case "enterpriseToRevenue":
      return num(row.enterpriseToRevenue);
    case "enterpriseToEbitda":
      return num(row.enterpriseToEbitda);
    case "marketCap":
      return num(row.marketCap);
    case "dividendYield": {
      // yield (já %) > dividendYield (decimal) * 100
      const y = num(row.yield);
      if (y != null) return y;
      const dy = num(row.dividendYield);
      if (dy != null) return dy * 100;
      return null;
    }
    case "earningsPerShare":
      return num(row.earningsPerShare) ?? num(row.trailingEps);
    case "pegRatio":
      return num(row.pegRatio);
  }
}

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}
