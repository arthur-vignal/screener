"use client";

import useSWR from "swr";
import { Gauge, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type FgComponent = {
  name: string;
  label: string;
  weight: number;
  value: number;
  raw: { current: number; comparison: number; description: string };
};

type FgResult = {
  score: number;
  regime: "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
  label: string;
  components: FgComponent[];
  computedAt: number;
};

const REGIME_COLORS: Record<FgResult["regime"], string> = {
  "extreme-fear": "text-negative",
  fear: "text-warning",
  neutral: "text-muted",
  greed: "text-positive",
  "extreme-greed": "text-positive",
};

const REGIME_BG: Record<FgResult["regime"], string> = {
  "extreme-fear": "var(--negative)",
  fear: "var(--warning)",
  neutral: "var(--muted)",
  greed: "var(--positive)",
  "extreme-greed": "var(--positive)",
};

/**
 * FearGreedGaugeBR — BR-equivalent of the US Fear & Greed index.
 *
 * Reads /api/fear-greed/br which computes a 0-100 score from:
 *   - IBOV momentum (Brapi 1D change%)
 *   - B3 breadth (% of B3 stocks in green)
 *   - Selic real rate
 *   - IVOL-BR placeholder
 */
export function FearGreedGaugeBR() {
  const { data, error } = useSWR<FgResult>("/api/fear-greed/br", fetcher, {
    refreshInterval: 5 * 60 * 1000,
  });

  if (error) {
    return (
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="label-s label-muted-2">Mercado BR · 1D</h3>
        </div>
        <p className="text-[12.5px] text-muted leading-snug">
          Erro ao carregar Fear & Greed BR.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="label-s label-muted-2">Mercado BR · 1D</h3>
        </div>
        <p className="text-[12.5px] text-muted leading-snug">Carregando…</p>
      </div>
    );
  }

  const score = data.score;
  const regime = data.regime;
  const color = REGIME_BG[regime];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="label-s label-muted-2">Mercado BR · 1D</h3>
        <span className="num text-[10px] text-faint">Fear & Greed BR</span>
      </div>

      <div className="flex items-center gap-3">
        {/* SVG Gauge */}
        <svg viewBox="0 0 100 60" className="w-28 h-16 shrink-0">
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="var(--hairline)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 119.4} 119.4`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>

        <div className="flex-1">
          <div className="num num-lg text-ink leading-none">{score}</div>
          <div
            className={cn(
              "text-[11px] font-medium uppercase tracking-wider mt-1",
              REGIME_COLORS[regime],
            )}
          >
            {data.label}
          </div>
        </div>
      </div>

      {/* Components breakdown */}
      <div className="mt-3 space-y-1.5">
        {data.components.map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-[10.5px]">
            <span className="text-muted flex-1 truncate">{c.label}</span>
            <span className="num text-ink w-8 text-right">{c.value}</span>
            <div className="w-16 h-px bg-hairline-strong relative overflow-hidden">
              <div
                className={cn(
                  "absolute top-0 left-0 h-px",
                  c.value >= 50 ? "bg-positive" : "bg-negative",
                )}
                style={{ width: `${c.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-hairline text-[10px] text-faint">
        Atualizado{" "}
        {new Date(data.computedAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}
