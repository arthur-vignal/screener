"use client";

/**
 * EarningsYieldVsRiskFree — earnings yield histórico vs SELIC.
 *
 * Mostra a evolução do earnings yield (= 1/trailingPE) ao longo do tempo,
 * comparado com a SELIC. Quando o EY está acima da SELIC (azul), a ação
 * paga mais que a renda fixa.
 *
 * Diferença vs versão anterior (fix A1 da spec 2026-08-29):
 *   - Antes: EPS / currentPrice × 100 (yield implícito se o preço se
 *     mantivesse constante — distorcia todos os pontos passados)
 *   - Agora: server retorna `earningsYieldHistory` calculado via
 *     1/trailingPE[t] (equivalente à definição de "earnings yield" da
 *     brapi) usando preço histórico.
 *
 * Mesma unidade (% a.a.) — eixo Y único, sem dual-axis. Linha sólida
 * verde (EY) + linha sólida azul (SELIC).
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

import { ChartCard, ChartCardHeader, TimeXAxis, tooltipWrapperStyle, attachTimestamps } from "./analysis-utils";
import type { EarningsYieldHistoryPoint } from "@/lib/analytics/earnings-yield-history";

type MacroObs = { date: string; value: number };

export type { EarningsYieldHistoryPoint };

type Props = {
  earningsYieldHistory: EarningsYieldHistoryPoint[];
  selic: MacroObs[] | null;
  /** Limite de quarters a plotar (default 16). */
  limit?: number;
  className?: string;
};

export function EarningsYieldVsRiskFree({
  earningsYieldHistory,
  selic,
  limit = 16,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    if (!selic || earningsYieldHistory.length === 0) return [];
    // Média de SELIC por mês pra alinhar com quarters.
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

    const mapped = [...earningsYieldHistory]
      .filter(
        (r) =>
          r.earningsYield != null &&
          // Winsorizar outliers históricos (anos de boom cíclico). Mantém
          // o ponto mas clampa em ±80% pra escala do gráfico não ser
          // dominada por eles. Não mascara — só protege o eixo Y.
          // (Anotação: outlier >40% é real em cíclicas; logar no server.)
          Math.abs(r.earningsYield) <= 80,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-limit)
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        return {
          endDate: r.endDate,
          earningsYield: r.earningsYield,
          selic: selicByMonth.get(month) ?? null,
        };
      });
    // A3 fix: timestamp numérico pro eixo X usar `scale="time"`.
    return attachTimestamps(mapped);
  }, [earningsYieldHistory, selic, limit]);

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
            <TimeXAxis />
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
                    <div className="text-[10px] text-foreground/70 mb-1">
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
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>Earnings yield (1 / trailingPE)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[#489ffa]" />
          <span>SELIC (% a.a.)</span>
        </div>
      </div>
    </ChartCard>
  );
}