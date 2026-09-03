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
 *
 * Fix 2026-09-03 (sessão pós-print): os charts do /analysis somem quando
 * o usuário clica em "1a" no seletor de período. Causa raiz específica
 * deste chart: o último quarter (T atual) é recente demais pra BCB
 * SGS ter publicado a SELIC mensal agregada — `selicByMonth.get(month)`
 * retorna `null` e a linha azul fica sem pontos. Solução: quando o mês
 * do último quarter está fora da janela BCB, **fallback pra SELIC do
 * mês anterior** (carry-forward do último valor conhecido). Mantém a
 * visualização funcional sem distorcer a história.
 *
 * Visual 2026-09-03: paleta via `lib/chart-pack.ts` (Calibre/Inter +
 * 13 cores WCAG AA). Verde `PACK.asset` (ativo) + azul `PACK.macro`
 * (SELIC). Stroke 2px em ambas, opacity 1.0.
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
  packTooltipStyle,
} from "@/lib/chart-pack";
import type { EarningsYieldHistoryPoint } from "@/lib/analytics/earnings-yield-history";

type MacroObs = { date: string; value: number };

export type { EarningsYieldHistoryPoint };

type Props = {
  earningsYieldHistory: EarningsYieldHistoryPoint[];
  selic: MacroObs[] | null;
  /** Limite de quarters a plotar (default 16 = ~4a, default do seletor). */
  limit?: number;
  className?: string;
};

export function EarningsYieldVsRiskFree({
  earningsYieldHistory,
  selic,
  limit = 16,
  className,
}: Props): JSX.Element | null {
  // `useFallback` desliga o PeriodTabs quando caller passa `limit`
  // explícito. Mesmo padrão do MarginTrend.
  const useFallback = limit !== 16;
  const { range, setRange, filtered: periodFiltered } =
    useChartPeriod(earningsYieldHistory);
  const historyForRender = useFallback
    ? earningsYieldHistory
    : periodFiltered;

  const data = useMemo(() => {
    if (!selic || historyForRender.length === 0) return [];
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
    // Carry-forward: pra cada mês sem dado, usa o último valor conhecido
    // anterior. Isso cobre o delay de publicação do BCB SGS (1-2 dias)
    // quando o último quarter é recente demais.
    const monthsSorted = [...selicByMonth.keys()].sort();
    const selicWithCarryForward = new Map<string, number>();
    let lastKnown: number | null = null;
    for (const m of monthsSorted) {
      const v = selicByMonth.get(m);
      if (v != null) {
        selicWithCarryForward.set(m, v);
        lastKnown = v;
      } else if (lastKnown != null) {
        selicWithCarryForward.set(m, lastKnown);
      }
    }

    const mapped = [...historyForRender]
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
      .slice(useFallback ? -limit : undefined)
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        return {
          endDate: r.endDate,
          earningsYield: r.earningsYield,
          selic: selicWithCarryForward.get(month) ?? null,
        };
      });
    // A3 fix: timestamp numérico pro eixo X usar `scale="time"`.
    return attachTimestamps(mapped);
  }, [historyForRender, selic, limit, useFallback]);

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
          <div className="flex items-center gap-2">
            {!useFallback ? (
              <ChartPeriodTabs
                range={range}
                onChange={setRange}
                dataLength={Math.ceil(earningsYieldHistory.length / 4)}
              />
            ) : null}
            {spread != null ? (
              <div
                className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                  beating
                    ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                    : "bg-[var(--negative)]/15 text-[var(--negative)]"
                }`}
              >
                {spread >= 0 ? "+" : "−"}
                {Math.abs(spread).toFixed(2)} pp
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
            <TimeXAxis />
            <YAxis {...packYAxisPercentProps(0)} />
            <Tooltip
              wrapperStyle={packTooltipStyle}
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
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
                    <div
                      className="text-[11px] tabular-nums"
                      style={{ color: PACK.asset }}
                    >
                      Earnings yield:{" "}
                      {d.earningsYield != null
                        ? `${d.earningsYield.toFixed(2)}%`
                        : "—"}
                    </div>
                    {d.selic != null && (
                      <div
                        className="text-[11px] tabular-nums"
                        style={{ color: PACK.macro }}
                      >
                        SELIC: {d.selic.toFixed(2)}%
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {/* Linha do ativo (verde) — vem primeiro pra ficar embaixo */}
            <Line
              dataKey="earningsYield"
              {...packLineProps({ stroke: PACK.asset, strokeWidth: 2 })}
            />
            {/* Linha da SELIC (azul) — por cima, mesma espessura */}
            <Line
              dataKey="selic"
              {...packLineProps({ stroke: PACK.macro, strokeWidth: 2 })}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.asset }}
          />
          <span>Earnings yield (1 / trailingPE)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.macro }}
          />
          <span>SELIC (% a.a.)</span>
        </div>
      </div>
    </ChartCard>
  );
}
