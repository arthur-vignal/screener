"use client";

/**
 * QuarterResults — visual estilo Fey TSLA:
 *   1. Mini bar chart de revenue trend (últimos 5 quarters)
 *      - Barras verdes se revenue subiu vs quarter anterior
 *      - Barras vermelhas se caiu
 *      - Valor (R$X.XB) + variação % (▲ +12% / ▼ -8%) embaixo
 *   2. Grid de cards (5 últimos quarters + 1 projected)
 *
 * Card layout (replica print Fey):
 *   ┌─────────────┐
 *   │ Q2 2024     │
 *   │ Beat        │
 *   │ 0.72  $25B  │   ← EPS pill + Revenue compact
 *   │ Actual EPS  │
 *   │ +20.49% YoY │
 *   └─────────────┘
 *
 * Dados REAIS: brapi incomeStatementHistoryQuarterly.
 * Status "missed/beat" é heurístico: EPS caiu > 5% vs Q anterior
 * = missed, subiu > 5% = beat, senão flat. Brapi não dá consenso.
 */

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";
import type { JSX } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  /** Lista de quarters completa (ordenada asc) — usada pro mini chart
   *  de revenue trend. Se omitida, usa `results`. */
  quarters?: Array<{
    endDate: string;
    epsBasic: number | null;
    revenue: number | null;
  }>;
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

/** Formata um número grande em string curta (R$127B, R$1.5B, R$250M). */
function formatCompact(v: number, currency: "BRL" | "USD"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${symbol}${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${symbol}${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${symbol}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${symbol}${(v / 1e3).toFixed(1)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

export function QuarterResults({
  results,
  quarters,
  currency,
  className,
}: Props): JSX.Element {
  const revenueChartData = useMemo(() => {
    const src =
      quarters && quarters.length > 0
        ? quarters
        : results.map((r) => ({
            endDate: r.label,
            epsBasic: r.eps,
            revenue: r.revenue,
          }));
    // Pega últimos 5 com revenue != null
    const withRev = src
      .filter(
        (q): q is { endDate: string; epsBasic: number | null; revenue: number } =>
          q.revenue != null,
      )
      // ordena asc pra calcular QoQ corretamente
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
    const last = withRev.slice(-5);
    return last.map((q, i, arr) => {
      const prev = i > 0 ? arr[i - 1] : null;
      // Variação vs quarter anterior (QoQ), não YoY — brapi não dá
      // consensus, então QoQ é o que temos de mais direto.
      const changePct =
        prev && prev.revenue !== 0
          ? ((q.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100
          : null;
      return {
        index: i,
        label: formatQuarterLabel(q.endDate),
        revenue: q.revenue,
        changePct,
      };
    });
  }, [quarters, results]);

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
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Bar chart de revenue trend (últimos 5 quarters) */}
      {revenueChartData.length >= 2 && (
        <RevenueBars data={revenueChartData} currency={currency} />
      )}

      {/* Cards grid */}
      <div className={cn("grid gap-3", gridColsFor(results.length))}>
        {results.map((r, idx) => (
          <QuarterCard key={`${r.label}-${idx}`} result={r} currency={currency} />
        ))}
      </div>
    </div>
  );
}

/** Bar chart horizontal de revenue por quarter com cor por QoQ. */
function RevenueBars({
  data,
  currency,
}: {
  data: Array<{ label: string; revenue: number; changePct: number | null; index: number }>;
  currency: "BRL" | "USD";
}): JSX.Element {
  return (
    <div className="rounded-lg bg-[#08090c] border border-white/[0.04] px-4 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
          Revenue (5Q)
        </div>
        <div className="text-[10px] text-muted-foreground/60 tabular-nums">
          {formatCompact(data[data.length - 1].revenue, currency)}
        </div>
      </div>
      <div className="h-[100px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            barCategoryGap="22%"
          >
            <XAxis
              dataKey="label"
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis hide={true} domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as
                  | { label: string; revenue: number; changePct: number | null }
                  | undefined;
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-muted-foreground/70">
                      {d.label}
                    </div>
                    <div className="text-[12px] font-semibold tabular-nums text-foreground">
                      {formatCompact(d.revenue, currency)}
                    </div>
                    {d.changePct != null && (
                      <div
                        className={cn(
                          "text-[10px] tabular-nums mt-0.5",
                          d.changePct >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]",
                        )}
                      >
                        {d.changePct >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(d.changePct).toFixed(1)}% QoQ
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="revenue"
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((d, idx) => {
                const isUp = d.changePct != null && d.changePct >= 0;
                return (
                  <Cell
                    key={`cell-${idx}`}
                    fill={isUp ? "var(--positive)" : "var(--negative)"}
                    fillOpacity={0.85}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Labels embaixo: valor + variação QoQ por quarter */}
      <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, idx) => {
          const changeLabel =
            d.changePct == null
              ? "—"
              : `${d.changePct >= 0 ? "+" : "−"}${Math.abs(d.changePct).toFixed(1)}%`;
          const isUp = d.changePct != null && d.changePct >= 0;
          return (
            <div
              key={`label-${idx}`}
              className="flex flex-col items-center text-center"
            >
              <div className="text-[10px] tabular-nums font-semibold text-foreground/85">
                {formatCompact(d.revenue, currency)}
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-0.5 text-[9px] tabular-nums font-medium mt-0.5",
                  d.changePct == null
                    ? "text-muted-foreground/40"
                    : isUp
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]",
                )}
              >
                {d.changePct != null &&
                  (isUp ? (
                    <ArrowUp className="h-2.5 w-2.5" strokeWidth={2.5} />
                  ) : (
                    <ArrowDown className="h-2.5 w-2.5" strokeWidth={2.5} />
                  ))}
                {changeLabel}
              </div>
            </div>
          );
        })}
      </div>
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
          : "border-white/[0.06] bg-[#0d0d11]",
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
                : "text-foreground/85",
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
                : "bg-[var(--negative)]/15 text-[var(--negative)]",
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
              : "text-[var(--negative)]",
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

// Helper: formata endDate (ISO "YYYY-MM-DD") pra "Q1 2024"
function formatQuarterLabel(endDate: string): string {
  if (endDate === "TTM") return "TTM";
  // já pode estar formatado como "Q1 2024"
  if (/^Q\d \d{4}$/.test(endDate)) return endDate;
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}
