/**
 * lib/analytics/key-mapper.ts
 *
 * Maps between Brapi's inconsistent field names (some on `quote`, some
 * on `defaultKeyStatistics`, some on `defaultKeyStatisticsHistory`) and
 * a single canonical key the rest of the analytics layer uses.
 *
 * Why this exists: Brapi v2 returns:
 *   - current snapshot trailing PE under `quote.priceEarnings`
 *   - historical trailing PE under `defaultKeyStatisticsHistory[i].trailingPE`
 *
 * These should not require manual disambiguation at every call site.
 */

import type { BrapiFull, BrapiQuote, BrapiKeyStatistics } from "@/lib/brapi-full";

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

export function currentValue(
  field: CanonicalField,
  bundle: Pick<BrapiFull, "quote" | "keyStatistics">,
): number | null {
  const q = bundle.quote;
  const ks = bundle.keyStatistics;
  switch (field) {
    case "trailingPE":
      // Current snapshot uses `quote.priceEarnings` (NOT keyStatistics.trailingPE).
      return q.priceEarnings ?? null;
    case "priceToBook":
      return ks?.priceToBook ?? null;
    case "bookValue":
      return ks?.bookValue ?? null;
    case "enterpriseValue":
      return ks?.enterpriseValue ?? null;
    case "enterpriseToRevenue":
      return ks?.enterpriseToRevenue ?? null;
    case "enterpriseToEbitda":
      return ks?.enterpriseToEbitda ?? null;
    case "marketCap":
      // quote.marketCap is the live value; keyStatistics.marketCap is historical.
      return q.marketCap ?? null;
    case "dividendYield":
      return ks?.yield ?? null;
    case "earningsPerShare":
      return q.earningsPerShare ?? null;
    case "pegRatio":
      return ks?.pegRatio ?? null;
  }
}

/**
 * Extract a field from a BrapiKeyStatisticsHistory row. Wraps the
 * bracket-access for fields starting with a digit.
 */
export function historicalValue(
  field: CanonicalField,
  row: { trailingPE: number | null; priceToBook: number | null; bookValue: number | null; enterpriseValue: number | null; enterpriseToRevenue: number | null; enterpriseToEbitda: number | null; marketCap: number | null; dividendYield: number | null; yield: number | null; earningsPerShare: number | null; pegRatio: number | null },
): number | null {
  switch (field) {
    case "trailingPE":
      return row.trailingPE;
    case "priceToBook":
      return row.priceToBook;
    case "bookValue":
      return row.bookValue;
    case "enterpriseValue":
      return row.enterpriseValue;
    case "enterpriseToRevenue":
      return row.enterpriseToRevenue;
    case "enterpriseToEbitda":
      return row.enterpriseToEbitda;
    case "marketCap":
      return row.marketCap;
    case "dividendYield":
      return row.dividendYield ?? row.yield;
    case "earningsPerShare":
      return row.earningsPerShare;
    case "pegRatio":
      return row.pegRatio;
  }
}
