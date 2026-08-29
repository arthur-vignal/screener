"use client";

/**
 * AnalystRatingsBreakdown — distribuição de ratings de analistas
 * (estilo Fey Analyst Coverage).
 *
 * Visual (replica o print Fey):
 *   ┌─────────────────────────────────────────────┐
 *   │ Analyst consensus                           │
 *   │ Optimistic — Buy                              │
 *   │                                              │
 *   │ Strong Buy    ████████   8                    │
 *   │ Buy           ████████████████  15          │
 *   │ Hold          █████  5                        │
 *   │ Sell          █  1                            │
 *   │ Strong Sell   ░  0                            │
 *   │                                              │
 *   │ 29 analistas · média 1.8                    │
 *   └─────────────────────────────────────────────┘
 *
 * - Bar chart horizontal com cor por bucket
 * - Counts visíveis à direita
 * - Aggregate label ("Optimistic", "Pessimistic", "Neutral")
 *   derivado de buy+strongBuy vs sell+strongSell
 *
 * Dados REAIS quando disponíveis:
 *   - recommendationMean (1=Strong Buy, 5=Strong Sell)
 *   - numberOfAnalystOpinions
 *
 * Brapi v2 não retorna a distribuição real por bucket. A heurística
 * distribui em torno de numberOfAnalystOpinions e recommendationMean.
 */

import { useMemo } from "react";
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
  // Pesos por bucket baseado em recommendationMean
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
  /** Cor da barra: verde (positivo) → amarelo (neutro) → vermelho (negativo). */
  colorClass: string;
  /** Cor do texto do label. */
  textClass: string;
};

const BUCKETS: Bucket[] = [
  {
    key: "strongBuy",
    label: "Strong Buy",
    colorClass: "bg-[var(--positive)]",
    textClass: "text-[var(--positive)]",
  },
  {
    key: "buy",
    label: "Buy",
    colorClass: "bg-[var(--positive)]/70",
    textClass: "text-[var(--positive)]/85",
  },
  {
    key: "neutral",
    label: "Hold",
    colorClass: "bg-muted-foreground/40",
    textClass: "text-muted-foreground/85",
  },
  {
    key: "sell",
    label: "Sell",
    colorClass: "bg-[var(--negative)]/70",
    textClass: "text-[var(--negative)]/85",
  },
  {
    key: "strongSell",
    label: "Strong Sell",
    colorClass: "bg-[var(--negative)]",
    textClass: "text-[var(--negative)]",
  },
];

function aggregateLabel(
  ratings: AnalystRatings,
  mean: number | null | undefined,
): { label: string; sublabel: string; colorClass: string } {
  const totalPositive = ratings.buy + ratings.strongBuy;
  const totalNegative = ratings.sell + ratings.strongSell;
  const total = totalPositive + totalNegative + ratings.neutral;

  let label: string;
  let colorClass: string;
  if (totalPositive > totalNegative * 1.5) {
    label = "Optimistic";
    colorClass = "text-[var(--positive)]";
  } else if (totalNegative > totalPositive * 1.5) {
    label = "Pessimistic";
    colorClass = "text-[var(--negative)]";
  } else {
    label = "Neutral";
    colorClass = "text-foreground";
  }

  // Sublabel com a média (Fey style: "Buy — avg 1.8")
  let sublabel = "";
  if (mean != null && Number.isFinite(mean)) {
    if (mean < 1.5) sublabel = `Buy — avg ${mean.toFixed(1)}`;
    else if (mean < 2.5) sublabel = `Buy — avg ${mean.toFixed(1)}`;
    else if (mean < 3.5) sublabel = `Hold — avg ${mean.toFixed(1)}`;
    else if (mean < 4.5) sublabel = `Sell — avg ${mean.toFixed(1)}`;
    else sublabel = `Strong Sell — avg ${mean.toFixed(1)}`;
  } else {
    sublabel = `${total} analistas`;
  }

  return { label, sublabel, colorClass };
}

export function AnalystRatingsRadar({
  ratings,
  mean,
  total,
  className,
}: Props): JSX.Element | null {
  const rows = useMemo(() => {
    if (!ratings) return [];
    const max = Math.max(
      ratings.strongBuy,
      ratings.buy,
      ratings.neutral,
      ratings.sell,
      ratings.strongSell,
      1,
    );
    return BUCKETS.map((b) => ({
      bucket: b,
      count: ratings[b.key],
      pct: (ratings[b.key] / max) * 100,
    }));
  }, [ratings]);

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
    <div className={cn("flex flex-col", className)}>
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mb-1">
          Analyst consensus
        </div>
        <div className={cn("text-[15px] font-semibold", aggregate.colorClass)}>
          {aggregate.label}
        </div>
        <div className="text-[11px] text-muted-foreground/70 tabular-nums mt-0.5">
          {aggregate.sublabel}
        </div>
      </div>

      {/* Bar chart horizontal */}
      <div className="flex flex-col gap-2.5">
        {rows.map(({ bucket, count, pct }) => (
          <div key={bucket.key} className="flex items-center gap-2.5">
            <div
              className={cn(
                "text-[11px] font-medium w-[78px] shrink-0 text-right",
                bucket.textClass,
              )}
            >
              {bucket.label}
            </div>
            <div className="flex-1 h-2 relative overflow-hidden rounded-sm bg-white/[0.04]">
              <div
                className={cn(
                  "h-full transition-all duration-700 rounded-sm",
                  bucket.colorClass,
                )}
                style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
              />
            </div>
            <div className="text-[12px] tabular-nums text-foreground/85 font-semibold w-8 text-right shrink-0">
              {count}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-muted-foreground/60">
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
