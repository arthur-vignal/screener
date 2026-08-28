"use client";

/**
 * PEHistoryChart — gráfico de bandas históricas de P/L (estilo Fey TSLA).
 *
 * Visual:
 *   - Linha do P/L histórico (4 anos, dados trimestrais da brapi)
 *   - Banda sombreada ±1σ (média ± 1 desvio padrão)
 *   - Linha horizontal tracejada da média
 *   - Marker circular do valor atual
 *   - Cores: verde se atual < média (barato), vermelho se > média+1σ (caro)
 *   - Label "Current: 4.1x | Median: 8.2x | Z-score: -1.2" abaixo
 *
 * Dados REAIS: brapi /api/v2/stocks/statistics?mode=history&period=quarterly
 * (wrapper em /api/asset/[symbol]/pe-history).
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";

import { cn } from "@/lib/utils";
import {
  CHART_COLORS,
  cartesianGridProps,
  cursorProps,
  tooltipWrapperStyle,
} from "@/lib/chart-theme";

export type PEHistoryRow = {
  endDate: string;
  trailingPE: number | null;
  priceEarnings: number | null;
};

type Props = {
  history: PEHistoryRow[];
  /** P/L atual (do bundle ou calculado price/eps). */
  currentPe: number | null;
  className?: string;
};

/**
 * Helper: ordena por endDate, remove nulls, mapeia pra {index, pe, endDate}.
 */
function normalize(history: PEHistoryRow[]): Array<{
  index: number;
  pe: number;
  endDate: string;
}> {
  return history
    .filter(
      (r): r is { endDate: string; trailingPE: number; priceEarnings: number | null } =>
        r.trailingPE != null && Number.isFinite(r.trailingPE) && r.trailingPE > 0
    )
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .map((r, i) => ({
      index: i,
      pe: r.trailingPE,
      endDate: r.endDate,
    }));
}

