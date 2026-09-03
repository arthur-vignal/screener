"use client";

/**
 * MarginTrend — margins (gross / operating / profit) ao longo dos últimos
 * quarters.
 *
 * A2 fix (spec 2026-08-29): antes usava `<Area stackId="margins">` empilhado,
 * mas margem é aninhada (lucro ⊂ operacional ⊂ bruto), não aditiva. Empilhar
 * somava 52+37+24=113%, eixo Y ia a 128% — número sem interpretação.
 *
 * Correção: 3 áreas SEM `stackId`, fillOpacity baixo, ordem de render do
 * maior pro menor (gross no fundo, profit no topo) pra profit não ser
 * coberto. Eixo Y com `domain={[0, 'auto']}` — teto natural é a margem
 * bruta máxima.
 *
 * PeriodTabs (2026-08-31): seletor 1a/3a/5a/máx no header. Caller que
 * passar `limit` quarters explícito desliga o seletor (comportamento
 * legado).
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import {
  PACK,
  packLineProps,
  packYAxisPercentProps,
  packGrid,
} from "@/lib/chart-pack";

type MarginsRow = {
  endDate: string;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
};

type Props = {
  history: MarginsRow[];
  /**
   * Quantos quarters mostrar (default 16 = ~4a). Quando omitido, o
   * seletor de período (1a/3a/5a/máx) controla o filtro.
   */
  limit?: number;
  className?: string;
};

export function MarginTrend({
  history,
  limit = 16,
  className,
}: Props): JSX.Element | null {
  // `useFallback` desliga o PeriodTabs quando o caller passa `limit`
  // explicitamente (ex: /home com widget compacto). Quando omitido, o
  // seletor controla o range.
  const useFallback = limit !== 16;
  const { range, setRange, filtered: periodFiltered } = useChartPeriod(history);
  const baseRows = useFallback ? history : periodFiltered;

  const data = useMemo(() => {
    const rows = [...baseRows]
      .filter(
        (r) =>
          r.grossMargins != null &&
          r.operatingMargins != null &&
          r.profitMargins != null,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(useFallback ? -limit : undefined)
      .map((r) => ({
        endDate: r.endDate,
        gross: (r.grossMargins ?? 0) * 100,
        operating: (r.operatingMargins ?? 0) * 100,
        profit: (r.profitMargins ?? 0) * 100,
      }));

    // A2 assert (rodado em dev; em prod é no-op). Margem deve ser aninhada:
    // gross ≥ operating ≥ profit em todo ponto. Se violar, há erro de
    // mapeamento de conta no endpoint — não gráfico.
    if (process.env.NODE_ENV !== "production") {
      for (const r of rows) {
        if (r.operating > r.gross + 0.5 || r.profit > r.operating + 0.5) {
          console.warn(
            `[MarginTrend] margem não-aninhada em ${r.endDate}: gross=${r.gross.toFixed(1)}, op=${r.operating.toFixed(1)}, profit=${r.profit.toFixed(1)}`,
          );
        }
      }
    }

    // A3 fix: adiciona timestamp numérico pro eixo X usar `scale="time"`
    // (distância proporcional ao tempo decorrido, não ao índice).
    return attachTimestamps(rows);
  }, [baseRows, limit, useFallback]);

  if (data.length < 2) return null;

  const last = data[data.length - 1];
  // ~anos cobertos (4 quarters por ano calendário) — usado pra
  // desabilitar presets > dataLength no ChartPeriodSelector.
  const yearsInData = Math.ceil(history.length / 4);

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Margins trend"
        subtitle={`Último Q: gross ${last.gross.toFixed(1)}% · op ${last.operating.toFixed(1)}% · profit ${last.profit.toFixed(1)}%`}
        rightSlot={
          !useFallback ? (
            <ChartPeriodTabs
              range={range}
              onChange={setRange}
              dataLength={yearsInData}
            />
          ) : undefined
        }
      />
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="mt-gross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#489ffa" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#489ffa" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="mt-op" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="mt-profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9ba1a8" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#9ba1a8" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={PACK.gridLine}
              strokeWidth={1}
              vertical={false}
            />
            <TimeXAxis />
            <YAxis
              tick={{
                fill: PACK.tick,
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              axisLine={false}
              tickLine={false}
              width={36}
              tickCount={4}
              domain={[0, "auto"]}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  gross: number;
                  operating: number;
                  profit: number;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[#489ffa]">
                      Gross: {d.gross.toFixed(1)}%
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      Operating: {d.operating.toFixed(1)}%
                    </div>
                    <div className="text-[11px] tabular-nums text-foreground/85">
                      Profit: {d.profit.toFixed(1)}%
                    </div>
                  </div>
                );
              }}
            />
            {/* A2 fix: sem `stackId` — áreas sobrepostas, não empilhadas.
                Render do maior (fundo) pro menor (topo): gross primeiro,
                depois operating, profit por cima. fillOpacity baixo pra
                não cobrir totalmente a área debaixo. */}
            <Area
              type="monotone"
              dataKey="gross"
              stroke="#489ffa"
              strokeWidth={1.5}
              fill="url(#mt-gross)"
              isAnimationActive={true}
              animationDuration={1200}
            />
            <Area
              type="monotone"
              dataKey="operating"
              stroke="var(--positive)"
              strokeWidth={1.5}
              fill="url(#mt-op)"
              isAnimationActive={true}
              animationDuration={1200}
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#9ba1a8"
              strokeWidth={1.5}
              fill="url(#mt-profit)"
              isAnimationActive={true}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#489ffa]/60" />
          <span>Gross</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--positive)]/60" />
          <span>Operating</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-foreground/45" />
          <span>Profit</span>
        </div>
      </div>
    </ChartCard>
  );
}