"use client";

/**
 * QuarterResults — bar chart de revenue por quarter (estilo Fey TSLA).
 *
 * Layout (replica print Fey "Quarterly revenue"):
 *
 *   Quarterly revenue                          R$45.8B
 *   ┌─────────────────────────────────────┐
 *   │ 200│                              █  │
 *   │    │                              █  │
 *   │ 100│       █                █     █  │  █
 *   │    │       █       █       █     █  │  █
 *   │   0│_______ █ _____ █ _____ █ ___ █ _│  █_
 *   │     Q1 25  Q2 25  Q3 25  Q1 26  Q2 26│
 *   │                                      │
 *   │ R$       R$       R$       R$       R$│
 *   │ 123.1B   -4.0B    8.8B     123.7B  45.8B│
 *   │                                      │
 *   │ EPS 27.30  -6.60   4.70     25.30  15.40
 *   │ ▲ 0.0%    ▼-97%   ▲+119%   ▲+1309% ▼-63%
 *   └─────────────────────────────────────┘
 *
 * - Bar chart vertical, cor por QoQ (verde subiu / vermelho caiu)
 * - Embaixo de cada barra: valor compacto + EPS + variação QoQ
 * - Sem cards duplicados — toda informação vive embaixo da coluna
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

/** Quebra label "Q1 2024" em 2 linhas: "Q1" e "25" (ano curto). */
function splitQuarterLabel(label: string): { q: string; y: string } {
  const m = label.match(/^(Q\d)\s+(\d{2,4})$/);
  if (!m) return { q: label, y: "" };
  const year = m[2];
  return { q: m[1], y: year.length === 4 ? year.slice(2) : year };
}

/** Extrai quarter + ano curto do endDate pra usar como label. */
function quarterFromEndDate(endDate: string): string {
  if (/^Q\d \d{4}$/.test(endDate)) return endDate;
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}

/** Formata número em string curta pra eixo Y (ex: 200000000000 → "200B"). */
function formatAxisValue(v: number, currency: "BRL" | "USD"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${symbol}${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${symbol}${(v / 1e9).toFixed(0)}B`;
  if (abs >= 1e6) return `${symbol}${(v / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${symbol}${(v / 1e3).toFixed(0)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

export function QuarterResults({
  results,
  quarters,
  currency,
  className,
}: Props): JSX.Element {
  const data = useMemo(() => {
    const src =
      quarters && quarters.length > 0
        ? quarters
        : results.map((r) => ({
            endDate: r.label,
            epsBasic: r.eps,
            revenue: r.revenue,
          }));

    const withRev = src
      .filter(
        (q): q is { endDate: string; epsBasic: number | null; revenue: number } =>
          q.revenue != null,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    return withRev.slice(-5).map((q, i, arr) => {
      const prev = i > 0 ? arr[i - 1] : null;
      const changePct =
        prev && prev.revenue !== 0
          ? ((q.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100
          : null;
      const label = quarterFromEndDate(q.endDate);
      return {
        index: i,
        label,
        revenue: q.revenue,
        eps: q.epsBasic,
        changePct,
      };
    });
  }, [quarters, results]);

  if (data.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-[13px] text-muted-foreground/85">
          Sem dados de quarters disponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <RevenueBarChart data={data} currency={currency} />
    </div>
  );
}

/**
 * Bar chart vertical de revenue por quarter.
 *
 * Regras de design aplicadas (Sulfur / Fey):
 * - Título "Quarterly revenue" — 14px semibold (estilo Fey)
 * - Y axis à esquerda com 4 ticks discretos em compact (R$0, R$Xb, R$Yb…)
 * - Barras mais finas (barSize explícito = 36px) com gap generoso
 * - Cor sólida (sem fillOpacity) por QoQ
 * - Cores muted dos ticks (#2a2d33 / rgba muted)
 */
function RevenueBarChart({
  data,
  currency,
}: {
  data: Array<{
    index: number;
    label: string;
    revenue: number;
    eps: number | null;
    changePct: number | null;
  }>;
  currency: "BRL" | "USD";
}): JSX.Element {
  const lastRevenue = data[data.length - 1]?.revenue ?? 0;

  return (
    <div>
      {/* Header estilo Fey: "Quarterly revenue" + valor último Q à direita */}
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[14px] font-semibold tracking-tight text-foreground">
          Quarterly revenue
        </div>
        <div className="text-[11px] text-muted-foreground/70 tabular-nums">
          {formatCompact(lastRevenue, currency)}
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-[220px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            barCategoryGap="40%"
            barSize={36}
          >
            <XAxis
              dataKey="label"
              tick={({ x, y, payload }) => {
                const { q, y: yr } = splitQuarterLabel(
                  String(payload.value ?? ""),
                );
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={10}
                      textAnchor="middle"
                      fill="rgba(200, 210, 230, 0.55)"
                      fontSize={10}
                      fontFamily="var(--font-manrope), system-ui, sans-serif"
                    >
                      {q}
                    </text>
                    {yr && (
                      <text
                        x={0}
                        y={0}
                        dy={22}
                        textAnchor="middle"
                        fill="rgba(200, 210, 230, 0.40)"
                        fontSize={9}
                        fontFamily="var(--font-manrope), system-ui, sans-serif"
                      >
                        {yr}
                      </text>
                    )}
                  </g>
                );
              }}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={32}
            />
            <YAxis
              orientation="left"
              tick={{
                fill: "rgba(200, 210, 230, 0.45)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => formatAxisValue(v, currency)}
              axisLine={false}
              tickLine={false}
              width={48}
              tickCount={4}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as
                  | {
                      label: string;
                      revenue: number;
                      eps: number | null;
                      changePct: number | null;
                    }
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
                    {d.eps != null && (
                      <div className="text-[10px] tabular-nums text-muted-foreground/85 mt-0.5">
                        EPS: {d.eps.toFixed(2)}
                      </div>
                    )}
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
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((d, idx) => {
                const isUp = d.changePct != null && d.changePct >= 0;
                return (
                  <Cell
                    key={`cell-${idx}`}
                    fill={isUp ? "var(--positive)" : "var(--negative)"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Labels embaixo: 3 camadas por coluna (valor / EPS / QoQ) */}
      <div
        className="grid gap-1 mt-3"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((d, idx) => {
          const isUp = d.changePct != null && d.changePct >= 0;
          return (
            <div
              key={`col-${idx}`}
              className="flex flex-col items-center text-center gap-1"
            >
              {/* 1) Revenue value */}
              <div className="text-[12px] tabular-nums font-semibold text-foreground/90">
                {formatCompact(d.revenue, currency)}
              </div>
              {/* 2) EPS */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-[0.10em] text-muted-foreground/55 font-medium">
                  EPS
                </span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums font-semibold",
                    d.eps == null
                      ? "text-muted-foreground/40"
                      : d.eps >= 0
                        ? "text-[var(--positive)]"
                        : "text-[var(--negative)]",
                  )}
                >
                  {d.eps != null
                    ? d.eps.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </span>
              </div>
              {/* 3) QoQ change */}
              <div
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] tabular-nums font-medium",
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
                {d.changePct == null
                  ? "—"
                  : `${isUp ? "+" : "−"}${Math.abs(d.changePct).toFixed(1)}%`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
