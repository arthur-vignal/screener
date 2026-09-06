"use client";

/**
 * PortfolioValueChart — variação do portfolio ao longo do tempo.
 *
 * Plota DUAS séries na MESMA ESCALA (índice base 100 no início do range):
 *   1. Portfolio value (qty × close por timestamp, normalizado a 100)
 *   2. Ibovespa (^BVSP) como benchmark (já vem normalizado a 100 do server)
 *
 * Toggle "Comparar com Ibovespa" liga/desliga o benchmark.
 *
 * Visual:
 *   - Portfolio: linha off-white com fill gradient verde/vermelho (relativo
 *     ao primeiro ponto, igual pack 05)
 *   - IBOV: linha pontilhada fina em azul (`var(--primary)`) sem fill
 *   - Tooltip mostra valor absoluto do portfolio (R$) + pct do IBOV
 *
 * Decisão 2026-09-04: "Variação de valor do portfolio apenas".
 * Atualização 2026-09-06: benchmark Ibovespa opcional (toggle).
 *
 * Altura 320px pra caber no grid 2-col sem competir com o chart de
 * preço 560px do /asset/[symbol].
 */

import { useMemo, useState } from "react";
import type { JSX } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/foundation/skeleton";
import { CHART_COLORS, CHART_FONT, CHART_STROKE, yAxisProps } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

export type RangeKey = "1D" | "7D" | "1M" | "1Y" | "Max";

type Point = { ts: number; value: number };

type Props = {
  points: Point[];
  /** Benchmark IBOV normalizado a 100 no início. Vazio = sem benchmark. */
  benchmark?: Point[];
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  loading?: boolean;
  className?: string;
};

const RANGES: RangeKey[] = ["1D", "7D", "1M", "1Y", "Max"];

export function PortfolioValueChart({
  points,
  benchmark = [],
  range,
  onRangeChange,
  loading,
  className,
}: Props): JSX.Element {
  const [showBenchmark, setShowBenchmark] = useState(true);

  if (loading) return <LoadingChart className={className} />;

  // Junta portfolio + benchmark num único array indexado pelo tempo.
  // Cada série vira uma coluna (`portfolio`, `ibov`). Pontos sem
  // uma das séries ficam null (Recharts trata como gap).
  const data = useMemo(() => {
    const map = new Map<number, { ts: number; portfolio: number; ibov: number | null }>();
    for (const p of points) {
      map.set(p.ts, { ts: p.ts, portfolio: p.value, ibov: null });
    }
    for (const b of benchmark) {
      const existing = map.get(b.ts);
      if (existing) existing.ibov = b.value;
      else map.set(b.ts, { ts: b.ts, portfolio: null as unknown as number, ibov: b.value });
    }
    return [...map.values()].sort((a, b) => a.ts - b.ts);
  }, [points, benchmark]);

  // Normaliza portfolio pra índice 100 no primeiro ponto.
  const firstPortfolio = data.find((d) => d.portfolio != null)?.portfolio ?? 0;
  const dataNormalized = useMemo(() => {
    if (firstPortfolio <= 0) return data;
    return data.map((d) => ({
      ...d,
      portfolio: d.portfolio != null ? (d.portfolio / firstPortfolio) * 100 : null,
    })) as typeof data;
  }, [data, firstPortfolio]);

  return (
    <div className={cn("relative", className)}>
      <div className="h-[280px] w-full">
        {dataNormalized.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer>
            <ChartInner data={dataNormalized} showBenchmark={showBenchmark && benchmark.length > 0} />
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
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
        {benchmark.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBenchmark((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors",
              showBenchmark
                ? "bg-white/[0.04] border border-white/10 text-foreground"
                : "text-muted-foreground/70 border border-transparent hover:text-foreground",
            )}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--primary)" }}
            />
            Comparar com Ibovespa
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inner chart ──────────────────────────────────────────────────────────

function ChartInner({
  data,
  showBenchmark,
}: {
  data: Array<{ ts: number; portfolio: number | null; ibov: number | null }>;
  showBenchmark: boolean;
}) {
  // Cor do portfolio baseada no primeiro/último valor normalizado.
  const first = data.find((d) => d.portfolio != null)?.portfolio ?? 100;
  const last = [...data].reverse().find((d) => d.portfolio != null)?.portfolio ?? 100;
  const isPositive = last >= first;
  const lineColor = isPositive ? CHART_COLORS.seriesPositive : CHART_COLORS.seriesNegative;
  const fillColor = isPositive ? CHART_COLORS.seriesPositive : CHART_COLORS.seriesNegative;
  const fillId = `portfolio-value-fill-${isPositive ? "up" : "down"}`;

  return (
    <AreaChart data={data as Record<string, unknown>[]} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
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
        dataKey="ts"
        type="number"
        scale="time"
        domain={["dataMin", "dataMax"]}
        tickFormatter={(ts: number) => formatXByTs(ts)}
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
        tickFormatter={(v: number) => `${v.toFixed(1)}%`}
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
        dataKey="portfolio"
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
      {showBenchmark && (
        <Line
          type="monotone"
          dataKey="ibov"
          stroke="var(--primary)"
          strokeWidth={1.25}
          strokeDasharray="4 4"
          dot={false}
          activeDot={{ r: 3, fill: "var(--primary)" }}
          isAnimationActive={true}
          animationDuration={1500}
          connectNulls={true}
        />
      )}
    </AreaChart>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────

function ValueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { ts: number; portfolio: number | null; ibov: number | null } }>;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const date = new Date(p.ts);
  return (
    <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
      <p className="text-[10px] text-foreground/70 mb-1.5">
        {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
      {p.portfolio != null && (
        <div className="flex items-center gap-2 text-[12px] tabular-nums">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/70" />
          <span className="text-muted-foreground/70">Portfolio</span>
          <span className="ml-auto font-semibold text-foreground">
            {p.portfolio.toFixed(2)}
          </span>
        </div>
      )}
      {p.ibov != null && (
        <div className="flex items-center gap-2 text-[12px] tabular-nums mt-0.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--primary)" }}
          />
          <span className="text-muted-foreground/70">Ibovespa</span>
          <span className="ml-auto font-semibold text-foreground">
            {p.ibov.toFixed(2)}
          </span>
        </div>
      )}
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

function formatXByTs(ts: number): string {
  const d = new Date(ts);
  // Intraday (1D, 1W): hora
  if (ts > Date.now() - 7 * 24 * 3600 * 1000) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}