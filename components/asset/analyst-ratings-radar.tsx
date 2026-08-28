"use client";

/**
 * AnalystRatingsRadar — radar chart com ratings de analistas (estilo Fey TSLA).
 *
 * Dados REAIS quando disponíveis:
 *   - recommendationMean + recommendationKey + numberOfAnalystOpinions
 *     vêm de financialData na Brapi v2 (campos defaultKeyStatistics).
 *
 * Heurística de distribuição (até a Brapi expor a distribuição por rating):
 *   - recommendationMean < 2  → muito otimista (mais Strong Buy/Buy)
 *   - recommendationMean 2-3   → otimista
 *   - recommendationMean 3-3.5 → neutro
 *   - recommendationMean > 3.5 → pessimista
 *
 * Distribuição é então distribuída em torno de numberOfAnalystOpinions.
 */

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import type { JSX } from "react";
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
  className?: string;
};

/**
 * Constrói uma distribuição plausível baseada na recommendationMean
 * (1=Strong Buy, 5=Strong Sell) e no número de analistas.
 */
export function deriveRatings(
  recommendationMean: number | null | undefined,
  numberOfAnalysts: number | null | undefined
): AnalystRatings {
  const n = numberOfAnalysts ?? 38;
  if (recommendationMean == null) {
    return { strongSell: 0, sell: 4, neutral: 15, buy: 7, strongBuy: 12 };
  }
  // Pesos por bucket baseado em recommendationMean
  // mean=1 → todos strongBuy; mean=5 → todos strongSell
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

const CHART_COLORS = {
  axisTick: "rgba(200, 210, 230, 0.55)",
  tooltipText: "#eeeff1",
  seriesPositive: "#4dbe95",
};

export function AnalystRatingsRadar({
  ratings,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(
    () =>
      ratings
        ? [
            { label: "Strong Sell", value: ratings.strongSell },
            { label: "Sell", value: ratings.sell },
            { label: "Neutral", value: ratings.neutral },
            { label: "Buy", value: ratings.buy },
            { label: "Strong Buy", value: ratings.strongBuy },
          ]
        : [],
    [ratings]
  );

  if (!ratings) return null;

  const totalPositive = ratings.buy + ratings.strongBuy;
  const totalNegative = ratings.sell + ratings.strongSell;
  const aggregate =
    totalPositive > totalNegative * 1.5
      ? "Optimistic"
      : totalNegative > totalPositive * 1.5
        ? "Pessimistic"
        : "Neutral";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mb-3">
        Analyst consensus
      </div>

      <div
        className="text-[14px] font-medium"
        style={{ color: aggregateColor(aggregate) }}
      >
        {aggregate}
      </div>

      <div className="w-full h-[260px] mt-4">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="78%">
            <PolarGrid stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="label"
              tick={{
                fill: CHART_COLORS.axisTick,
                fontSize: 10,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickLine={false}
            />
            <Radar
              name="Analystas"
              dataKey="value"
              stroke={CHART_COLORS.seriesPositive}
              strokeWidth={1.5}
              fill={CHART_COLORS.seriesPositive}
              fillOpacity={0.18}
              isAnimationActive={true}
              animationDuration={1200}
              dot={{ r: 2.5, fillOpacity: 1, strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function aggregateColor(label: string): string {
  switch (label) {
    case "Optimistic":
      return "var(--positive)";
    case "Pessimistic":
      return "var(--negative)";
    default:
      return "var(--foreground)";
  }
}
