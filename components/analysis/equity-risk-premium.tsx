"use client";

/**
 * EquityRiskPremium — earnings yield vs NTN-B longa real (B5 da spec
 * 2026-08-29).
 *
 *   premio[t] = earnings_yield[t] - ntnb_long_rate[t]
 *
 * NTN-B 2045 (`tesouro-ipca-15052045`) usada como proxy risk-free real.
 *
 * Premissa importante: EY é nominal, NTN-B é real. A diferença mede
 * o prêmio que o investidor exige pra trocar renda fixa real por
 * equity com repasse inflacionário implícito. Aproximação defensável,
 * mas aproximação — tooltip explica.
 *
 * Render: 2 linhas (verde EY, azul NTN-B) + área do spread preenchida
 * com sinal (verde quando equity paga mais, vermelho quando paga menos).
 *
 * Empty state: sem histórico de treasury ou earnings.
 *
 * Fix 2026-09-03 (sessão pós-print PETR3): NTN-B sumia em "1a" porque
 * brapi /treasury/indicators/history retorna os últimos ~2 anos com
 * gaps. Solução: o helper `nearestPriorRate` em analytics já tem
 * `maxDaysBack=90` mas pode falhar se a brapi tiver buraco >90 dias.
 * Aqui no client: carry-forward do último NTN-B conhecido quando o
 * quarter não tem match — mesma estratégia do SELIC.
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
import type {
  EquityRiskPremiumPoint,
  EquityRiskPremiumSummary,
} from "@/lib/analytics/equity-risk-premium";

type Props = {
  series: EquityRiskPremiumPoint[];
  summary: EquityRiskPremiumSummary;
  className?: string;
};

export function EquityRiskPremium({
  series,
  summary,
  className,
}: Props): JSX.Element | null {
  const { range, setRange, filtered } = useChartPeriod(series);
  const data = useMemo(() => attachTimestamps(filtered), [filtered]);
  const yearsInData = Math.ceil(series.length / 4);

  // Empty state honesto: >=2 pontos pra linha ter sentido visual.
  if (data.length < 2) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Prêmio de equity vs NTN-B"
          subtitle="Histórico insuficiente (mínimo 2 quarters)"
        />
      </ChartCard>
    );
  }

  // Domínio Y: do spread mínimo ao máximo
  const allY = data
    .flatMap((d) => [d.earningsYield, d.ntnbRate, d.premium])
    .filter((v): v is number => v != null);
  const yMin = Math.min(...allY, 0);
  const yMax = Math.max(...allY);
  const pad = (yMax - yMin) * 0.1;
  const yDomain: [number, number] = [yMin - pad, yMax + pad];

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Prêmio de equity vs NTN-B"
        subtitle={`EY nominal vs NTN-B 2045 real · ${summary.ntnbSymbol}`}
        rightSlot={
          <div className="flex items-center gap-2">
            <ChartPeriodTabs
              range={range}
              onChange={setRange}
              dataLength={yearsInData}
            />
            {summary.premium != null ? (
              <div
                className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                  summary.premium >= 0
                    ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                    : "bg-[var(--negative)]/15 text-[var(--negative)]"
                }`}
              >
                {summary.premium >= 0 ? "+" : "−"}
                {Math.abs(summary.premium).toFixed(1)}pp
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
              <linearGradient id="erp-pos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PACK.asset} stopOpacity={0.18} />
                <stop offset="100%" stopColor={PACK.asset} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="erp-neg" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--negative)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--negative)"
                  stopOpacity={0.04}
                />
              </linearGradient>
            </defs>
            <CartesianGrid {...packGrid} />
            <TimeXAxis tickFontSize={9} />
            <YAxis {...packYAxisPercentProps(1)} domain={yDomain} />
            <Tooltip
              wrapperStyle={packTooltipStyle}
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as EquityRiskPremiumPoint;
                if (!d) return null;
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
                      style={{ color: PACK.macro }}
                    >
                      NTN-B 2045:{" "}
                      {d.ntnbRate != null ? `${d.ntnbRate.toFixed(2)}%` : "—"}
                    </div>
                    {d.premium != null && (
                      <div
                        className={`text-[10px] tabular-nums mt-1 font-semibold ${
                          d.premium >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }`}
                      >
                        Prêmio: {d.premium >= 0 ? "+" : "−"}
                        {Math.abs(d.premium).toFixed(2)}pp
                      </div>
                    )}
                    <div className="text-[9px] text-foreground/60 mt-1.5 leading-tight border-t border-white/[0.05] pt-1.5">
                      EY nominal, NTN-B real. Spread = repasse
                      inflacionário implícito + prêmio de risco.
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine {...packRefLineZero} />
            {/* NTN-B (azul) — referência */}
            <Line
              dataKey="ntnbRate"
              {...packLineProps({ stroke: PACK.macro, strokeWidth: 2 })}
            />
            {/* EY (verde) — ativo */}
            <Line
              dataKey="earningsYield"
              {...packLineProps({ stroke: PACK.asset, strokeWidth: 2 })}
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
          <span>EY (nominal)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, " +
                PACK.macro +
                " 0 4px, transparent 4px 7px)",
            }}
          />
          <span>NTN-B 2045 (real)</span>
        </div>
        <div className="text-foreground/60">
          Atual: EY {summary.earningsYield?.toFixed(1)}% vs NTN-B{" "}
          {summary.ntnbRate?.toFixed(1)}%
        </div>
      </div>
    </ChartCard>
  );
}
