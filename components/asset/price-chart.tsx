"use client";

/**
 * PriceChart — gráfico de preço full-width com seletor de período.
 *
 * Padrão (sulfur-chart-theme §4):
 *   - type="monotone", stroke 1.25px (filled)
 *   - área embaixo com gradient sutil (rgba 0.06 → 0)
 *   - grid horizontal sutil
 *   - Y axis à direita com labels muted
 *   - prevClose como ReferenceLine tracejada
 *   - hover com crosshair e tooltip rico (data, preço, variação)
 *
 * 3 estados: loading (skeleton com forma), empty (sem candles), ready.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PeriodTabs, type PeriodRange } from "@/components/foundation/period-tabs";
import { Skeleton } from "@/components/foundation/skeleton";
import {
  CHART_COLORS,
  axisProps,
  cartesianGridProps,
  cursorProps,
  tooltipWrapperStyle,
  yAxisProps,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import type { RangeKey } from "./asset-bundle";
import { RANGE_DAYS } from "./asset-bundle";

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

const RANGES: RangeKey[] = ["1D", "7D", "30D", "1Y", "Max"];

export function PriceChart({
  candles,
  range,
  onRangeChange,
  prevClose,
  loading,
  className,
}: Props): JSX.Element {
  if (loading) return <LoadingChart className={className} />;
  if (candles.length === 0)
    return (
      <EmptyChart
        range={range}
        onRangeChange={onRangeChange}
        className={className}
      />
    );

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
          Histórico de preço
        </div>
        <PeriodTabs
          value={rangeToPeriodRange(range)}
          onChange={(v) => onRangeChange(periodRangeToRange(v))}
          presets={RANGES.map((r) => ({
            label: r,
            value: rangeToPeriodRange(r),
          }))}
        />
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <ChartInner candles={candles} prevClose={prevClose ?? null} />
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Inner chart (sofre do RULES OF HOOKS — useMemo aqui dentro) ─────────────

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
        date: c.date,
        close: c.close,
      })),
    [candles]
  );

  return (
    <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>

      <CartesianGrid {...cartesianGridProps} />

      <XAxis
        dataKey="timestamp"
        type="number"
        domain={["dataMin", "dataMax"]}
        scale="time"
        tickFormatter={formatX}
        {...axisProps}
      />
      <YAxis {...yAxisProps} tickFormatter={formatY} domain={["auto", "auto"]} />

      <Tooltip
        content={<PriceTooltip />}
        cursor={{ ...cursorProps }}
        wrapperStyle={{ outline: "none" }}
      />

      {prevClose != null && (
        <ReferenceLine
          y={prevClose}
          stroke={CHART_COLORS.gridLineStrong}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      )}

      <Area
        type="monotone"
        dataKey="close"
        stroke={CHART_COLORS.seriesPrimary}
        strokeWidth={1.25}
        fill="url(#priceFill)"
        isAnimationActive={false}
        connectNulls={false}
      />
    </AreaChart>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function PriceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { timestamp: number; close: number } }>;
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
    </div>
  );
}

// ─── Skeleton / Empty ───────────────────────────────────────────────────────

function LoadingChart({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-5",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-72" />
      </div>
      <Skeleton className="h-[320px] w-full" roundedMd />
    </div>
  );
}

function EmptyChart({
  range,
  onRangeChange,
  className,
}: {
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
          Histórico de preço
        </div>
        <PeriodTabs
          value={rangeToPeriodRange(range)}
          onChange={(v) => onRangeChange(periodRangeToRange(v))}
          presets={RANGES.map((r) => ({ label: r, value: rangeToPeriodRange(r) }))}
        />
      </div>
      <div className="h-[320px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-foreground">
            Sem dados de preço pra este período.
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">
            Pode ser IPO recente ou indisponibilidade na Brapi.
          </p>
        </div>
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

function formatY(v: number): string {
  if (v >= 1000) return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return v.toFixed(2);
}

function rangeToPeriodRange(r: RangeKey): PeriodRange {
  if (r === "Max") return { startYear: null, endYear: null };
  const days = RANGE_DAYS[r];
  if (days == null) return { startYear: null, endYear: null };
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startYear: start.getFullYear(),
    endYear: null,
  };
}

function periodRangeToRange(v: PeriodRange): RangeKey {
  if (!v.startYear) return "Max";
  const yearsAgo = new Date().getFullYear() - v.startYear;
  if (yearsAgo <= 0) return "1D";
  if (yearsAgo <= 1) return "1Y";
  if (yearsAgo <= 3) return "30D";
  if (yearsAgo <= 7) return "30D";
  return "Max";
}
