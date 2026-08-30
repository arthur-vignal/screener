"use client";

/**
 * EarningsYieldVsCDI — earnings yield (1/P/L) vs CDI anual ao longo do tempo.
 *
 * Quando a linha do earnings yield (verde) está acima do CDI (azul),
 * a ação está pagando mais que a renda fixa. Útil pra decidir entre
 * comprar ação vs deixar no CDI.
 *
 * Dados:
 *   - Earnings yield = 1 / trailingPE por quarter
 *   - CDI anual = série CDI da brapi (diária) — convertida pra anual
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, ChartCardHeader, tooltipWrapperStyle } from "./analysis-utils";

type StatsRow = { endDate: string; trailingPE?: number | null };
type MacroObs = { date: string; value: number };

type Props = {
  statsHistory: StatsRow[];
  cdiDaily: MacroObs[] | null;
  className?: string;
};

export function EarningsYieldVsCDI({
  statsHistory,
  cdiDaily,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    if (statsHistory.length === 0) return [];
    // Para cada quarter, pega o PE e calcula earnings yield = 1/PE (em %).
    // Depois pega o CDI anualizado do mês correspondente. A série 4389
    // (BCB CDI Over) já vem anualizada em % a.a., então não multiplica
    // por 365 (isso daria 4980% errado).
    // Agrupa CDI por mês pra alinhar com quarters (que são mensais).
    const cdiMonthlyAvg = new Map<string, number[]>();
    for (const o of cdiDaily ?? []) {
      const month = o.date.slice(0, 7); // YYYY-MM
      if (!cdiMonthlyAvg.has(month)) cdiMonthlyAvg.set(month, []);
      cdiMonthlyAvg.get(month)!.push(o.value);
    }
    const cdiMonthMap = new Map<string, number>();
    for (const [k, vs] of cdiMonthlyAvg) {
      const avg = vs.reduce((s, v) => s + v, 0) / vs.length;
      cdiMonthMap.set(k, avg);
    }

    // Para cada quarter, alinha com o mês correspondente (MM do endDate).
    return statsHistory
      .filter((r) => r.trailingPE != null && r.trailingPE > 0 && r.trailingPE < 100)
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        const cdiAnnual = cdiMonthMap.get(month);
        const earningsYield = r.trailingPE! > 0 ? (1 / r.trailingPE!) * 100 : null;
        return {
          endDate: r.endDate,
          earningsYield,
          cdi: cdiAnnual ?? null,
        };
      })
      .filter((d) => d.earningsYield != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [statsHistory, cdiDaily]);

  if (data.length < 2) return null;

  const lastEy = data[data.length - 1]?.earningsYield ?? null;
  const lastCdi = data[data.length - 1]?.cdi ?? null;
  const spread =
    lastEy != null && lastCdi != null ? lastEy - lastCdi : null;
  const verdict =
    spread != null
      ? spread >= 0
        ? `Renda variável pagando ${Math.abs(spread).toFixed(1)}% a mais`
        : `Renda fixa pagando ${Math.abs(spread).toFixed(1)}% a mais`
      : null;
  const verdictColor =
    spread != null
      ? spread >= 0
        ? "text-[var(--positive)]"
        : "text-[var(--negative)]"
      : "text-foreground/70";

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Earnings yield vs CDI"
        subtitle={
          verdict
            ? `Spread atual: ${verdict}`
            : "Comparação entre earnings yield e CDI"
        }
        rightSlot={
          verdict && (
            <div className={`text-[10px] font-semibold ${verdictColor}`}>
              {spread! >= 0 ? "+" : "−"}
              {Math.abs(spread!).toFixed(1)} pp
            </div>
          )
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
              width={36}
              tickCount={4}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  endDate: string;
                  earningsYield: number;
                  cdi: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70">
                      {d.endDate}
                    </div>
                    <div className="text-[12px] font-semibold tabular-nums text-[var(--positive)]">
                      EY: {d.earningsYield.toFixed(2)}%
                    </div>
                    {d.cdi != null && (
                      <div className="text-[10px] tabular-nums text-foreground/85">
                        CDI: {d.cdi.toFixed(2)}%
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
              activeDot={{ r: 4 }}
              isAnimationActive={true}
              animationDuration={1200}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="cdi"
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
      <div className="mt-3 flex items-center gap-4 text-[10px] text-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>Earnings yield (1/P/L)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, #489ffa 0 3px, transparent 3px 6px)",
            }}
          />
          <span>CDI anualizado</span>
        </div>
      </div>
    </ChartCard>
  );
}
