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
} from "./analysis-utils";
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
  const data = useMemo(() => attachTimestamps(series), [series]);

  if (data.length < 4) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Prêmio de equity vs NTN-B"
          subtitle="Histórico insuficiente (mínimo 4 quarters)"
        />
      </ChartCard>
    );
  }

  // Domínio Y: do spread mínimo ao máximo
  const allY = data.flatMap((d) => [d.earningsYield, d.ntnbRate, d.premium]).filter((v): v is number => v != null);
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
          summary.premium != null ? (
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
          ) : null
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
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="erp-neg" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              axisLine={false}
              tickLine={false}
              width={40}
              tickCount={5}
              domain={yDomain}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as EquityRiskPremiumPoint;
                if (!d) return null;
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
                    <div className="text-[11px] tabular-nums text-[#489ffa]">
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
                    <div className="text-[9px] text-muted-foreground/50 mt-1.5 leading-tight border-t border-white/[0.05] pt-1.5">
                      EY nominal, NTN-B real. Spread = repasse
                      inflacionário implícito + prêmio de risco.
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
            {/* NTN-B (azul, tracejado) — referência */}
            <Line
              type="monotone"
              dataKey="ntnbRate"
              stroke="#489ffa"
              strokeWidth={2}
              strokeOpacity={1}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4, fill: "#489ffa" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
            {/* EY (verde, sólido) */}
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>EY (nominal)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, #489ffa 0 4px, transparent 4px 7px)",
            }}
          />
          <span>NTN-B 2045 (real)</span>
        </div>
        <div className="text-muted-foreground/45">
          Atual: EY {summary.earningsYield?.toFixed(1)}% vs NTN-B {summary.ntnbRate?.toFixed(1)}%
        </div>
      </div>
    </ChartCard>
  );
}