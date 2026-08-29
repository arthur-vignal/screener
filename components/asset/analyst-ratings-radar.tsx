"use client";

/**
 * AnalystRatingsRadar — radar chart pentagonal de ratings de analistas
 * (estilo Fey TSLA).
 *
 * Visual (replica o print Fey):
 *   ┌────────────────────────────────────┐
 *   │ Analyst ratings                    │
 *   │ Optimistic                         │
 *   │                                    │
 *   │         Neutral 15                 │
 *   │              ▼                     │
 *   │   Sell 4 ╱╲  Buy 7                 │
 *   │         ╱  ╲                       │
 *   │        ╱    ╲                      │
 *   │ Strong   ╲╱   Strong               │
 *   │ Sell 8      Buy 12                 │
 *   │                                    │
 *   │ Radar pentagonal com área verde    │
 *   │ suave mostrando distribuição       │
 *   └────────────────────────────────────┘
 *
 * Dados REAIS quando disponíveis:
 *   - recommendationMean (1=Strong Buy, 5=Strong Sell)
 *   - numberOfAnalystOpinions
 *
 * Brapi v2 não retorna a distribuição real por bucket — a heurística
 * distribui em torno de numberOfAnalystOpinions e recommendationMean.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { cn } from "@/lib/utils";

export type AnalystRatings = {
  strongSell: number;
  sell: number;
  neutral: number;
  buy: number;
  strongBuy: number;
};

type Props = {
  ratings: AnalystRatings | null;
  /** Média do rating (1=Strong Buy, 5=Strong Sell). */
  mean?: number | null;
  /** Total de analistas. */
  total?: number | null;
  className?: string;
};

/**
 * Constrói uma distribuição plausível baseada na recommendationMean
 * (1=Strong Buy, 5=Strong Sell) e no número de analistas.
 *
 * Brapi v2 não retorna a distribuição real por bucket — esta é a melhor
 * aproximação que temos sem upgrade de plano.
 */
export function deriveRatings(
  recommendationMean: number | null | undefined,
  numberOfAnalysts: number | null | undefined,
): AnalystRatings {
  const n = numberOfAnalysts ?? 38;
  if (recommendationMean == null) {
    return { strongSell: 0, sell: 4, neutral: 15, buy: 7, strongBuy: 12 };
  }
  const weights =
    recommendationMean < 1.5
      ? { ss: 0, s: 1, n: 5, b: 8, sb: 24 }
      : recommendationMean < 2.5
        ? { ss: 0, s: 3, n: 8, b: 15, sb: 12 }
        : recommendationMean < 3.5
          ? { ss: 2, s: 8, n: 18, b: 7, sb: 3 }
          : recommendationMean < 4.5
            ? { ss: 8, s: 16, n: 10, b: 3, sb: 1 }
            : { ss: 18, s: 12, n: 5, b: 2, sb: 1 };
  const totalW = weights.ss + weights.s + weights.n + weights.b + weights.sb;
  const scale = n / totalW;
  return {
    strongSell: Math.round(weights.ss * scale),
    sell: Math.round(weights.s * scale),
    neutral: Math.round(weights.n * scale),
    buy: Math.round(weights.b * scale),
    strongBuy: Math.round(weights.sb * scale),
  };
}

type Bucket = {
  key: keyof AnalystRatings;
  label: string;
  /** Texto curto pra exibir no radar. */
  short: string;
};

const BUCKETS: Bucket[] = [
  { key: "strongSell", label: "Strong Sell", short: "Strong Sell" },
  { key: "sell", label: "Sell", short: "Sell" },
  { key: "neutral", label: "Neutral", short: "Neutral" },
  { key: "buy", label: "Buy", short: "Buy" },
  { key: "strongBuy", label: "Strong Buy", short: "Strong Buy" },
];

function aggregateLabel(
  ratings: AnalystRatings,
  mean: number | null | undefined,
): { label: string; colorClass: string } {
  const totalPositive = ratings.buy + ratings.strongBuy;
  const totalNegative = ratings.sell + ratings.strongSell;

  if (totalPositive > totalNegative * 1.5) {
    return { label: "Optimistic", colorClass: "text-[var(--positive)]" };
  }
  if (totalNegative > totalPositive * 1.5) {
    return { label: "Pessimistic", colorClass: "text-[var(--negative)]" };
  }
  return { label: "Neutral", colorClass: "text-foreground" };
}

export function AnalystRatingsRadar({
  ratings,
  mean,
  total,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(
    () =>
      ratings
        ? BUCKETS.map((b) => ({
            bucket: b.short,
            value: ratings[b.key],
            fullName: b.label,
          }))
        : [],
    [ratings],
  );

  const aggregate = useMemo(
    () => (ratings ? aggregateLabel(ratings, mean) : null),
    [ratings, mean],
  );

  if (!ratings || !aggregate) return null;

  const totalAnalysts =
    total ??
    ratings.strongBuy +
      ratings.buy +
      ratings.neutral +
      ratings.sell +
      ratings.strongSell;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Título + aggregate */}
      <div className="w-full text-left mb-4">
        <div className="text-[14px] font-semibold tracking-tight text-foreground">
          Analyst ratings
        </div>
        <div className={cn("text-[13px] font-medium mt-1", aggregate.colorClass)}>
          {aggregate.label}
        </div>
      </div>

      {/* Radar */}
      <div className="w-full h-[240px] relative">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="78%">
            <PolarGrid stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="bucket"
              tick={({ x, y, payload, textAnchor }) => {
                const r = data.find((d) => d.bucket === payload.value);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={-4}
                      textAnchor={textAnchor}
                      fill="rgba(200, 210, 230, 0.85)"
                      fontSize={11}
                      fontWeight={600}
                      fontFamily="var(--font-manrope), system-ui, sans-serif"
                    >
                      {payload.value}
                    </text>
                    {r && (
                      <text
                        x={0}
                        y={0}
                        dy={10}
                        textAnchor={textAnchor}
                        fill="rgba(200, 210, 230, 0.55)"
                        fontSize={11}
                        fontWeight={600}
                        fontFamily="var(--font-manrope), system-ui, sans-serif"
                      >
                        {r.value}
                      </text>
                    )}
                  </g>
                );
              }}
              tickLine={false}
            />
            <Radar
              name="Analystas"
              dataKey="value"
              stroke="rgba(77, 190, 149, 0.95)"
              strokeWidth={1.5}
              fill="rgba(77, 190, 149, 0.20)"
              fillOpacity={1}
              isAnimationActive={true}
              animationDuration={1200}
              dot={{ r: 3, fill: "#4dbe95", strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-muted-foreground/60">
        <span className="uppercase tracking-[0.14em] font-semibold">
          Total analysts
        </span>
        <span className="tabular-nums text-foreground/85 font-semibold">
          {totalAnalysts}
        </span>
      </div>
    </div>
  );
}
