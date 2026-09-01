"use client";

/**
 * ROICVsWACC — ROIC vs WACC (A4 da spec 2026-08-29).
 *
 * Substitui o antigo "ROE vs SELIC real". ROE é alavancado (reflete
 * Ke, não WACC) e SELIC nua não é Ke — empresa alavancada parecia
 * "criar valor" só pelo efeito da alavancagem. Falso positivo.
 *
 * Agora: ROIC = NOPAT / capital_investido, vs WACC = (E/V)·Ke + (D/V)·Kd·(1-t).
 *
 * Render:
 *   - 2 linhas sólidas no mesmo eixo % a.a. (regra ativo×macro):
 *     verde = ROIC, azul #489ffa = WACC
 *   - Área entre as linhas: verde quando ROIC > WACC (criação de valor),
 *     vermelho quando ROIC < WACC (destruição)
 *   - Premissas no tooltip (ERP, beta, alíquota marginal)
 *   - Empty state pra Financial Services (capital investido não tem
 *     significado em bancos)
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
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
  ChartPeriodTabs,
  useChartPeriod,
} from "./analysis-utils";
import type { ROICWACCPoint, ROICWACCSummary } from "@/lib/analytics/roic-wacc";

type Props = {
  series: ROICWACCPoint[];
  summary: ROICWACCSummary;
  className?: string;
};

export function ROICVsWACC({
  series,
  summary,
  className,
}: Props): JSX.Element | null {
  if (summary.isFinancial) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="ROIC vs WACC"
          subtitle="Capital investido não tem significado em Financial Services"
        />
        <div className="h-[200px] flex items-center justify-center text-[10px] text-foreground/60 text-center px-6">
          Setor financeiro: capital regulatório ≠ capital operacional.
          Pra bancos, use métricas próprias (ROE, Índice de Basileia).
        </div>
      </ChartCard>
    );
  }

  const { range, setRange, filtered } = useChartPeriod(series);
  const data = useMemo(() => attachTimestamps(filtered), [filtered]);
  const yearsInData = Math.ceil(series.length / 4);

  if (data.length < 2) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="ROIC vs WACC"
          subtitle="Histórico insuficiente (mínimo 4 quarters com dados completos)"
        />
      </ChartCard>
    );
  }

  const last = data[data.length - 1];
  const creatingValue =
    summary.spread != null ? summary.spread > 0 : null;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="ROIC vs WACC"
        subtitle={
          creatingValue != null
            ? creatingValue
              ? "Gera valor acima do custo de capital"
              : "Destrói valor abaixo do custo de capital"
            : "ROIC = NOPAT / capital investido · WACC = (E/V)·Ke + (D/V)·Kd·(1-t)"
        }
        rightSlot={
                  <div className="flex items-center gap-2">
                    <ChartPeriodTabs
                      range={range}
                      onChange={setRange}
                      dataLength={yearsInData}
                    />
                    {summary.spread != null ? (
                      <div
                        className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                          creatingValue
                            ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                            : "bg-[var(--negative)]/15 text-[var(--negative)]"
                        }`}
                      >
                        {summary.spread >= 0 ? "+" : "−"}
                        {Math.abs(summary.spread).toFixed(1)} pp
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
            <defs>
              <linearGradient id="roic-pos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="roic-neg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--negative)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--negative)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              axisLine={false}
              tickLine={false}
              width={40}
              tickCount={5}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  roic: number | null;
                  wacc: number | null;
                  spread: number | null;
                  ke: number | null;
                  kd: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      ROIC: {d.roic?.toFixed(2)}%
                    </div>
                    <div className="text-[11px] tabular-nums text-[#489ffa]">
                      WACC: {d.wacc?.toFixed(2)}%
                    </div>
                    {d.spread != null && (
                      <div
                        className={`text-[10px] tabular-nums mt-1 font-semibold ${
                          d.spread >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }`}
                      >
                        Spread: {d.spread >= 0 ? "+" : "−"}
                        {Math.abs(d.spread).toFixed(2)} pp
                      </div>
                    )}
                    <div className="text-[9px] text-foreground/60 mt-2 leading-tight border-t border-white/[0.05] pt-1.5">
                      Premissas: ERP {summary.settings.erp}% · β {summary.beta?.toFixed(2) ?? "1.00"} · Ke{" "}
                      {summary.settings.riskFreeRate}% · t{" "}
                      {summary.settings.marginalTaxRate}%
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={0}
              stroke="rgba(255,255,255,0.20)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            {/* WACC (azul, sólida) — primeiro pra ficar embaixo */}
            <Line
              type="monotone"
              dataKey="wacc"
              stroke="#489ffa"
              strokeWidth={2}
              strokeOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: "#489ffa" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
            {/* ROIC (verde, sólida) — segundo, por cima */}
            <Area
              type="monotone"
              dataKey="roic"
              stroke="var(--positive)"
              strokeWidth={2}
              strokeOpacity={1}
              fill="url(#roic-pos)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--positive)" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>ROIC</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[#489ffa]" />
          <span>WACC</span>
        </div>
        <div className="text-foreground/60">
          ROIC {last?.roic?.toFixed(1)}% vs WACC {last?.wacc?.toFixed(1)}%
        </div>
      </div>
    </ChartCard>
  );
}