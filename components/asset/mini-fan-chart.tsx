"use client";

/**
 * MiniFanChart — versão COMPACTA do fan chart pra usar DENTRO do
 * PriceForecastSummary (raiz do ticker).
 *
 * Estrutura IGUAL conceitualmente ao PriceForecastChart completo
 * (/analysis seção 5), mas mostrando apenas 3 caminhos mais prováveis
 * em vez de 50 paths MC:
 *   - P10 (cenário pessimista)  — vermelho PACK.negative
 *   - P50 (mediana)             — branco PACK.foreground (mais grosso)
 *   - P90 (otimista)            — verde PACK.positive
 *
 * Diferenças do PriceForecastChart completo:
 *   - Sem density plot / 50 paths
 *   - Sem Tooltip interativo
 *   - Sem eixo X visível
 *   - Altura fixa ~140px
 *
 * Ancoragem no preço ATUAL (currentPrice, asOfTs) — divergem pra
 * DIREITA até +6m. Nunca voltam pra esquerda.
 *
 * Cor: SEM CINZA, SEM PRETO. Apenas cores do pack (positive/negative/
 * foreground). Y domain com padding 8%.
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
  XAxis,
  YAxis,
} from "recharts";

import { PACK } from "@/lib/chart-pack";

type HistoryPoint = { date: string; close: number };

type Props = {
  /** Últimos 90 pregões do ticker. */
  historicalPrices: HistoryPoint[];
  /** Preço atual (anchor de onde os 3 paths divergem). */
  currentPrice: number;
  /**
   * Trajetórias MC: array de paths × 7 timesteps (S0..S6).
   * trajectories[i] = [S0, S1, ..., S6].
   * Se ausente (endpoint sem MC), cai em fallback determinístico.
   */
  trajectories: number[][];
  /** Timestamp (ms) do momento atual — anchor dos paths futuros. */
  asOfTs: number;
};

type ChartRow = {
  ts: number;
  historical?: number;
  /** Caminho P10 (Pessimista) — vermelho. */
  p10?: number;
  /** Caminho P50 (Mediana) — branco, mais grosso. */
  p50?: number;
  /** Caminho P90 (Otimista) — verde. */
  p90?: number;
};

function ymdToTs(ymd: string): number {
  return new Date(ymd + "T00:00:00Z").getTime();
}

const DAY_MS = 1000 * 60 * 60 * 24;
const SIX_MONTHS_MS = DAY_MS * 30 * 6;
const MONTH_MS = DAY_MS * 30;

/**
 * Calcula a trajetória de um percentil: em cada timestep t, pega o
 * valor do path na posição `percentil/100` (entre 0 e 1) dos paths
 * ordenados. Resultado: vetor [v_t0, v_t1, ..., v_tN].
 *
 * Ex: percentile=10 → 10% dos paths têm valor MENOR que o retornado
 *     em cada timestep (cenário pessimista).
 *     percentile=90 → 90% dos paths têm valor MENOR (otimista).
 */
function getPercentileTrajectory(
  trajectories: number[][],
  percentile: number,
): number[] {
  if (trajectories.length === 0) return [];
  const nTimesteps = trajectories[0]?.length ?? 0;
  if (nTimesteps === 0) return [];
  const result: number[] = [];
  const idx = Math.min(
    trajectories.length - 1,
    Math.max(0, Math.floor((percentile / 100) * (trajectories.length - 1))),
  );
  for (let t = 0; t < nTimesteps; t++) {
    const valuesAtT = trajectories
      .map((path) => path[t])
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    if (valuesAtT.length === 0) {
      result.push(NaN);
      continue;
    }
    const i = Math.min(
      valuesAtT.length - 1,
      Math.max(0, Math.floor((percentile / 100) * (valuesAtT.length - 1))),
    );
    result.push(valuesAtT[i]);
  }
  return result;
}

