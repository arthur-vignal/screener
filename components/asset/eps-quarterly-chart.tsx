"use client";

/**
 * EPSQuarterlyChart — gráfico de pontos de EPS por quarter (estilo Fey TSLA).
 *
 * Dados REAIS de `bundle.historicals.incomeQuarterly` (brapi v2):
 *   - endDate: "2024-09-30" (quarter end)
 *   - basicEarningsPerShare ou dilutedEarningsPerShare
 *
 * Visual:
 *   - Eixo X: 5 quarters (Q1 24 → Q1 25)
 *   - Eixo Y: valor do EPS em moeda
 *   - Pontos sólidos com tamanho proporcional ao valor
 *   - Tooltip mostrando quarter + EPS exato
 *   - Linha tracejada conectando os pontos
 *
 * Quando o valor do quarter é negativo (prejuízo), o ponto fica vermelho.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/chart-theme";

export type QuarterPoint = {
  /** Quarter end date (ISO "YYYY-MM-DD"). */
  endDate: string;
  /** EPS basic (preferred display). */
  epsBasic: number | null;
  /** Revenue no quarter (BRL/USD). */
  revenue: number | null;
};

type Props = {
  /** Lista de quarters (já ordenada asc pelo endDate). */
  quarters: QuarterPoint[];
  /** Moeda pra formatar. */
  currency: "BRL" | "USD";
  /** Quantos quarters exibir (default: 5). */
  limit?: number;
  className?: string;
};

const CHART_FONT_FAMILY =
  "var(--font-manrope), system-ui, sans-serif";

export function EPSQuarterlyChart({
  quarters,
  currency,
  limit = 5,
  className,
}: Props): JSX.Element | null {
  // Pega últimos N quarters (ordenados por endDate asc, sem nulls)
  const data = useMemo(() => {
    const filtered = quarters
      .filter((q): q is QuarterPoint & { epsBasic: number } => q.epsBasic != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-limit);
    return filtered.map((q) => ({
      ...q,
      quarter: formatQuarterLabel(q.endDate),
      isPositive: q.epsBasic >= 0,
    }));
  }, [quarters, limit]);

  if (data.length === 0) return null;

  // Domain do Y: do menor ao maior valor
  const values: number[] = data.map((d) => d.epsBasic);
  const yMin = values.length > 0 ? Math.min(...values, 0) : 0;
  const yMax = values.length > 0 ? Math.max(...values, 0) : 0;
  const yPad = Math.max(Math.abs(yMax - yMin) * 0.15, 0.05);

  const fmtCurrency = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-semibold text-foreground">
          Earnings per share
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <ScatterChart
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <XAxis
              dataKey="quarter"
              type="category"
              tick={{
                fill: CHART_COLORS.axisTick,
                fontSize: 10,
                fontFamily: CHART_FONT_FAMILY,
              }}
              axisLine={{ stroke: CHART_COLORS.axisLine, strokeWidth: 1 }}
              tickLine={false}
            />
            <YAxis
              dataKey="epsBasic"
              type="number"
              domain={[yMin - yPad, yMax + yPad]}
              tick={{
                fill: CHART_COLORS.axisTick,
                fontSize: 10,
                fontFamily: CHART_FONT_FAMILY,
              }}
              tickFormatter={(v: number) => v.toFixed(2)}
              axisLine={{ stroke: CHART_COLORS.axisLine, strokeWidth: 1 }}
              tickLine={false}
              width={48}
            />
            <ZAxis dataKey="epsBasic" range={[40, 40]} />

            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as
                  | (QuarterPoint & { quarter: string; isPositive: boolean })
                  | undefined;
                if (!d || d.epsBasic == null) return null;
                return (
                  <div className="rounded-md bg-[#15151a]/95 backdrop-blur-md border border-white/10 px-3 py-2 text-[12px]">
                    <div className="text-muted-foreground/70 mb-0.5">
                      {d.quarter}
                    </div>
                    <div className="text-foreground font-semibold tabular-nums">
                      {fmtCurrency(d.epsBasic)}
                    </div>
                    {d.revenue != null && (
                      <div className="text-muted-foreground/70 text-[11px] mt-0.5">
                        Revenue{" "}
                        {d.revenue.toLocaleString("en-US", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        })}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Linha conectando os pontos (suave) */}
            <Line
              type="monotone"
              dataKey="epsBasic"
              stroke={CHART_COLORS.seriesPrimary}
              strokeWidth={1}
              strokeOpacity={0.3}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Pontos principais (cor depende de positivo/negativo) */}
            <Scatter
              data={data}
              dataKey="epsBasic"
              shape={(props: {
                cx?: number;
                cy?: number;
                payload?: { isPositive: boolean };
              }) => (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={6}
                  fill={
                    props.payload?.isPositive
                      ? "var(--positive)"
                      : "var(--negative)"
                  }
                  stroke="#070709"
                  strokeWidth={1.5}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Labels embaixo: High / Median / Low / Current (estilo Fey) */}
      <div className="mt-3 space-y-1 text-[11px]">
        {(() => {
          const sorted = [...data].sort((a, b) => b.epsBasic - a.epsBasic);
          const high = sorted[0];
          const low = sorted[sorted.length - 1];
          const median = sorted[Math.floor(sorted.length / 2)];
          const current = data[data.length - 1];
          return (
            <>
              <IndicatorRow
                label="High"
                value={fmtCurrency(high.epsBasic)}
                color="text-foreground/85"
              />
              <IndicatorRow
                label="Median"
                value={fmtCurrency(median.epsBasic)}
                color="text-foreground/85"
              />
              <IndicatorRow
                label="Current"
                value={fmtCurrency(current.epsBasic)}
                color="text-foreground font-semibold"
              />
              <IndicatorRow
                label="Low"
                value={fmtCurrency(low.epsBasic)}
                color="text-foreground/85"
              />
            </>
          );
        })()}
      </div>
    </div>
  );
}

function IndicatorRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-muted-foreground/70">
      <span className="inline-block w-2 h-px bg-foreground/50" />
      <span className="w-16">{label}</span>
      <span className={cn("ml-auto tabular-nums font-medium", color)}>
        {value}
      </span>
    </div>
  );
}

// Helper: formata endDate (ISO) pra "Q1 2024"
function formatQuarterLabel(endDate: string): string {
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1; // 1-12
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}
