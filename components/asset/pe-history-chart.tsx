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

/**
 * Estatísticas do subsetor (mediana + quartis do P/E dos peers).
 * Calculado client-side a partir de peerRows em /api/peer-benchmarks.
 */
export type PESectorStats = {
  /** Mediana do P/E dos peers (excluindo o próprio ticker). */
  median: number | null;
  /** 1º quartil (25%) dos peers. */
  p25: number | null;
  /** 3º quartil (75%) dos peers. */
  p75: number | null;
  /** Quantos peers entraram no cálculo (com pe != null). */
  count: number;
};

type Props = {
  history: PEHistoryRow[];
  /** P/L atual (do bundle ou calculado price/eps). */
  currentPe: number | null;
  /** Estatísticas do subsetor (mediana + quartis dos peers). */
  sectorStats?: PESectorStats | null;
  /** Quantos anos exibir (default 4). Limpa outliers de períodos
   *  anormais (Lava Jato, COVID) que quebram a escala. */
  windowYears?: number;
  className?: string;
};

/**
 * Helper: ordena por endDate, remove nulls/inválidos, limita janela
 * temporal (default 4 anos). Também remove outliers absurdos
 * (P/L > 100 ou negativo) que indicam trimestres com EPS ~0
 * (Lava Jato, COVID) e quebrariam a escala do gráfico.
 */
function normalize(
  history: PEHistoryRow[],
  windowYears = 4,
): Array<{
  index: number;
  pe: number;
  endDate: string;
}> {
  // cutoff: últimos N anos a partir do entry mais recente
  const dates = history
    .map((r) => r.endDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  const latest = dates[dates.length - 1];
  const cutoff = latest
    ? latest.slice(0, 4) // ano do mais recente
    : String(new Date().getFullYear());
  const cutoffYear = parseInt(cutoff, 10) - (windowYears - 1);

  return history
    .filter(
      (r): r is { endDate: string; trailingPE: number; priceEarnings: number | null } =>
        r.trailingPE != null &&
        Number.isFinite(r.trailingPE) &&
        r.trailingPE > 0 &&
        r.trailingPE < 100 && // remove outliers > 100 (geralmente EPS ~0)
        r.endDate != null &&
        parseInt(r.endDate.slice(0, 4), 10) >= cutoffYear,
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
  sectorStats,
  windowYears = 4,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(
    () => normalize(history, windowYears),
    [history, windowYears],
  );

  // Domínio Y: combina histórico + atual + banda do subsetor
  // pra garantir que tudo cabe.
  const yStats = useMemo(() => {
    if (data.length === 0 && currentPe == null) return null;

    const pes = data.map((d) => d.pe);
    const sectorBand = sectorStats
      ? [sectorStats.p25, sectorStats.p75, sectorStats.median].filter(
          (v): v is number => v != null && Number.isFinite(v),
        )
      : [];

    const allValues = [
      ...pes,
      ...(currentPe != null ? [currentPe] : []),
      ...sectorBand,
    ];

    if (allValues.length === 0) return null;
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    // padding de 10% em cima/embaixo
    const pad = Math.max((max - min) * 0.1, 0.5);
    return {
      min: Math.max(0, min - pad),
      max: max + pad,
    };
  }, [data, currentPe, sectorStats]);

  if (!yStats) return null;

  // Cor do valor atual baseada na posição vs mediana do subsetor.
  // Verde: abaixo do P25 (barato). Vermelho: acima do P75 (caro).
  const vsMedian =
    currentPe != null && sectorStats?.median != null
      ? currentPe - sectorStats.median
      : null;
  const currentColor =
    vsMedian == null || sectorStats == null || currentPe == null
      ? "var(--foreground)"
      : currentPe < (sectorStats.p25 ?? Infinity)
        ? "var(--positive)" // barato (< P25 do subsetor)
        : currentPe > (sectorStats.p75 ?? -Infinity)
          ? "var(--negative)" // caro (> P75)
          : "var(--foreground)"; // dentro da banda

  // Linha de mediana do subsetor + banda P25-P75.
  // Plotado como ReferenceLines horizontais (mais simples que área cheia).
  const hasSectorStats = sectorStats?.median != null;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-semibold text-foreground">
          Histórico de P/L
        </div>
        {hasSectorStats && sectorStats && (
          <div className="text-[10px] text-muted-foreground/70 tabular-nums">
            Setor ({sectorStats.count}): {sectorStats.p25?.toFixed(1)}–{sectorStats.p75?.toFixed(1)}x
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

              {/* Banda do subsetor: P25 e P75 como linhas tracejadas.
                  Mais útil que ±1σ porque contextualiza o ticker vs pares. */}
              {sectorStats?.p25 != null && (
                <ReferenceLine
                  y={sectorStats.p25}
                  stroke={CHART_COLORS.gridLine}
                  strokeDasharray="2 4"
                  strokeWidth={1}
                  yAxisId={0}
                  label={{
                    value: "P25",
                    fill: CHART_COLORS.tooltipMuted,
                    fontSize: 9,
                    position: "left",
                  }}
                />
              )}
              {sectorStats?.p75 != null && (
                <ReferenceLine
                  y={sectorStats.p75}
                  stroke={CHART_COLORS.gridLine}
                  strokeDasharray="2 4"
                  strokeWidth={1}
                  yAxisId={0}
                  label={{
                    value: "P75",
                    fill: CHART_COLORS.tooltipMuted,
                    fontSize: 9,
                    position: "left",
                  }}
                />
              )}
              {/* Mediana do subsetor — mais visível (strokeWidth 1.5 + cor
                  accent azul #489ffa pra contrastar com a linha branca). */}
              {sectorStats?.median != null && (
                <ReferenceLine
                  y={sectorStats.median}
                  stroke="#489ffa"
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  yAxisId={0}
                  label={{
                    value: `mediana ${sectorStats.median.toFixed(1)}x`,
                    fill: "#489ffa",
                    fontSize: 10,
                    fontWeight: 600,
                    position: "left",
                  }}
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
            label="Mediana setor"
            value={
              sectorStats?.median != null
                ? formatPe(sectorStats.median)
                : "—"
            }
            color="text-foreground/85"
            sublabel={
              sectorStats?.p25 != null && sectorStats?.p75 != null
                ? `P25–P75: ${sectorStats.p25.toFixed(1)}–${sectorStats.p75.toFixed(1)}`
                : undefined
            }
          />
          <StatBlock
            label="Atual"
            value={currentPe != null ? formatPe(currentPe) : "—"}
            color={currentColor}
            sublabel={
              vsMedian != null && sectorStats?.median != null
                ? `${vsMedian >= 0 ? "+" : ""}${vsMedian.toFixed(1)} vs mediana`
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
