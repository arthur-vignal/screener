"use client";

/**
 * MarginTrend — margins (gross / operating / profit) em área empilhada
 * ao longo dos últimos 16 quarters.
 *
 * Visual:
 *   Margins (16Q)
 *   60%┤
 *   40%┤      ━━━━━━━━━━━  ━━━  gross (52%)
 *       ─────────────────────────────────────── operating (37%)
 *   20%┤                                              ━━ profit (24%)
 *   ────────────────────────────────────────────────
 *        Q1 22   Q1 23   Q1 24   Q1 25   Q1 26
 *
 * Cores: gross = primary (azul), operating = positive (verde),
 * profit = muted (cinza claro).
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, ChartCardHeader, tooltipWrapperStyle } from "./analysis-utils";

type MarginsRow = {
  endDate: string;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
};

type Props = {
  history: MarginsRow[];
  /** Quantos quarters mostrar (default 16). */
  limit?: number;
  className?: string;
};

export function MarginTrend({
  history,
  limit = 16,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    return [...history]
      .filter(
        (r) =>
          r.grossMargins != null &&
          r.operatingMargins != null &&
          r.profitMargins != null,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-limit)
      .map((r) => ({
        endDate: r.endDate,
        gross: (r.grossMargins ?? 0) * 100,
        operating: (r.operatingMargins ?? 0) * 100,
        profit: (r.profitMargins ?? 0) * 100,
      }));
  }, [history, limit]);

  if (data.length < 2) return null;

  const last = data[data.length - 1];

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Margins trend"
        subtitle={`Último Q: gross ${last.gross.toFixed(1)}% · op ${last.operating.toFixed(1)}% · profit ${last.profit.toFixed(1)}%`}
      />
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="mt-gross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#489ffa" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#489ffa" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="mt-op" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="mt-profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9ba1a8" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#9ba1a8" stopOpacity={0.15} />
              </linearGradient>
            </defs>
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
              domain={[0, 100]}
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
                    <div className="text-[10px] text-muted-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[#489ffa]">
                      Gross: {d.gross.toFixed(1)}%
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      Operating: {d.operating.toFixed(1)}%
                    </div>
                    <div className="text-[11px] tabular-nums text-muted-foreground/85">
                      Profit: {d.profit.toFixed(1)}%
                    </div>
                  </div>
                );
              }}
            />
            {/* Em ordem do mais alto (fundo) ao mais baixo (topo).
                Stack invertida: gross por baixo, profit por cima. */}
            <Area
              type="monotone"
              dataKey="gross"
              stackId="margins"
              stroke="#489ffa"
              strokeWidth={1}
              fill="url(#mt-gross)"
              isAnimationActive={true}
              animationDuration={1200}
            />
            <Area
              type="monotone"
              dataKey="operating"
              stackId="margins"
              stroke="var(--positive)"
              strokeWidth={1}
              fill="url(#mt-op)"
              isAnimationActive={true}
              animationDuration={1200}
            />
            <Area
              type="monotone"
              dataKey="profit"
              stackId="margins"
              stroke="#9ba1a8"
              strokeWidth={1}
              fill="url(#mt-profit)"
              isAnimationActive={true}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#489ffa]/60" />
          <span>Gross</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--positive)]/60" />
          <span>Operating</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted-foreground/55" />
          <span>Profit</span>
        </div>
      </div>
    </ChartCard>
  );
}
