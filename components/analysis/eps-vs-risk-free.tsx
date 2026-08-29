"use client";

/**
 * EPSVsRiskFree — EPS vs SELIC real (taxa livre de risco).
 *
 * Mostra o poder de ganho do ativo (EPS) vs o que renderia a renda fixa.
 * Dual axis: EPS em R$ à esquerda, SELIC % à direita.
 *
 * Visual:
 *   EPS R$ / SELIC %
 *    ^
 * 30 ┤
 * 25 ┤   ● EPS
 * 20 ┤         ● ● ● ● ●
 * 15 ┤                              ● EPS
 * 10 ┤━━━ SELIC (linha pontilhada ~14%) ━━━
 *  5 ┤
 *    └─────────────────────────────────────
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
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, ChartCardHeader, tooltipWrapperStyle } from "./analysis-utils";

type IncomeRow = {
  endDate: string;
  basicEarningsPerShare?: number | null;
};
type MacroObs = { date: string; value: number };

type Props = {
  incomeHistory: IncomeRow[];
  selic: MacroObs[] | null;
  /** Limite de quarters a plotar (default 16). */
  limit?: number;
  className?: string;
};

export function EPSVsRiskFree({
  incomeHistory,
  selic,
  limit = 16,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    if (!selic || incomeHistory.length === 0) return [];
    // SELIC mensal médio (anualizado já é % a.a.)
    const selicMonthly = new Map<string, number[]>();
    for (const o of selic) {
      const month = o.date.slice(0, 7);
      if (!selicMonthly.has(month)) selicMonthly.set(month, []);
      selicMonthly.get(month)!.push(o.value);
    }
    const selicByMonth = new Map<string, number>();
    for (const [k, vs] of selicMonthly) {
      selicByMonth.set(k, vs.reduce((s, v) => s + v, 0) / vs.length);
    }
    return [...incomeHistory]
      .filter((r) => r.basicEarningsPerShare != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-limit)
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        return {
          endDate: r.endDate,
          eps: r.basicEarningsPerShare ?? null,
          selic: selicByMonth.get(month) ?? null,
        };
      });
  }, [incomeHistory, selic, limit]);

  if (data.length < 2) return null;

  // Spread: SELIC - EPS YoY (em %).
  // Como EPS é em R$, não %, calculamos via yield-on-EPS: EPS/currentPrice * 100.
  // Mas como não temos currentPrice aqui, mostramos o EPS absoluto vs SELIC %.
  const last = data[data.length - 1];

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="EPS vs SELIC real"
        subtitle="Poder de ganho do ativo vs taxa livre de risco"
        rightSlot={
          last.eps != null && last.selic != null ? (
            <div className="text-right">
              <div className="text-[11px] font-semibold tabular-nums text-foreground/90">
                R${last.eps.toFixed(2)}
              </div>
              <div className="text-[9px] text-muted-foreground/60 tabular-nums">
                SELIC {last.selic.toFixed(2)}%
              </div>
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
            <XAxis
              dataKey="endDate"
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T00:00:00Z");
                if (Number.isNaN(d.getTime())) return v;
                return d.toLocaleDateString("pt-BR", {
                  month: "short",
                  year: "2-digit",
                });
              }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={48}
            />
            {/* Eixo Y esquerdo: EPS em R$ */}
            <YAxis
              yAxisId="eps"
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              width={42}
              tickCount={4}
            />
            {/* Eixo Y direito: SELIC % */}
            <YAxis
              yAxisId="selic"
              orientation="right"
              tick={{
                fill: "rgba(72, 159, 250, 0.65)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              axisLine={false}
              tickLine={false}
              width={36}
              tickCount={4}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  eps: number | null;
                  selic: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-muted-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      EPS:{" "}
                      {d.eps != null
                        ? `R$${d.eps.toFixed(2)}`
                        : "—"}
                    </div>
                    {d.selic != null && (
                      <div className="text-[11px] tabular-nums text-[#489ffa]">
                        SELIC: {d.selic.toFixed(2)}%
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Line
              yAxisId="eps"
              type="monotone"
              dataKey="eps"
              stroke="var(--positive)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--positive)" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
            <Line
              yAxisId="selic"
              type="monotone"
              dataKey="selic"
              stroke="#489ffa"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 4, fill: "#489ffa" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>EPS (R$)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, #489ffa 0 3px, transparent 3px 6px)",
            }}
          />
          <span>SELIC (% a.a., eixo direito)</span>
        </div>
      </div>
    </ChartCard>
  );
}
