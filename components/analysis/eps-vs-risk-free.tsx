"use client";

/**
 * EPSYieldVsSelic — earnings yield (EPS/price) vs SELIC real.
 *
 * Earnings yield = EPS / currentPrice × 100. Quando a linha do earnings
 * yield (verde) está acima da SELIC (azul tracejado), a ação paga mais
 * que a renda fixa. Mesma unidade (% a.a.) — eixo Y único, sem dual-axis.
 *
 * Visual:
 *   EY % / SELIC %
 *    ^
 *  20%┤   ● EPS yield
 *  15%┤
 *  10%┤
 *   5%┤ ─ ─ ─ SELIC (~14%) ─ ─ ─ ─ ─ ─
 *      └────────────────────────────────
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
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
  /** Preço atual pra calcular earnings yield. */
  currentPrice: number | null;
  /** Limite de quarters a plotar (default 16). */
  limit?: number;
  className?: string;
};

export function EPSVsRiskFree({
  incomeHistory,
  selic,
  currentPrice,
  limit = 16,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    if (!selic || incomeHistory.length === 0) return [];
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
    // BCB SELIC limita janela em 10 anos. Pra alinhar os gráficos,
    // limitamos incomeHistory à mesma janela.
    const BCB_WINDOW_START = "2016-08-01";

    return [...incomeHistory]
      .filter(
        (r) =>
          r.basicEarningsPerShare != null && r.endDate >= BCB_WINDOW_START,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-limit)
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        return {
          endDate: r.endDate,
          // Earnings yield = EPS / price × 100. Mas EPS varia por quarter
          // e preço é "agora" — usamos o preço atual como referência
          // (yield implícito se o preço se mantivesse constante).
          earningsYield:
            currentPrice != null && currentPrice > 0
              ? ((r.basicEarningsPerShare ?? 0) / currentPrice) * 100
              : null,
          selic: selicByMonth.get(month) ?? null,
        };
      });
  }, [incomeHistory, selic, currentPrice, limit]);

  if (data.length < 2) return null;

  const last = data[data.length - 1];
  const beating =
    last.earningsYield != null &&
    last.selic != null &&
    last.earningsYield > last.selic;
  const spread =
    last.earningsYield != null && last.selic != null
      ? last.earningsYield - last.selic
      : null;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Earnings yield vs SELIC"
        subtitle={
          beating != null
            ? beating
              ? "Ação paga mais que a renda fixa"
              : "Renda fixa paga mais que a ação"
            : "Comparação entre earnings yield e taxa livre de risco"
        }
        rightSlot={
          spread != null ? (
            <div
              className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${beating ? "bg-[var(--positive)]/15 text-[var(--positive)]" : "bg-[var(--negative)]/15 text-[var(--negative)]"}`}
            >
              {spread >= 0 ? "+" : "−"}
              {Math.abs(spread).toFixed(2)} pp
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
                  earningsYield: number | null;
                  selic: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-muted-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      Earnings yield:{" "}
                      {d.earningsYield != null
                        ? `${d.earningsYield.toFixed(2)}%`
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
              type="monotone"
              dataKey="earningsYield"
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
          <span>Earnings yield (EPS / preço)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[#489ffa]" />
          <span>SELIC (% a.a.)</span>
        </div>
      </div>
    </ChartCard>
  );
}
