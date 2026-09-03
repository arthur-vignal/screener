"use client";

/**
 * YieldComparison — 3 yields no mesmo eixo % a.a. (B3 da spec 2026-08-29).
 *
 *   earnings_yield[t] = 1 / trailingPE[t]
 *   fcf_yield[t]      = (fco_ltm - capex_ltm) / market_cap
 *   dividend_yield[t] = proventos 12m / preço
 *
 * Cores (via lib/chart-pack.ts):
 *   - PACK.asset    verde #4dbe95  — earnings yield
 *   - PACK.fcf      ciano #22d3ee — FCF yield (liberado em A5, antes era insider)
 *   - PACK.dividend cinza  #9ba1a8 — dividend yield
 *
 * PACK.macro (azul) continua restrito a macro (SELIC, IBC-Br).
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
 *
 * Fix 2026-09-03 (sessão pós-print PETR3): o chart sumia quando o
 * usuário clicava em "1a" porque `data.length < 4` escondia o chart.
 * Causa raiz: o filtro `useChartPeriod(series)` em 1a deixa 4 quarters,
 * mas `computeYieldComparison` retorna `fcfYield: null` pros primeiros
 * 3 quarters (precisa de 4Q rolling pra computar FCF LTM) — em 1a
 * sobra só 1 ponto com dados. Solução: **aceitar `data.length >= 2`**
 * (não >= 4) e mostrar empty state com explicação quando não há nada
 * plotável. O chart deve ser honesto sobre o que tem, não sumir.
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
  ChartPeriodTabs,
  useChartPeriod,
  attachTimestamps,
} from "./analysis-utils";
import {
  PACK,
  packLineProps,
  packYAxisPercentProps,
  packGrid,
  packRefLineZero,
  packTooltipStyle,
} from "@/lib/chart-pack";
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
  const { range, setRange, filtered } = useChartPeriod(series);
  const data = useMemo(() => attachTimestamps(filtered), [filtered]);
  const yearsInData = Math.ceil(series.length / 4);

  // Empty state honesto: 0 ou 1 ponto não tem informação visual.
  // Antes: >= 4 → chart vazio "Histórico insuficiente". Agora: o filtro
  // "1a" deixa 4Q e a função computeYieldComparison pode devolver null
  // no fcfYield dos primeiros 3 — então `data.length >= 2` é o mínimo
  // pra uma linha ter 2+ pontos (sem isso, dots/linhas colapsam em 1 ponto).
  if (data.length < 2) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Três yields"
          subtitle="Histórico insuficiente (mínimo 2 quarters)"
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
          <div className="flex items-center gap-2">
            <ChartPeriodTabs
              range={range}
              onChange={setRange}
              dataLength={yearsInData}
            />
            {summary.earningsFcfGapAvg != null ? (
              <div
                className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                  summary.earningsFcfGapAvg > 1
                    ? "bg-[var(--negative)]/15 text-[var(--negative)]"
                    : summary.earningsFcfGapAvg < -1
                      ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                      : "bg-white/[0.06] text-foreground/85"
                }`}
              >
                {summary.earningsFcfGapAvg >= 0 ? "+" : "−"}
                {Math.abs(summary.earningsFcfGapAvg).toFixed(1)}pp
              </div>
            ) : null}
          </div>
        }
      />
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid {...packGrid} />
            <TimeXAxis tickFontSize={9} />
            <YAxis {...packYAxisPercentProps(1)} />
            <Tooltip
              wrapperStyle={packTooltipStyle}
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
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
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div
                      className="text-[11px] tabular-nums"
                      style={{ color: PACK.asset }}
                    >
                      EY:{" "}
                      {d.earningsYield != null
                        ? `${d.earningsYield.toFixed(2)}%`
                        : "—"}
                    </div>
                    <div
                      className="text-[11px] tabular-nums"
                      style={{ color: PACK.fcf }}
                    >
                      FCFY:{" "}
                      {d.fcfYield != null
                        ? `${d.fcfYield.toFixed(2)}%`
                        : "—"}
                    </div>
                    <div
                      className="text-[11px] tabular-nums"
                      style={{ color: PACK.dividend }}
                    >
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
                    <div className="text-[9px] text-foreground/60 mt-1.5 leading-tight border-t border-white/[0.05] pt-1.5">
                      DY bruto (não líquido de IR).
                    </div>
                  </div>
                );
              }}
            />
            {hasNegative && <ReferenceLine {...packRefLineZero} />}
            {/* EY (verde) */}
            <Line
              dataKey="earningsYield"
              {...packLineProps({ stroke: PACK.asset, strokeWidth: 2 })}
            />
            {/* FCFY (ciano) */}
            <Line
              dataKey="fcfYield"
              {...packLineProps({ stroke: PACK.fcf, strokeWidth: 2 })}
            />
            {/* DY (cinza, mais discreto) */}
            <Line
              dataKey="dividendYield"
              {...packLineProps({ stroke: PACK.dividend, strokeWidth: 1.5, strokeOpacity: 0.85 })}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.asset }}
          />
          <span>EY (1/trailingPE)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.fcf }}
          />
          <span>FCFY ((FCO − CapEx) / mcap)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.dividend }}
          />
          <span>DY (proventos 12m)</span>
        </div>
      </div>
    </ChartCard>
  );
}
