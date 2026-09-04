"use client";

/**
 * PortfolioValueChart — linha única mostrando a variação do VALOR
 * total do portfolio ao longo do tempo.
 *
 * Recebe `points: [{ ts, value }]` (já calculado server-side: soma
 * de weight × initial_value × candle.close pra cada holding).
 *
 * Visual (estilo Fey + chart-pack):
 *   - linha fina off-white
 *   - fill area embaixo com opacidade baixa
 *   - tabs 1D/1W/1M/3M/YTD/1Y/5Y/All
 *   - sem benchmark (decisão do user 2026-09-04: "Variação de valor
 *     do portfolio apenas")
 *
 * Altura 320px pra caber no grid 2-col sem competir com o chart de
 * preço 560px do /asset/[symbol].
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/foundation/skeleton";
import { CHART_COLORS, CHART_FONT, CHART_STROKE, axisProps, yAxisProps } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

export type RangeKey = "1D" | "7D" | "1M" | "1Y" | "Max";

type Point = { ts: number; value: number };

type Props = {
  points: Point[];
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  loading?: boolean;
  className?: string;
};

const RANGES: RangeKey[] = ["1D", "7D", "1M", "1Y", "Max"];

export function PortfolioValueChart({
  points, range, onRangeChange, loading, className,
}: Props): JSX.Element {
  if (loading) return <LoadingChart className={className} />;

  // Adiciona índice discreto (0,1,2,...) pra escala X categórica.
  const data = useMemo(
    () => points.map((p, i) => ({ index: i, ts: p.ts, value: p.value })),
    [points],
  );

  return (
    <div className={cn("relative", className)}>
      <div className="h-[280px] w-full">
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer>
            <ChartInner data={data} />
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-colors",
              range === r
                ? "bg-white/[0.04] text-foreground border border-white/10"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.02]",
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Inner chart ──────────────────────────────────────────────────────────

function ChartInner({
  data,
}: { data: Array<{ index: number; ts: number; value: number }> }) {
  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const isPositive = last >= first;
  const lineColor = isPositive ? CHART_COLORS.seriesPositive : CHART_COLORS.seriesNegative;
  const fillId = `portfolio-value-fill-${isPositive ? "up" : "down"}`;
  const fillColor = isPositive ? CHART_COLORS.seriesPositive : CHART_COLORS.seriesNegative;

  return (
    <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.18} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid
        vertical={false}
        stroke={CHART_COLORS.gridLine}
        strokeDasharray="0"
      />
      <XAxis
        dataKey="index"
        type="number"
        domain={["dataMin", "dataMax"]}
        tickFormatter={(idx: number) => formatXByIdx(data, idx)}
        interval="preserveStartEnd"
        minTickGap={48}
        tick={{
          fill: CHART_COLORS.axisTick,
          fontSize: 10,
          fontFamily: CHART_FONT.family,
        }}
        axisLine={{ stroke: CHART_COLORS.axisLine, strokeWidth: 1 }}
        tickLine={false}
        height={24}
      />
      <YAxis
        {...yAxisProps}
        tickFormatter={(v: number) => formatCompactBRL(v)}
        width={56}
        domain={["auto", "auto"]}
      />
      <Tooltip
        content={<ValueTooltip />}
        cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
        wrapperStyle={{ outline: "none" }}
      />
      <Area
        type="monotone"
        dataKey="value"
        stroke={lineColor}
        strokeWidth={CHART_STROKE.seriesLine}
        fill={`url(#${fillId})`}
        dot={false}
        activeDot={{ r: 4, fill: lineColor }}
        isAnimationActive={true}
        animationDuration={1500}
        animationEasing="ease-out"
        connectNulls={false}
      />
    </AreaChart>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────

function ValueTooltip({
  active, payload,
}: { active?: boolean; payload?: Array<{ payload?: { ts: number; value: number } }> }): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const date = new Date(p.ts);
  return (
    <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
      <p className="text-[10px] text-foreground/70 mb-1">
        {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
      <p className="text-[13px] font-semibold tabular-nums text-foreground">
        {p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
    </div>
  );
}

// ─── Skeleton / Empty ────────────────────────────────────────────────────

function LoadingChart({ className }: { className?: string }): JSX.Element {
  return (
    <div className={className}>
      <Skeleton className="h-[320px] w-full" roundedMd />
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-12" />
        ))}
      </div>
    </div>
  );
}

function EmptyChart(): JSX.Element {
  return (
    <div className="h-[320px] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[14px] text-foreground">Sem dados de variação.</p>
        <p className="mt-1.5 text-[12px] text-muted-foreground/70">
          Adicione ativos ao portfolio para acompanhar a evolução.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type DataRow = { index: number; ts: number; value: number };

function formatXByIdx(data: DataRow[], idx: number): string {
  const row = data[idx];
  if (!row) return "";
  const d = new Date(row.ts);
  // Intraday (1D, 1W): hora
  if (row.ts > Date.now() - 7 * 24 * 3600 * 1000) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatCompactBRL(v: number): string {
  if (v >= 1_000_000) {
    return `R$${(v / 1_000_000).toFixed(1)}M`;
  }
  if (v >= 1_000) {
    return `R$${(v / 1_000).toFixed(0)}k`;
  }
  return `R$${v.toFixed(0)}`;
}
