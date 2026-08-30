"use client";

/**
 * RevenueVsPIB — crescimento YoY de receita do ativo vs IBC-Br (proxy PIB).
 *
 * Quando o crescimento do ativo se mantém acima do PIB por vários
 * quarters consecutivos, a empresa está ganhando market share.
 * Quando fica abaixo, está perdendo.
 *
 * Visual:
 *   YoY %
 *    ^
 *  30%┤
 *  20%┤  ● IBC-Br
 *  10%┤                              ● Revenue
 *   0%┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (zero)
 *  -10%┤    ● PETR4 YoY
 *  -20%┤
 *      └────────────────────────────────────
 *        24     25     26
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
  YAxis,
} from "recharts";

import { ChartCard, ChartCardHeader, TimeXAxis, tooltipWrapperStyle, attachTimestamps } from "./analysis-utils";

type IncomeRow = {
  endDate: string;
  totalRevenue?: number | null;
  revenueGrowth?: number | null;
};
type MacroObs = { date: string; value: number };

type Props = {
  incomeHistory: IncomeRow[];
  /** brapi não tem PIB mensal — usa IBC-Br como proxy. */
  ibcBr: MacroObs[] | null;
  className?: string;
};

/** Calcula YoY % de receita por quarter a partir do incomeHistory. */
function buildRevenueYoY(
  incomeHistory: IncomeRow[],
): Array<{ endDate: string; revenueGrowth: number | null }> {
  const sorted = [...incomeHistory].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );
  // Mapa year-quarter -> revenue
  const yqMap = new Map<string, number>();
  for (const r of sorted) {
    if (r.totalRevenue != null && r.totalRevenue > 0) {
      const year = r.endDate.slice(0, 4);
      const qNum = Math.ceil(
        (Number(r.endDate.slice(5, 7)) || 1) / 3,
      );
      yqMap.set(`${year}Q${qNum}`, r.totalRevenue);
    }
  }
  // Pra cada row, busca o revenue de 4 quarters atrás (mesmo Q, ano anterior)
  return sorted
    .filter((r) => r.totalRevenue != null && r.totalRevenue > 0)
    .map((r) => {
      const year = Number(r.endDate.slice(0, 4));
      const qNum = Math.ceil(Number(r.endDate.slice(5, 7)) / 3);
      const prevYear = `${year - 1}Q${qNum}`;
      const prevRevenue = yqMap.get(prevYear);
      const growth =
        prevRevenue && prevRevenue > 0
          ? ((r.totalRevenue! - prevRevenue) / prevRevenue) * 100
          : null;
      return { endDate: r.endDate, revenueGrowth: growth };
    });
}

/** Calcula YoY % de IBC-Br por mês (12 meses atrás). */
function buildIBCBrYoY(
  ibcBr: MacroObs[] | null,
): Array<{ endDate: string; growth: number | null }> {
  if (!ibcBr) return [];
  const sorted = [...ibcBr].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(sorted.map((o) => [o.date, o.value]));
  return sorted
    .filter((o) => o.date.endsWith("-01") || o.date.endsWith("-04") || o.date.endsWith("-07") || o.date.endsWith("-10"))
    .map((o) => {
      // Pra cada observation, busca 12 meses atrás
      const d = new Date(o.date + "T00:00:00Z");
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      const prevDate = d.toISOString().slice(0, 10);
      const prev = byDate.get(prevDate);
      const growth =
        prev != null && prev !== 0
          ? ((o.value - prev) / prev) * 100
          : null;
      return { endDate: o.date, growth };
    });
}

export function RevenueVsPIB({
  incomeHistory,
  ibcBr,
  className,
}: Props): JSX.Element | null {
  // BCB IBC-Br limita janela em 20 anos. Pra alinhar, limitamos
  // incomeHistory à mesma janela (10 anos de qualquer jeito).
  const BCB_WINDOW_START = "2006-08-01";

  const data = useMemo(() => {
    const revYoY = buildRevenueYoY(incomeHistory);
    const ibcYoY = buildIBCBrYoY(ibcBr);
    // Map IBC-Br YoY por mês (YYYY-MM) pra alinhar com quarters.
    const ibcByMonth = new Map<string, number>();
    for (const d of ibcYoY) {
      if (d.growth != null) {
        ibcByMonth.set(d.endDate.slice(0, 7), d.growth);
      }
    }
    const mapped = revYoY
      .filter((r) => r.endDate >= BCB_WINDOW_START)
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        return {
          endDate: r.endDate,
          revenueGrowth: r.revenueGrowth,
          ibcBr: ibcByMonth.get(month) ?? null,
        };
      })
      .filter((d) => d.revenueGrowth != null)
      .slice(-12);
    // A3 fix: timestamp numérico pro eixo X usar `scale="time"`.
    return attachTimestamps(mapped);
  }, [incomeHistory, ibcBr]);

  if (data.length < 2) return null;

  const last = data[data.length - 1];
  const beating =
    last.revenueGrowth != null &&
    last.ibcBr != null &&
    last.revenueGrowth > last.ibcBr;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Receita YoY vs IBC-Br"
        subtitle={
          beating != null
            ? beating
              ? "Receita crescendo acima do PIB"
              : "Receita crescendo abaixo do PIB"
            : "Comparação do crescimento da receita com a economia"
        }
        rightSlot={
          last.revenueGrowth != null && last.ibcBr != null ? (
            <div className="text-right">
              <div
                className={`text-[11px] font-semibold tabular-nums ${beating ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
              >
                {last.revenueGrowth >= 0 ? "+" : "−"}
                {Math.abs(last.revenueGrowth).toFixed(1)}%
              </div>
              <div className="text-[9px] text-foreground/60">
                PIB {last.ibcBr >= 0 ? "+" : "−"}
                {Math.abs(last.ibcBr).toFixed(1)}%
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
                  revenueGrowth: number | null;
                  ibcBr: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      Receita:{" "}
                      {d.revenueGrowth != null
                        ? `${d.revenueGrowth >= 0 ? "+" : "−"}${Math.abs(d.revenueGrowth).toFixed(1)}%`
                        : "—"}
                    </div>
                    {d.ibcBr != null && (
                      <div className="text-[11px] tabular-nums text-[#489ffa]">
                        IBC-Br:{" "}
                        {d.ibcBr >= 0 ? "+" : "−"}
                        {Math.abs(d.ibcBr).toFixed(1)}%
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
              dataKey="revenueGrowth"
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
              dataKey="ibcBr"
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
          <span>Receita YoY</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[#489ffa]" />
          <span>IBC-Br (proxy PIB) YoY</span>
        </div>
      </div>
    </ChartCard>
  );
}
