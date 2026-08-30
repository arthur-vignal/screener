"use client";

/**
 * ROICVsSelic — ROE/ROIC vs SELIC real (proxy de WACC).
 *
 * Quando ROIC > SELIC, o ativo gera valor acima do custo de oportunidade.
 * Quando ROIC < SELIC, está destruindo valor.
 *
 * Banda verde acima do zero (ROIC > SELIC) = geração de valor
 * Banda vermelha abaixo do zero (ROIC < SELIC) = destruição
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

type MarginsRow = { endDate: string; returnOnEquity?: number | null };
type MacroObs = { date: string; value: number };

type Props = {
  marginsHistory: MarginsRow[];
  selic: MacroObs[] | null;
  className?: string;
};

/**
 * SELIC vem diária. Pra alinhar com quarters, agrega por mês
 * e annualiza (SELIC é % a.a. já, então só tira a média mensal).
 */
function alignSelicToQuarters(selic: MacroObs[] | null) {
  if (!selic) return new Map<string, number>();
  const monthlyAvg = new Map<string, number[]>();
  for (const o of selic) {
    const month = o.date.slice(0, 7); // YYYY-MM
    if (!monthlyAvg.has(month)) monthlyAvg.set(month, []);
    monthlyAvg.get(month)!.push(o.value);
  }
  const out = new Map<string, number>();
  for (const [k, vs] of monthlyAvg) {
    out.set(k, vs.reduce((s, v) => s + v, 0) / vs.length);
  }
  return out;
}

export function ROICVsSelic({
  marginsHistory,
  selic,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    const selicByMonth = alignSelicToQuarters(selic);
    return marginsHistory
      .filter((r) => r.returnOnEquity != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        const roePct = (r.returnOnEquity ?? 0) * 100;
        const selicPct = selicByMonth.get(month) ?? null;
        // Spread = ROE - SELIC (em pontos percentuais)
        const spread = selicPct != null ? roePct - selicPct : null;
        return {
          endDate: r.endDate,
          roe: roePct,
          selic: selicPct,
          spread,
        };
      });
  }, [marginsHistory, selic]);

  if (data.length < 2) return null;

  const last = data[data.length - 1];
  const creatingValue =
    last.spread != null && last.spread > 0;

  // Domain: cobre valores negativos e positivos
  const allVals = data.flatMap((d) => [d.roe, d.selic ?? 0]);
  const min = Math.min(...allVals) - 2;
  const max = Math.max(...allVals) + 2;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="ROE vs SELIC real"
        subtitle={
          last.spread != null
            ? `Spread: ${last.spread >= 0 ? "+" : "−"}${Math.abs(last.spread).toFixed(1)} pp · ${creatingValue ? "Gera valor" : "Destrói valor"}`
            : "Spread = ROE - SELIC (proxy de WACC)"
        }
        rightSlot={
          last.spread != null ? (
            <div
              className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${creatingValue ? "bg-[var(--positive)]/15 text-[var(--positive)]" : "bg-[var(--negative)]/15 text-[var(--negative)]"}`}
            >
              {last.spread >= 0 ? "+" : "−"}
              {Math.abs(last.spread).toFixed(1)} pp
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
            <YAxis
              domain={[Math.min(min, -5), Math.max(max, 20)]}
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              axisLine={false}
              tickLine={false}
              width={36}
              tickCount={5}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  roe: number;
                  selic: number | null;
                  spread: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-muted-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      ROE: {d.roe.toFixed(2)}%
                    </div>
                    {d.selic != null && (
                      <div className="text-[11px] tabular-nums text-[#489ffa]">
                        SELIC: {d.selic.toFixed(2)}%
                      </div>
                    )}
                    {d.spread != null && (
                      <div
                        className={`text-[10px] tabular-nums mt-1 font-semibold ${d.spread >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                      >
                        Spread: {d.spread >= 0 ? "+" : "−"}
                        {Math.abs(d.spread).toFixed(2)} pp
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {/* Linha zero (referência) */}
            <ReferenceLine
              y={0}
              stroke="rgba(255,255,255,0.20)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <Line
              type="monotone"
              dataKey="roe"
              stroke="var(--positive)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--positive)" }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="selic"
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>ROE (retorno sobre equity)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, #489ffa 0 3px, transparent 3px 6px)",
            }}
          />
          <span>SELIC (proxy WACC)</span>
        </div>
      </div>
    </ChartCard>
  );
}
