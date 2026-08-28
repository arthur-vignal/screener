"use client";

/**
 * QuarterResults — grid de cards com resultados trimestrais (estilo Fey TSLA).
 *
 * Dados REAIS de `bundle.historicals.incomeQuarterly`:
 *   - endDate: quarter end
 *   - basicEarningsPerShare
 *   - dilutedEarningsPerShare
 *   - totalRevenue
 *
 * Sem "Beat/Miss" badge porque brapi NÃO retorna estimativa de
 * consenso pré-resultado. Badge é "Actual" (passado) ou "Projected"
 * (próximo quarter, baseado em bundle.metrics.forwardEps / 4).
 */

import { TrendingDown, TrendingUp } from "lucide-react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type QuarterResult = {
  /** Quarter label "Q1 2024". */
  label: string;
  /** "Actual" (passado) ou "Projected" (próximo). */
  status: "actual" | "projected";
  /** EPS básico. */
  eps: number | null;
  /** Revenue total no quarter. */
  revenue: number | null;
  /** Variação % vs quarter anterior (calculado). */
  revenueChangePct: number | null;
};

type Props = {
  results: QuarterResult[];
  currency: "BRL" | "USD";
  className?: string;
};

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
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3",
        className
      )}
    >
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtCompact = (v: number) =>
    v.toLocaleString("en-US", {
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
      {/* Header: quarter label + status */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.14em] font-medium">
          {result.label}
        </span>
        <span
          className={cn(
            "text-[12px] font-semibold",
            isProjected ? "text-muted-foreground/70" : "text-foreground"
          )}
        >
          {isProjected ? "Projected" : "Actual"}
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
            {result.eps.toLocaleString("en-US", { maximumFractionDigits: 2 })}
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

      {/* Label + variação */}
      <p className="text-[11px] text-muted-foreground/70">
        {isProjected ? "Estimativa EPS" : "EPS real"}
      </p>

      {result.revenueChangePct != null && !isProjected && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[11px] tabular-nums",
            result.revenueChangePct >= 0
              ? "text-[var(--positive)]"
              : "text-[var(--negative)]"
          )}
        >
          {result.revenueChangePct >= 0 ? (
            <TrendingUp className="h-3 w-3" strokeWidth={2.25} />
          ) : (
            <TrendingDown className="h-3 w-3" strokeWidth={2.25} />
          )}
          {Math.abs(result.revenueChangePct).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
