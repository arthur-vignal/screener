"use client";

/**
 * YieldComparison — 3 yields no mesmo eixo % a.a. (B3 da spec 2026-08-29).
 *
 *   earnings_yield[t] = 1 / trailingPE[t]
 *   fcf_yield[t]      = (fco_ltm - capex_ltm) / market_cap
 *   dividend_yield[t] = proventos 12m / preço
 *
 * Cores:
 *   - verde var(--positive) — earnings yield
 *   - roxo #7c5cff — FCF yield (liberado em A5, antes era insider)
 *   - muted — dividend yield
 *
 * Cores AZUL #489ffa continua restrito a macro (SELIC, IBC-Br).
 *
 * Badge: gap médio EY - FCFY últimos 8 quarters. Positivo = lucro
 * contábil > caixa real (sinal de alerta sobre qualidade do lucro).
 * Negativo = lucro é real (caixa confirma contábil).
 *
 * Atenção: dividend yield entra BRUTO (não líquido de IR). Spec
 * recomenda documentar a premissa — fica explícito no tooltip.
 *
 * Linha pontilhada vermelha em y=0 só aparece se algum yield está
 * negativo (prejuízo → yield negativo).
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

import {
  ChartCard,
  ChartCardHeader,
  TimeXAxis,
  tooltipWrapperStyle,
  attachTimestamps,
} from "./analysis-utils";
import type { YieldPoint, YieldSummary } from "@/lib/analytics/yield-comparison";

type Props = {
  series: YieldPoint[];
  summary: YieldSummary;
  className?: string;
};

export function YieldComparison({
  series,
  summary,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => attachTimestamps(series), [series]);

  if (data.length < 4) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Três yields"
          subtitle="Histórico insuficiente (mínimo 4 quarters)"
        />
      </ChartCard>
    );
  }

  const hasNegative = data.some(
    (d) =>
      (d.earningsYield != null && d.earningsYield < 0) ||
      (d.fcfYield != null && d.fcfYield < 0) ||
      (d.dividendYield != null && d.dividendYield < 0),
  );

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Três yields"
        subtitle={
          summary.earningsFcfGapAvg != null
            ? `EY, FCFY e DY no mesmo eixo % a.a. · gap EY-FCFY 8T: ${
                summary.earningsFcfGapAvg >= 0 ? "+" : "−"
              }${Math.abs(summary.earningsFcfGapAvg).toFixed(1)}pp`
            : "EY, FCFY e DY no mesmo eixo % a.a."
        }
        rightSlot={
          summary.earningsFcfGapAvg != null ? (
            <div
              className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                summary.earningsFcfGapAvg > 1
                  ? "bg-[var(--negative)]/15 text-[var(--negative)]"
                  : summary.earningsFcfGapAvg < -1
                    ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                    : "bg-white/[0.06] text-muted-foreground/85"
              }`}
            >
              {summary.earningsFcfGapAvg >= 0 ? "+" : "−"}
              {Math.abs(summary.earningsFcfGapAvg).toFixed(1)}pp
            </div>
          ) : null
        }
      />
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
              vertical={false}
            />
            <TimeXAxis tickFontSize={9} />
            <YAxis
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              axisLine={false}
              tickLine={false}
              width={40}
              tickCount={5}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as YieldPoint;
                if (!d) return null;
                const gap =
                  d.earningsYield != null && d.fcfYield != null
                    ? d.earningsYield - d.fcfYield
                    : null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-muted-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      EY:{" "}
                      {d.earningsYield != null
                        ? `${d.earningsYield.toFixed(2)}%`
                        : "—"}
                    </div>
                    <div
                      className="text-[11px] tabular-nums"
                      style={{ color: "#7c5cff" }}
                    >
                      FCFY:{" "}
                      {d.fcfYield != null
                        ? `${d.fcfYield.toFixed(2)}%`
                        : "—"}
                    </div>
                    <div className="text-[11px] tabular-nums text-muted-foreground/85">
                      DY:{" "}
                      {d.dividendYield != null
                        ? `${d.dividendYield.toFixed(2)}%`
                        : "—"}
                    </div>
                    {gap != null && (
                      <div
                        className={`text-[10px] tabular-nums mt-1 font-semibold ${
                          gap > 0
                            ? "text-[var(--negative)]"
                            : "text-[var(--positive)]"
                        }`}
                      >
                        EY − FCFY: {gap >= 0 ? "+" : "−"}
                        {Math.abs(gap).toFixed(2)}pp
                      </div>
                    )}
                    <div className="text-[9px] text-muted-foreground/50 mt-1.5 leading-tight border-t border-white/[0.05] pt-1.5">
                      DY bruto (não líquido de IR).
                    </div>
                  </div>
                );
              }}
            />
            {hasNegative && (
              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.20)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            )}
            <Line
              type="monotone"
              dataKey="earningsYield"
              stroke="var(--positive)"
              strokeWidth={2}
              strokeOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: "var(--positive)" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="fcfYield"
              stroke="#7c5cff"
              strokeWidth={2}
              strokeOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: "#7c5cff" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="dividendYield"
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeOpacity={0.85}
              dot={false}
              activeDot={{ r: 4, fill: "var(--muted)" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>EY (1/trailingPE)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px" style={{ background: "#7c5cff" }} />
          <span>FCFY ((FCO − CapEx) / mcap)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--muted)]" />
          <span>DY (proventos 12m)</span>
        </div>
      </div>
    </ChartCard>
  );
}