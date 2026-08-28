"use client";

/**
 * EPSQuarterlyChart — gráfico de pontos de EPS por quarter (estilo Fey TSLA).
 *
 * Visual (replica o print Fey TSLA):
 *   Earnings per share
 *   EPS forecast down 28.60%
 *
 *   (▲ missed)   (▲ missed)   (▼ beat)   (▲ missed)   (▲ missed)
 *       0.60         0.52        0.72         0.73         0.52
 *   Q1 2024      Q2 2024      Q3 2024      Q4 2024      Q1 2025
 *
 * - 5 quarters mais recentes
 * - Marker circular por quarter (verde/vermelho/neutro)
 * - Seta ▲/▼ indicando variação vs quarter anterior
 * - Status heurístico: missed/beat/flat baseado em ±5% de variação
 * - Label "EPS forecast down X%" calculado (TTM vs year-ago TTM)
 *
 * Dados REAIS: brapi incomeStatementHistoryQuarterly.
 * Brapi NÃO retorna consenso pré-resultado, então "missed/beat" é
 * heurístico vs quarter anterior, não vs estimativa de Wall Street.
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
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CHART_COLORS,
  cartesianGridProps,
  cursorProps,
  tooltipWrapperStyle,
} from "@/lib/chart-theme";

export type QuarterPoint = {
  /** Quarter end date (ISO "YYYY-MM-DD"). */
  endDate: string;
  /** EPS básico. */
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

type RowStatus = "missed" | "beat" | "flat";

function statusFromChange(changePct: number | null): RowStatus {
  if (changePct == null) return "flat";
  if (changePct < -5) return "missed";
  if (changePct > 5) return "beat";
  return "flat";
}

const CHART_FONT_FAMILY =
  "var(--font-manrope), system-ui, sans-serif";

export function EPSQuarterlyChart({
  quarters,
  currency,
  limit = 5,
  className,
}: Props): JSX.Element | null {
  // Pega últimos N quarters com EPS válido
  const data = useMemo(() => {
    const valid = quarters
      .filter((q): q is QuarterPoint & { epsBasic: number } => q.epsBasic != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-limit);
    return valid.map((q, i, arr) => {
      const prev = i > 0 ? arr[i - 1] : null;
      const changePct =
        prev && prev.epsBasic !== 0
          ? ((q.epsBasic - prev.epsBasic) / Math.abs(prev.epsBasic)) * 100
          : null;
      const status = statusFromChange(changePct);
      return {
        ...q,
        index: i,
        changePct,
        status,
        isPositive: q.epsBasic >= 0,
      };
    });
  }, [quarters, limit]);

  // Texto descritivo: "EPS forecast down X%"
  const forecastText = useMemo(() => {
    if (data.length < 2) return null;
    const ttmNow = data.slice(-4).reduce((s, d) => s + d.epsBasic, 0);
    const ttmPrev = data
      .slice(-8, -4)
      .reduce((s, d) => s + d.epsBasic, 0);
    if (ttmPrev === 0) return null;
    const changePct = ((ttmNow - ttmPrev) / Math.abs(ttmPrev)) * 100;
    return {
      pct: Math.abs(changePct),
      sign: changePct >= 0 ? "up" : "down",
    };
  }, [data]);

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
    });

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-semibold text-foreground">
          Earnings per share
        </div>
      </div>

      {forecastText && (
        <p
          className={cn(
            "text-[11px] mb-3",
            forecastText.sign === "down"
              ? "text-[var(--negative)]"
              : "text-[var(--positive)]"
          )}
        >
          EPS forecast {forecastText.sign}{" "}
          {forecastText.pct.toFixed(2)}%
        </p>
      )}

      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ScatterChart
            data={data}
            margin={{ top: 24, right: 16, left: 0, bottom: 24 }}
          >
            <CartesianGrid
              stroke={CHART_COLORS.gridLine}
              strokeWidth={1}
              vertical={false}
            />
            <XAxis
              dataKey="index"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{
                fill: CHART_COLORS.axisTick,
                fontSize: 10,
                fontFamily: CHART_FONT_FAMILY,
              }}
              tickFormatter={(idx: number) => {
                const row = data[idx];
                if (!row) return "";
                return formatQuarterLabel(row.endDate);
              }}
              axisLine={false}
              tickLine={false}
              height={20}
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
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <ZAxis dataKey="epsBasic" range={[40, 40]} />

            <Tooltip
              cursor={{ ...cursorProps }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as
                  | (QuarterPoint & {
                      epsBasic: number;
                      index: number;
                      changePct: number | null;
                      status: RowStatus;
                      isPositive: boolean;
                    })
                  | undefined;
                if (!d) return null;
                return (
                  <div style={tooltipWrapperStyle}>
                    <p
                      style={{
                        color: CHART_COLORS.tooltipMuted,
                        fontSize: 10,
                        marginBottom: 4,
                      }}
                    >
                      {formatQuarterLabel(d.endDate)}
                    </p>
                    <p
                      style={{
                        color: CHART_COLORS.tooltipText,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      EPS: {fmtCurrency(d.epsBasic)}
                    </p>
                    {d.revenue != null && (
                      <p
                        style={{
                          color: CHART_COLORS.tooltipMuted,
                          fontSize: 10,
                          marginTop: 4,
                        }}
                      >
                        Revenue:{" "}
                        {d.revenue.toLocaleString("en-US", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        })}
                      </p>
                    )}
                    {d.changePct != null && (
                      <p
                        style={{
                          color: CHART_COLORS.tooltipMuted,
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        {d.changePct >= 0 ? "+" : ""}
                        {d.changePct.toFixed(1)}% vs Q anterior
                      </p>
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

            {/* Pontos coloridos por status */}
            <Scatter
              data={data}
              dataKey="epsBasic"
              shape={(props: {
                cx?: number;
                cy?: number;
                payload?: { isPositive: boolean; status: RowStatus };
              }) => (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={6}
                  fill={
                    props.payload?.status === "beat"
                      ? "var(--positive)"
                      : props.payload?.status === "missed"
                        ? "var(--negative)"
                        : "var(--foreground)"
                  }
                  stroke="#070709"
                  strokeWidth={1.5}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Labels embaixo: seta + status + EPS value por quarter */}
      <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, idx) => (
          <div
            key={`${d.endDate}-${idx}`}
            className="flex flex-col items-center text-center"
          >
            {/* Seta */}
            <div
              className={cn(
                "flex items-center gap-0.5 text-[10px] tabular-nums",
                d.status === "beat"
                  ? "text-[var(--positive)]"
                  : d.status === "missed"
                    ? "text-[var(--negative)]"
                    : "text-muted-foreground/70"
              )}
            >
              {d.changePct == null ? (
                <span>—</span>
              ) : d.changePct >= 0 ? (
                <ArrowUp className="h-3 w-3" strokeWidth={2.25} />
              ) : (
                <ArrowDown className="h-3 w-3" strokeWidth={2.25} />
              )}
              <span>{d.status}</span>
            </div>
            {/* Valor */}
            <div className="mt-1 text-[13px] tabular-nums text-foreground font-medium">
              {d.epsBasic.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: formata endDate (ISO "YYYY-MM-DD") pra "Q1 2024"
function formatQuarterLabel(endDate: string): string {
  if (endDate === "TTM") return "TTM";
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}
