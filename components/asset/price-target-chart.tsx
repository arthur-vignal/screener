"use client";

/**
 * PriceTargetChart — line chart com High/Median/Current/Low (estilo Fey TSLA).
 *
 * ⚠️ ATENÇÃO: a Brapi v2 NÃO retorna analyst price target. Por ora,
 * calculamos:
 *   - High  = 52-week high
 *   - Low   = 52-week low
 *   - Median= midpoint(High, Low) × 1.05 (margem de upside)
 *   - Current = preço corrente
 *
 * Visual (estilo Fey):
 *   - Linha sólida do preço histórico (candles recentes)
 *   - 3 linhas tracejadas convergindo no preço atual (High/Median/Low)
 *   - Marcador triangular no Current price
 *   - Labels com valor à direita de cada linha
 *
 * Quando a Brapi adicionar price target real, trocamos pelos campos
 *   bundle.priceTarget = { high, median, low, current }
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type Candle = {
  timestamp: number;
  close: number;
};

type Props = {
  candles: Candle[];
  current: number | null;
  high52w: number | null;
  low52w: number | null;
  /** Price target — High (analyst). Opcional. */
  targetHigh?: number | null;
  /** Price target — Low (analyst). Opcional. */
  targetLow?: number | null;
  /** Price target — Median (analyst). Opcional. */
  targetMedian?: number | null;
  /** Price target — Mean (analyst). Opcional. */
  targetMean?: number | null;
  currency: "BRL" | "USD";
  className?: string;
};

export function PriceTargetChart({
  candles,
  current,
  high52w,
  low52w,
  targetHigh,
  targetLow,
  targetMedian,
  targetMean,
  currency,
  className,
}: Props): JSX.Element | null {
  if (!current) return null;

  const data = useMemo(
    () =>
      candles.map((c, i) => ({
        index: i,
        timestamp: c.timestamp,
        price: c.close,
      })),
    [candles]
  );

  // Fallback: se não tem analyst target, usa 52w high/low + median calculado
  const tHigh = targetHigh ?? high52w;
  const tLow = targetLow ?? low52w;
  const tMedian = targetMedian ?? (high52w && low52w ? (high52w + low52w) / 2 * 1.05 : null);

  if (!tHigh || !tLow || !tMedian) return null;

  // "Median" usado pra calcular upside = tMean (analyst) ou median
  const upsideRef = targetMean ?? tMedian;
  const upsidePct = ((upsideRef - current) / current) * 100;

  const fmt = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
  // upsidePct calculado acima

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[14px] font-semibold text-foreground">
          {fmt(upsideRef)}{" "}
          <span className={cn(
            "text-[12px] font-medium",
            upsidePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
          )}>
            ({upsidePct >= 0 ? "+" : ""}{upsidePct.toFixed(2)}% potential)
          </span>
        </div>
      </div>

      <div className="h-[260px] w-full">
        {data.length === 0 ? (
          <Skeleton className="h-full w-full" roundedMd />
        ) : (
          <ResponsiveContainer>
            <ComposedChart
              data={data}
              margin={{ top: 24, right: 56, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
                vertical={false}
              />

              <XAxis
                dataKey="index"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={false}
                axisLine={false}
                height={0}
              />
              <YAxis
                orientation="right"
                tick={false}
                axisLine={false}
                width={0}
                domain={[
                  (dataMin: number) => Math.min(dataMin, tLow!) * 0.98,
                  (dataMax: number) => Math.max(dataMax, tHigh!) * 1.02,
                ]}
              />

              {/* Preço histórico */}
              <Line
                type="monotone"
                dataKey="price"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              />

              {/* Linhas de referência High / Median / Low */}
              <ReferenceDot
                x={data.length - 1}
                y={tHigh}
                r={0}
                shape={(props: { cx?: number; cy?: number }) => (
                  <ReferenceLine
                    cx={props.cx}
                    cy={props.cy}
                    label={`High ${fmt(tHigh)}`}
                    color="rgba(255,255,255,0.7)"
                    dashed
                  />
                )}
              />
              <ReferenceDot
                x={data.length - 1}
                y={tMedian}
                r={0}
                shape={(props: { cx?: number; cy?: number }) => (
                  <ReferenceLine
                    cx={props.cx}
                    cy={props.cy}
                    label={`Median ${fmt(tMedian)}`}
                    color="rgba(255,255,255,0.7)"
                    dashed
                  />
                )}
              />
              <ReferenceDot
                x={data.length - 1}
                y={tLow}
                r={0}
                shape={(props: { cx?: number; cy?: number }) => (
                  <ReferenceLine
                    cx={props.cx}
                    cy={props.cy}
                    label={`Low ${fmt(tLow)}`}
                    color="rgba(255,255,255,0.7)"
                    dashed
                  />
                )}
              />

              {/* Marcador triangular no Current price */}
              <ReferenceDot
                x={data.length - 1}
                y={current}
                r={5}
                fill="#489ffa"
                stroke="#070709"
                strokeWidth={1.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Labels à esquerda (estilo Fey) */}
      <div className="mt-3 space-y-1 text-[11px]">
        <div className="flex items-center gap-2 text-muted-foreground/70">
          <span className="inline-block w-2 h-px bg-foreground/50" />
          <span className="w-16">High</span>
          <span className="ml-auto text-foreground/85 tabular-nums font-medium">
            {fmt(tHigh)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/70">
          <span className="inline-block w-2 h-px bg-foreground/50" />
          <span className="w-16">Median</span>
          <span className="ml-auto text-foreground/85 tabular-nums font-medium">
            {fmt(tMedian)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <span className="inline-block w-2 h-px bg-foreground/70" />
          <span className="w-16">Current price</span>
          <span className="ml-auto tabular-nums font-semibold">
            {fmt(current)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/70">
          <span className="inline-block w-2 h-px bg-foreground/50" />
          <span className="w-16">Low</span>
          <span className="ml-auto text-foreground/85 tabular-nums font-medium">
            {fmt(tLow)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper: linha horizontal tracejada customizada com label à direita
function ReferenceLine({
  cx,
  cy,
  label,
  color,
  dashed,
}: {
  cx?: number;
  cy?: number;
  label: string;
  color: string;
  dashed: boolean;
}) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <line
        x1={0}
        x2={cx}
        y1={cy}
        y2={cy}
        stroke={color}
        strokeWidth={1}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
      <text
        x={cx + 6}
        y={cy - 4}
        fill={color}
        fontSize={10}
        fontFamily="var(--font-manrope), system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}