export function MiniFanChart({
  historicalPrices,
  currentPrice,
  trajectories,
  asOfTs,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    if (historicalPrices.length < 2) return null;
    const filtered = historicalPrices.filter(
      (p) => p.close > 0 && Number.isFinite(p.close),
    );
    if (filtered.length < 2) return null;

    const futureTs = asOfTs + SIX_MONTHS_MS;

    // Pega P10/P50/P90 trajectories do MC (3 vetores de 7 pontos cada).
    const hasMC = trajectories.length > 0;
    const p10Path = hasMC ? getPercentileTrajectory(trajectories, 10) : [];
    const p50Path = hasMC ? getPercentileTrajectory(trajectories, 50) : [];
    const p90Path = hasMC ? getPercentileTrajectory(trajectories, 90) : [];

    // Linhas históricas.
    const histRows: ChartRow[] = filtered.map((p) => ({
      ts: ymdToTs(p.date),
      historical: p.close,
    }));

    // Bridge no preço atual — garante continuidade entre histórico e
    // forecast. Substitui o último close pelo currentPrice pra evitar
    // gap visual.
    const last = histRows[histRows.length - 1];
    if (last && last.ts === asOfTs) {
      last.historical = currentPrice;
    } else {
      histRows.push({ ts: asOfTs, historical: currentPrice });
    }

    // Anchor row — conecta o histórico aos 3 paths futuros (todos
    // começam em asOfTs no currentPrice).
    const anchor: ChartRow = {
      ts: asOfTs,
      historical: currentPrice,
      p10: currentPrice,
      p50: currentPrice,
      p90: currentPrice,
    };

    // Linhas futuras: 6 timesteps após asOfTs (1 por mês).
    // Trajetória MC tem 7 pontos [S0..S6], onde S0 = asOfTs.
    // S0 vai pra anchor; S1..S6 mapeiam pra t=1..6 meses.
    const futureRows: ChartRow[] = [];
    const nFutureSteps = hasMC ? Math.max(0, p50Path.length - 1) : 0;
    for (let i = 0; i < nFutureSteps; i++) {
      futureRows.push({
        ts: asOfTs + (i + 1) * MONTH_MS,
        p10: p10Path[i + 1],
        p50: p50Path[i + 1],
        p90: p90Path[i + 1],
      });
    }

    const rows: ChartRow[] = [...histRows, anchor, ...futureRows];

    // Y domain com padding de 8% em cima e embaixo.
    const allValues: number[] = [
      ...filtered.map((p) => p.close),
      currentPrice,
    ];
    if (hasMC) {
      allValues.push(p10Path[p10Path.length - 1]);
      allValues.push(p50Path[p50Path.length - 1]);
      allValues.push(p90Path[p90Path.length - 1]);
    }
    const validValues = allValues.filter((v) => Number.isFinite(v));
    if (validValues.length === 0) return null;
    const minVal = Math.min(...validValues);
    const maxVal = Math.max(...validValues);
    const pad = (maxVal - minVal) * 0.08 || maxVal * 0.05 || 1;
    const yDomain: [number, number] = [minVal - pad, maxVal + pad];

    return {
      rows,
      asOfTs,
      futureTs,
      yDomain,
      hasMC,
      p10Final: hasMC ? p10Path[p10Path.length - 1] : currentPrice,
      p50Final: hasMC ? p50Path[p50Path.length - 1] : currentPrice,
      p90Final: hasMC ? p90Path[p90Path.length - 1] : currentPrice,
    };
  }, [historicalPrices, currentPrice, trajectories, asOfTs]);

  if (!data) return null;

  const { rows, asOfTs: anchorTs, futureTs, yDomain, hasMC, p10Final, p50Final, p90Final } = data;
  const [yMin, yMax] = yDomain;
  const yToPct = (v: number): string => {
    if (!Number.isFinite(v)) return "50%";
    const pct = ((yMax - v) / (yMax - yMin)) * 100;
    return `${Math.max(4, Math.min(96, pct))}%`;
  };

  return (
    <div className="relative h-[140px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 28, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            stroke={PACK.tick}
            strokeOpacity={0.12}
            strokeDasharray="2 4"
            vertical={false}
          />
          <YAxis hide domain={yDomain} />
          <XAxis
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            dataKey="ts"
            hide
            axisLine={false}
            tickLine={false}
          />

          {/* Linha histórica (branca sólida fina). */}
          <Line
            type="monotone"
            dataKey="historical"
            stroke={PACK.foreground}
            strokeWidth={1.5}
            strokeOpacity={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Path P10 — vermelho (PACK.negative), divergindo do anchor pra direita. */}
          {hasMC && (
            <Line
              type="monotone"
              dataKey="p10"
              stroke={PACK.negative}
              strokeWidth={1}
              strokeOpacity={0.85}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Path P50 — branco (PACK.foreground), MAIS GROSSO (caminho base). */}
          {hasMC && (
            <Line
              type="monotone"
              dataKey="p50"
              stroke={PACK.foreground}
              strokeWidth={1.75}
              strokeOpacity={0.95}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Path P90 — verde (PACK.positive), divergindo do anchor pra direita. */}
          {hasMC && (
            <Line
              type="monotone"
              dataKey="p90"
              stroke={PACK.positive}
              strokeWidth={1}
              strokeOpacity={0.85}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Linha vertical tracejada no preço atual. */}
          <ReferenceLine
            x={anchorTs}
            stroke={PACK.tick}
            strokeOpacity={0.35}
            strokeDasharray="2 4"
            strokeWidth={1}
          />

          {/* Dots no final de cada path (valor 6m). */}
          {hasMC && Number.isFinite(p10Final) && (
            <ReferenceDot
              x={futureTs}
              y={p10Final}
              r={2.5}
              fill={PACK.negative}
              stroke={PACK.negative}
              strokeOpacity={0.4}
              strokeWidth={2}
            />
          )}
          {hasMC && Number.isFinite(p50Final) && (
            <ReferenceDot
              x={futureTs}
              y={p50Final}
              r={3}
              fill={PACK.foreground}
              stroke={PACK.foreground}
              strokeOpacity={0.5}
              strokeWidth={2}
            />
          )}
          {hasMC && Number.isFinite(p90Final) && (
            <ReferenceDot
              x={futureTs}
              y={p90Final}
              r={2.5}
              fill={PACK.positive}
              stroke={PACK.positive}
              strokeOpacity={0.4}
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Labels de banda no eixo Y (HTML overlay). */}
      <div className="absolute inset-0 pointer-events-none">
        {hasMC && Number.isFinite(p90Final) && (
          <div
            className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] font-semibold tabular-nums"
            style={{ top: yToPct(p90Final), color: PACK.positive, opacity: 0.9 }}
          >
            High
          </div>
        )}
        {hasMC && Number.isFinite(p50Final) && (
          <div
            className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] font-semibold tabular-nums"
            style={{ top: yToPct(p50Final), color: PACK.foreground, opacity: 0.95 }}
          >
            Median
          </div>
        )}
        <div
          className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] text-foreground/85 font-semibold tabular-nums"
          style={{ top: yToPct(currentPrice) }}
        >
          Current
        </div>
        {hasMC && Number.isFinite(p10Final) && (
          <div
            className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] font-semibold tabular-nums"
            style={{ top: yToPct(p10Final), color: PACK.negative, opacity: 0.9 }}
          >
            Low
          </div>
        )}
      </div>
    </div>
  );
}