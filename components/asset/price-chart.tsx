"use client";

/**
 * PriceChart — gráfico de preço estilo Fey TSLA.
 *
 * Visual:
 *   - linha fina + dots em pontos importantes
 *   - prevClose como ReferenceLine tracejada com label "Previous Close XXX.XX"
 *   - volume embaixo em barras sutis
 *   - tabs: 1D | 1W | 1M | 3M | YTD | 1Y | 5Y | All (estilo Fey)
 *   - sem header interno (gráfico fala sozinho)
 *
 * 3 estados: loading (skeleton com forma), empty (sem candles), ready.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/foundation/skeleton";
import {
  CHART_COLORS,
  axisProps,
  cartesianGridProps,
  cursorProps,
  tooltipWrapperStyle,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

export type RangeKey = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "5Y" | "All";

export const RANGE_DAYS: Record<RangeKey, number | null> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "YTD": null, // ano atual — handled no caller
  "1Y": 365,
  "5Y": 1825,
  All: null,
};

type Candle = {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

type Props = {
  candles: Candle[];
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  prevClose?: number | null;
  loading?: boolean;
  className?: string;
};

const RANGES: RangeKey[] = ["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y", "All"];

export function PriceChart({
  candles,
  range,
  onRangeChange,
  prevClose,
  loading,
  className,
}: Props): JSX.Element {
  if (loading) return <LoadingChart className={className} />;

  return (
    <div className={cn("relative", className)}>
      {/* Previous Close label (estilo Fey) */}
      {prevClose != null && candles.length > 0 && (
        <div className="absolute top-0 right-2 text-[10px] text-muted-foreground/70 pointer-events-none z-10">
          <div>Previous Close</div>
          <div className="tabular-nums text-foreground/85 font-medium">
            {prevClose.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      )}

      <div className="h-[360px] w-full">
        {candles.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer>
            <ChartInner candles={candles} prevClose={prevClose ?? null} />
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabs embaixo (estilo Fey) */}
      <div className="mt-4 flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={cn(
              "px-3 py-1.5 rounded text-[12px] font-medium transition-colors",
              range === r
                ? "bg-white/[0.04] text-foreground border border-white/10"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.02]"
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Inner chart ────────────────────────────────────────────────────────────

function ChartInner({
  candles,
  prevClose,
}: {
  candles: Candle[];
  prevClose: number | null;
}) {
  const data = useMemo(
    () =>
      candles.map((c) => ({
        timestamp: c.timestamp,
        close: c.close,
        volume: c.volume,
      })),
    [candles]
  );

  // Volume renderizado em painel separado (YAxis à esquerda do volume)
  return (
    <ComposedChart
      data={data}
      margin={{ top: 24, right: 16, left: 0, bottom: 0 }}
    >
      <CartesianGrid {...cartesianGridProps} />

      <XAxis
        dataKey="timestamp"
        type="number"
        domain={["dataMin", "dataMax"]}
        scale="time"
        tickFormatter={formatX}
        {...axisProps}
      />
      <YAxis
        yAxisId="price"
        orientation="right"
        tick={{ fill: CHART_COLORS.axisTick, fontSize: 10 }}
        tickFormatter={(v: number) => v.toFixed(0)}
        axisLine={{ stroke: CHART_COLORS.axisLine, strokeWidth: 1 }}
        tickLine={false}
        width={48}
        domain={["auto", "auto"]}
      />
      <YAxis
        yAxisId="volume"
        orientation="left"
        tick={false}
        axisLine={false}
        tickLine={false}
        width={0}
        domain={[0, "auto"]}
      />

      <Tooltip
        content={<PriceTooltip />}
        cursor={{ ...cursorProps }}
        wrapperStyle={{ outline: "none" }}
      />

      {prevClose != null && (
        <ReferenceLine
          y={prevClose}
          yAxisId="price"
          stroke={CHART_COLORS.gridLineStrong}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      )}

      {/* Volume embaixo (barras sutis) */}
      <Bar
        yAxisId="volume"
        dataKey="volume"
        fill={CHART_COLORS.seriesPrimary}
        fillOpacity={0.15}
        isAnimationActive={false}
      />

      {/* Linha de preço */}
      <Line
        yAxisId="price"
        type="monotone"
        dataKey="close"
        stroke={CHART_COLORS.seriesPrimary}
        strokeWidth={1.25}
        dot={false}
        activeDot={{ r: 4, fill: CHART_COLORS.seriesPrimary }}
        isAnimationActive={false}
        connectNulls={false}
      />
    </ComposedChart>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function PriceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { timestamp: number; close: number; volume: number };
  }>;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  const date = new Date(p.timestamp);
  return (
    <div style={tooltipWrapperStyle}>
      <p
        style={{
          color: CHART_COLORS.tooltipMuted,
          fontSize: 10,
          marginBottom: 4,
        }}
      >
        {date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>
      <p
        style={{
          color: CHART_COLORS.tooltipText,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
        }}
      >
        R$ {p.close.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </p>
      {p.volume > 0 && (
        <p
          style={{
            color: CHART_COLORS.tooltipMuted,
            fontSize: 10,
            marginTop: 4,
          }}
        >
          Vol {p.volume.toLocaleString("pt-BR", { notation: "compact" })}
        </p>
      )}
    </div>
  );
}

// ─── Skeleton / Empty ───────────────────────────────────────────────────────

function LoadingChart({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn(className)}>
      <Skeleton className="h-[360px] w-full" roundedMd />
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
    <div className="h-[360px] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[14px] text-foreground">
          Sem dados de preço.
        </p>
        <p className="mt-1.5 text-[12px] text-muted-foreground/70">
          Pode ser IPO recente ou indisponibilidade na Brapi.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatX(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