export function PEHistoryChart({
  history,
  currentPe,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => normalize(history), [history]);

  // Domínio Y: combina histórico + atual pra garantir que tudo cabe
  const yStats = useMemo(() => {
    if (data.length === 0) {
      return currentPe != null
        ? { min: currentPe * 0.7, max: currentPe * 1.3, mean: currentPe, std: 0 }
        : null;
    }
    const pes = data.map((d) => d.pe);
    const mean = pes.reduce((s, v) => s + v, 0) / pes.length;
    const variance =
      pes.length > 1
        ? pes.reduce((s, v) => s + (v - mean) ** 2, 0) / (pes.length - 1)
        : 0;
    const std = Math.sqrt(variance);
    const allValues = [...pes, ...(currentPe != null ? [currentPe] : [])];
    const min = Math.min(...allValues) * 0.85;
    const max = Math.max(...allValues) * 1.15;
    return { min, max, mean, std };
  }, [data, currentPe]);

  if (!yStats) return null;

  const zScore =
    currentPe != null && yStats.std > 0
      ? (currentPe - yStats.mean) / yStats.std
      : null;

  // Cor do valor atual baseada no z-score
  const currentColor =
    zScore == null
      ? "var(--foreground)"
      : zScore < -0.5
        ? "var(--positive)" // barato
        : zScore > 1
          ? "var(--negative)" // caro
          : "var(--foreground)"; // neutro

  // Área da banda ±1σ
  const bandData = data.map((d) => ({
    index: d.index,
    endDate: d.endDate,
    pe: d.pe,
    upper: yStats.mean + yStats.std,
    lower: Math.max(0, yStats.mean - yStats.std),
  }));

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-semibold text-foreground">
          Histórico de P/L
        </div>
        {zScore != null && (
          <div className="text-[11px] text-muted-foreground/70 tabular-nums">
            z = {zScore >= 0 ? "+" : ""}{zScore.toFixed(2)}σ
          </div>
        )}
      </div>

      <div className="h-[180px] w-full">
        {data.length === 0 && currentPe == null ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-muted-foreground/70">
              Sem histórico de P/L disponível.
            </p>
          </div>
        ) : (
          <ResponsiveContainer>
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 32, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="peBandFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.seriesPrimary} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={CHART_COLORS.seriesPrimary} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={CHART_COLORS.gridLine}
                strokeWidth={1}
                vertical={false}
              />
              <XAxis
                dataKey="index"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{
                  fill: CHART_COLORS.axisTick,
                  fontSize: 10,
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                }}
                tickFormatter={(idx: number) => {
                  const row = data[idx];
                  if (!row) return "";
                  const d = new Date(row.endDate + "T00:00:00Z");
                  if (Number.isNaN(d.getTime())) return "";
                  return d.toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "2-digit",
                  });
                }}
                axisLine={{ stroke: CHART_COLORS.axisLine, strokeWidth: 1 }}
                tickLine={false}
                height={24}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yStats.min, yStats.max]}
                tick={{
                  fill: CHART_COLORS.axisTick,
                  fontSize: 10,
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                }}
                tickFormatter={(v: number) => v.toFixed(1)}
                axisLine={false}
                tickLine={false}
                width={32}
              />

              <Tooltip
                cursor={{ ...cursorProps }}
                wrapperStyle={{ outline: "none" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0]?.payload as
                    | { index: number; pe: number; endDate: string }
                    | undefined;
                  if (!d) return null;
                  return (
                    <div style={tooltipWrapperStyle}>
                      <p
                        style={{
                          color: CHART_COLORS.tooltipMuted,
                          fontSize: 10,
                          marginBottom: 4,
                        }}
                      >
                        Q{(Math.floor(d.index / 4) + 1) % 4 || 4}{" "}
                        {d.endDate.slice(0, 4)}
                      </p>
                      <p
                        style={{
                          color: CHART_COLORS.tooltipText,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {d.pe.toFixed(2)}x
                      </p>
                    </div>
                  );
                }}
              />

              {/* Linha da média histórica */}
              <ReferenceLine
                y={yStats.mean}
                stroke={CHART_COLORS.gridLineStrong}
                strokeDasharray="4 4"
                strokeWidth={1}
                yAxisId={0}
              />

              {/* Banda ±1σ (atrás da linha) */}
              {data.length > 0 && (
                <Area
                  type="monotone"
                  dataKey="pe"
                  stroke="none"
                  fill="url(#peBandFill)"
                  isAnimationActive={false}
                  yAxisId={0}
                />
              )}

              {/* Linha do P/L histórico */}
              <Line
                type="monotone"
                dataKey="pe"
                stroke={CHART_COLORS.seriesPrimary}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.seriesPrimary }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                yAxisId={0}
              />

              {/* Marker do valor atual (no último X) */}
              {currentPe != null && data.length > 0 && (
                <ReferenceDot
                  x={data[data.length - 1].index}
                  y={currentPe}
                  r={5}
                  fill={currentColor}
                  stroke="#070709"
                  strokeWidth={1.5}
                  yAxisId={0}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer com stats */}
      {data.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <StatBlock
            label="Mínimo"
            value={formatPe(Math.min(...data.map((d) => d.pe)))}
            color="text-muted-foreground/70"
          />
          <StatBlock
            label="Média"
            value={formatPe(yStats.mean)}
            color="text-foreground/85"
            sublabel={`±${yStats.std.toFixed(1)}σ`}
          />
          <StatBlock
            label="Atual"
            value={currentPe != null ? formatPe(currentPe) : "—"}
            color={currentColor}
            sublabel={
              zScore != null
                ? zScore >= 0
                  ? `+${zScore.toFixed(2)}σ`
                  : `${zScore.toFixed(2)}σ`
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: string;
  color: string;
  sublabel?: string;
}): JSX.Element {
  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.04] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold mb-0.5">
        {label}
      </div>
      <div className={cn("text-[14px] font-semibold tabular-nums", color)}>
        {value}
      </div>
      {sublabel && (
        <div className="text-[10px] text-muted-foreground/60 tabular-nums mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  );
}

function formatPe(v: number): string {
  return `${v.toFixed(1)}x`;
}
