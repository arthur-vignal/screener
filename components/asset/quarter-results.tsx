"use client";

/**
 * QuarterResults — grid de cards com resultados trimestrais (estilo Fey TSLA).
 *
 * Visual (replica o print Fey TSLA):
 *   ┌─────────────┬─────────────┬─────────────┬─────────────┐
 *   │ Q2 2024     │ Q3 2024     │ Q4 2024     │ Projected Q1 │
 *   │ Miss        │ Beat        │ Miss        │ Apr 24       │
 *   │ 0.52  $25B  │ 0.72  $25B  │ 0.73  $25B  │ 0.52  $23B  │
 *   │ Actual EPS  │             │             │             │
 *   │ 16.15%      │ 20.49%      │ 4.83%       │             │
 *   └─────────────┴─────────────┴─────────────┴─────────────┘
 *
 * - 4 cards lado a lado (3 últimos + 1 projected)
 * - Status badge: Miss / Beat / Projected (heurístico vs quarter anterior)
 * - EPS pill (verde/vermelho) + Revenue compact
 * - Variação % vs year-ago quarter (calculada)
 * - "View all estimates" link
 *
 * Dados REAIS: brapi incomeStatementHistoryQuarterly.
 * Status "missed/beat" é heurístico: EPS caiu > 5% vs Q anterior
 * = missed, subiu > 5% = beat, senão flat. Brapi não dá consenso.
 */

import { ArrowDown, ArrowUp } from "lucide-react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type QuarterResult = {
  /** Quarter label "Q1 2024". */
  label: string;
  /** "Actual" (passado) ou "Projected" (próximo). */
  status: "actual" | "projected";
  /** Label grande (ex: "Miss", "Beat", "Projected Q1 date"). */
  headline: string;
  /** Status heurístico: missed/beat/flat. */
  trend: "missed" | "beat" | "flat";
  /** EPS básico. */
  eps: number | null;
  /** Revenue total no quarter. */
  revenue: number | null;
  /** Variação % vs year-ago quarter (calculada). */
  yoyChangePct: number | null;
};

type Props = {
  results: QuarterResult[];
  currency: "BRL" | "USD";
  className?: string;
};

/** Decide número de colunas baseado na quantidade de results. */
function gridColsFor(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  if (n === 3) return "grid-cols-3";
  if (n === 4) return "grid-cols-2 md:grid-cols-4";
  return "grid-cols-2 lg:grid-cols-4";
}

export function QuarterResults({
  results,
  currency,
  className,
}: Props): JSX.Element {
  if (results.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-[13px] text-muted-foreground/85">
          Sem dados de quarters disponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", gridColsFor(results.length), className)}>
      {results.map((r, idx) => (
        <QuarterCard key={`${r.label}-${idx}`} result={r} currency={currency} />
      ))}
    </div>
  );
}

function QuarterCard({
  result,
  currency,
}: {
  result: QuarterResult;
  currency: "BRL" | "USD";
}): JSX.Element {
  const fmtCurrency = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });

  const fmtCompact = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    });

  const isProjected = result.status === "projected";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isProjected
          ? "border-white/[0.06] bg-white/[0.02]"
          : "border-white/[0.06] bg-[#0d0d11]"
      )}
    >
      {/* Header: quarter label + headline (Miss/Beat/Projected) */}
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <span className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.14em] font-medium">
          {result.label}
        </span>
        <span
          className={cn(
            "text-[14px] font-semibold",
            result.trend === "beat"
              ? "text-[var(--positive)]"
              : result.trend === "missed"
                ? "text-[var(--negative)]"
                : "text-foreground/85"
          )}
        >
          {result.headline}
        </span>
      </div>

      {/* EPS pill + Revenue */}
      <div className="flex items-center gap-2 mb-3">
        {result.eps != null ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[14px] font-semibold tabular-nums",
              result.eps >= 0
                ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                : "bg-[var(--negative)]/15 text-[var(--negative)]"
            )}
          >
            {result.eps.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground/40">—</span>
        )}
        {result.revenue != null && (
          <span className="text-[13px] text-foreground/85 tabular-nums">
            {fmtCompact(result.revenue)}
          </span>
        )}
      </div>

      {/* Label "Actual EPS / Revenue" */}
      <p className="text-[11px] text-muted-foreground/70 mb-2">
        {isProjected ? "Projected EPS" : "Actual EPS / Revenue"}
      </p>

      {/* Variação % vs year-ago */}
      {result.yoyChangePct != null && !isProjected && (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-[11px] tabular-nums",
            result.yoyChangePct >= 0
              ? "text-[var(--positive)]"
              : "text-[var(--negative)]"
          )}
        >
          {result.yoyChangePct >= 0 ? (
            <ArrowUp className="h-3 w-3" strokeWidth={2.25} />
          ) : (
            <ArrowDown className="h-3 w-3" strokeWidth={2.25} />
          )}
          {Math.abs(result.yoyChangePct).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
