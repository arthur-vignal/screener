"use client";

/**
 * MiniFanChart — versão COMPACTA do fan chart pra usar DENTRO do
 * PriceForecastSummary (raiz do ticker).
 *
 * Diferenças do PriceForecastChart completo (/analysis seção 5):
 *   - Sem paths MC / density plot (não cabe em 140px)
 *   - Sem Tooltip interativo
 *   - Sem eixo X visível
 *   - 3 linhas pontilhadas divergentes (high/base/low) saindo do preço
 *     atual, cada uma com um dot amarelo no final mostrando o valor 6m
 *   - Labels de banda no eixo Y em overlay HTML (High / Median / Current
 *     price / Low), cada um alinhado à sua linha
 *   - Altura fixa ~140px
 *
 * Visual: minimalista dark (#0d0d11), mesmo padrão do chart completo.
 *
 * Dados:
 *   - historicalPrices: [{ date: "YYYY-MM-DD", close: number }] — 90d
 *   - currentPrice, high6m, base6m, low6m — anchor e cenários 6m
 *
 * Cor condicional pelo direction (up = verde, down = vermelho) na linha
 * median e nos dots finais. High/low sempre neutro (cinza/azul).
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
  historicalPrices: HistoryPoint[];
  currentPrice: number;
  high6m: number;
  base6m: number;
  low6m: number;
  /** "up" pinta a median de verde e os dots; "down" pinta de vermelho. */
  direction: "up" | "down";
};

type ChartRow = {
  ts: number;
  historical?: number;
  high?: number;
  base?: number;
  low?: number;
};

function ymdToTs(ymd: string): number {
  return new Date(ymd + "T00:00:00Z").getTime();
}

const DAY_MS = 1000 * 60 * 60 * 24;
const SIX_MONTHS_MS = DAY_MS * 30 * 6;

export function MiniFanChart({
  historicalPrices,
  currentPrice,
  high6m,
  base6m,
  low6m,
  direction,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    if (historicalPrices.length < 2) return null;
    const filtered = historicalPrices
      .filter((p) => p.close > 0 && Number.isFinite(p.close));
    if (filtered.length < 2) return null;

    const lastDate = filtered[filtered.length - 1].date;
    const asOfTs = ymdToTs(lastDate);
    const futureTs = asOfTs + SIX_MONTHS_MS;

    // Linhas históricas.
    const histRows: ChartRow[] = filtered.map((p) => ({
      ts: ymdToTs(p.date),
      historical: p.close,
    }));

    // Bridge no preço atual (garante continuidade visual entre hist e
    // forecast). Se a última entrada histórica já é as_of com mesmo
    // valor, mantemos; senão substituímos o close pelo currentPrice pra
    // evitar gap visual entre histórico e anchor.
    const last = histRows[histRows.length - 1];
    if (last && last.ts === asOfTs) {
      last.historical = currentPrice;
    } else {
      histRows.push({ ts: asOfTs, historical: currentPrice });
    }

    // Anchor + ponto futuro dos cenários.
    const anchor: ChartRow = {
      ts: asOfTs,
      historical: currentPrice,
      high: currentPrice,
      base: currentPrice,
      low: currentPrice,
    };
    const future: ChartRow = {
      ts: futureTs,
      high: high6m,
      base: base6m,
      low: low6m,
    };

    const rows = [...histRows, anchor, future];

    // Y domain com padding de 8% em cima e embaixo.
    const allValues = [
      ...filtered.map((p) => p.close),
      currentPrice,
      high6m,
      base6m,
      low6m,
    ];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const pad = (maxVal - minVal) * 0.08 || maxVal * 0.05 || 1;
    const yDomain: [number, number] = [minVal - pad, maxVal + pad];

    return { rows, asOfTs, futureTs, yDomain };
  }, [historicalPrices, currentPrice, high6m, base6m, low6m]);

  // Cor condicional pelo direction.
  const accentColor = direction === "up" ? PACK.positive : PACK.negative;

  if (!data) return null;

  // Posições Y em % (pra overlay HTML dos labels).
  const { rows, asOfTs, futureTs, yDomain } = data;
  const [yMin, yMax] = yDomain;
  const yToPct = (v: number): string => {
    const pct = ((yMax - v) / (yMax - yMin)) * 100;
    // Clamp pra não escapar do chart quando muito próximo das bordas.
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

          {/* Linha histórica (branca sólida fina) */}
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

          {/* 3 linhas pontilhadas (high/base/low) saindo do preço atual */}
          <Line
            type="linear"
            dataKey="high"
            stroke="rgba(255,200,87,0.65)"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="linear"
            dataKey="base"
            stroke={accentColor}
            strokeOpacity={0.8}
            strokeWidth={1.25}
            strokeDasharray="3 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="linear"
            dataKey="low"
            stroke="rgba(242,140,140,0.65)"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Linha vertical tracejada no preço atual */}
          <ReferenceLine
            x={asOfTs}
            stroke={PACK.tick}
            strokeOpacity={0.35}
            strokeDasharray="2 4"
            strokeWidth={1}
          />

          {/* Dots no final de cada linha (valor 6m) */}
          <ReferenceDot
            x={futureTs}
            y={high6m}
            r={2.5}
            fill="rgba(255,200,87,1)"
            stroke="rgba(255,200,87,0.4)"
            strokeWidth={2}
          />
          <ReferenceDot
            x={futureTs}
            y={base6m}
            r={2.5}
            fill={accentColor}
            stroke={accentColor}
            strokeOpacity={0.4}
            strokeWidth={2}
          />
          <ReferenceDot
            x={futureTs}
            y={low6m}
            r={2.5}
            fill="rgba(242,140,140,1)"
            stroke="rgba(242,140,140,0.4)"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Labels de banda no eixo Y (HTML overlay).
          Absolute right side, alinhados verticalmente à sua linha. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] text-amber-200/70 font-semibold tabular-nums"
          style={{ top: yToPct(high6m) }}
        >
          High
        </div>
        <div
          className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] font-semibold tabular-nums"
          style={{
            top: yToPct(base6m),
            color: accentColor,
            opacity: 0.9,
          }}
        >
          Median
        </div>
        <div
          className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] text-foreground/85 font-semibold tabular-nums"
          style={{ top: yToPct(currentPrice) }}
        >
          Current
        </div>
        <div
          className="absolute right-0 -translate-y-1/2 text-[9px] uppercase tracking-[0.14em] text-rose-300/70 font-semibold tabular-nums"
          style={{ top: yToPct(low6m) }}
        >
          Low
        </div>
      </div>
    </div>
  );
}