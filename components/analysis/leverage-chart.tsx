"use client";

/**
 * LeverageChart — alavancagem e cobertura de juros (B2 da spec 2026-08-29).
 *
 * Com SELIC no nível atual, alavancagem é o que quebra empresa no Brasil.
 * A página atual não tinha uma linha sobre isso em nenhuma das 3 seções.
 *
 * Render: 2 mini-gráficos empilhados (não usar dual-axis — unidades
 * diferentes, eixos duplos enganam).
 *
 * Gráfico 1 — Alavancagem (dívida líquida / EBITDA LTM, em ×):
 *   - Banda verde: < 2,0× (saudável)
 *   - Banda amarela: 2,0–3,0× (atenção)
 *   - Banda vermelha: > 3,0× (risco)
 *   - Linha sólida verde/vermelha conforme banda
 *   - Caixa líquido (dívida < 0): plotar negativo
 *   - EBITDA ≤ 0: gap na linha
 *
 * Gráfico 2 — Cobertura de juros (EBIT / despesa financeira LTM, em ×):
 *   - Linha sólida verde
 *   - Referência em 2,0× (mínimo confortável)
 *
 * Empty state pra Financial Services.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ReferenceArea,
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
import type { LeveragePoint, LeverageSummary } from "@/lib/analytics/leverage";

type Props = {
  series: LeveragePoint[];
  summary: LeverageSummary;
  className?: string;
};

export function LeverageChart({
  series,
  summary,
  className,
}: Props): JSX.Element | null {
  if (summary.isFinancial) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Alavancagem"
          subtitle="Setor financeiro: dívida líquida / EBITDA não é a métrica certa"
        />
        <div className="h-[200px] flex items-center justify-center text-[10px] text-foreground/60 text-center px-6">
          Bancos e seguradoras têm estrutura de capital diferente.
          Métrica apropriada: Índice de Basileia, Inadimplência, Spread.
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
          title="Alavancagem"
          subtitle="Histórico insuficiente (mínimo 4 quarters)"
        />
      </ChartCard>
    );
  }

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Alavancagem"
        subtitle={
          summary.netCash
            ? "Caixa líquido — empresa com mais caixa que dívida"
            : "Dívida líquida / EBITDA LTM · <2× saudável · >3× risco"
        }
        rightSlot={
                  <div className="flex items-center gap-2">
                    <ChartPeriodTabs
                      range={range}
                      onChange={setRange}
                      dataLength={yearsInData}
                    />
                    {summary.leverage != null ? (
                      <div
                        className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                          summary.netCash
                            ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                            : summary.leverage > 3
                              ? "bg-[var(--negative)]/15 text-[var(--negative)]"
                              : summary.leverage > 2
                                ? "bg-yellow-500/15 text-yellow-300"
                                : "bg-[var(--positive)]/15 text-[var(--positive)]"
                        }`}
                      >
                        {summary.netCash
                          ? "Líquido"
                          : `${summary.leverage.toFixed(2)}×`}
                      </div>
                    ) : null}
                  </div>
                }
      />

      {/* Alavancagem */}
      <div className="h-[160px] w-full mt-2">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
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
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              axisLine={false}
              tickLine={false}
              width={36}
              tickCount={3}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  netDebt: number | null;
                  ebitdaLtm: number | null;
                  leverage: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums">
                      Alavancagem:{" "}
                      {d.leverage != null ? `${d.leverage.toFixed(2)}×` : "—"}
                    </div>
                    {d.netDebt != null && (
                      <div className="text-[10px] tabular-nums text-foreground/70">
                        Dívida líquida:{" "}
                        {d.netDebt < 0
                          ? `−R$ ${(Math.abs(d.netDebt) / 1e9).toFixed(1)}B (caixa)`
                          : `R$ ${(d.netDebt / 1e9).toFixed(1)}B`}
                      </div>
                    )}
                    {d.ebitdaLtm != null && (
                      <div className="text-[10px] tabular-nums text-foreground/70">
                        EBITDA LTM: R$ {(d.ebitdaLtm / 1e9).toFixed(1)}B
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {/* Bandas: 0-2 (verde), 2-3 (amarela), 3+ (vermelha) */}
            <ReferenceArea
              y1={0}
              y2={2}
              fill="var(--positive)"
              fillOpacity={0.04}
              ifOverflow="extendDomain"
            />
            <ReferenceArea
              y1={2}
              y2={3}
              fill="#eab308"
              fillOpacity={0.05}
              ifOverflow="extendDomain"
            />
            <ReferenceArea
              y1={3}
              y2={10}
              fill="var(--negative)"
              fillOpacity={0.05}
              ifOverflow="extendDomain"
            />
            <Line
              type="monotone"
              dataKey="leverage"
              stroke="var(--positive)"
              strokeWidth={2}
              strokeOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: "var(--positive)" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cobertura de juros */}
      <div className="mt-3 mb-1 flex items-center justify-between">
        <div className="text-[10px] text-foreground/70">
          Cobertura de juros (EBIT / despesa financeira LTM)
        </div>
        {summary.coverage != null && (
          <div className="text-[10px] tabular-nums text-foreground/60">
            {summary.coverage.toFixed(2)}×
          </div>
        )}
      </div>
      <div className="h-[120px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
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
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              axisLine={false}
              tickLine={false}
              width={36}
              tickCount={3}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as { coverage: number | null };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums">
                      Cobertura: {d.coverage?.toFixed(2)}×
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={2}
              stroke="rgba(255,255,255,0.20)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <Line
              type="monotone"
              dataKey="coverage"
              stroke="var(--positive)"
              strokeWidth={2}
              strokeOpacity={1}
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
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--positive)]/15" />
          <span>&lt; 2×</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500/15" />
          <span>2–3×</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--negative)]/15" />
          <span>&gt; 3×</span>
        </div>
      </div>
    </ChartCard>
  );
}