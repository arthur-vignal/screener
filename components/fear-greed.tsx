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
 * FearGreedGauge — radial-style indicator showing the 0-100 F&G score.
 * Used in dashboard + can be embedded in Mercado page.
 */
export function FearGreedGauge() {
  const { data, error } = useSWR<FgResult>("/api/fear-greed", fetcher, {
    refreshInterval: 5 * 60 * 1000, // 5 min
  });

  if (error || !data) {
    return null;
  }

  const score = data.score;
  const regime = data.regime;
  const color = REGIME_BG[regime];

  // Gauge: 270deg arc (-135 to +135)
  const angle = -135 + (score / 100) * 270;
  const needleX = 50 + 38 * Math.cos(((angle - 90) * Math.PI) / 180);
  const needleY = 50 + 38 * Math.sin(((angle - 90) * Math.PI) / 180);

  return (
    <div className="panel p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="w-4 h-4 text-brand-deep" />
        <h3 className="text-sm font-medium text-ink uppercase tracking-wider">
          Fear & Greed Index
        </h3>
      </div>

      <div className="flex items-center gap-3">
        {/* SVG Gauge */}
        <svg viewBox="0 0 100 60" className="w-32 h-20 shrink-0">
          {/* Background arc */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="var(--hairline)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Colored arc up to score */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 119.4} 119.4`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const ta = -135 + (tick / 100) * 270;
            const x1 = 50 + 38 * Math.cos(((ta - 90) * Math.PI) / 180);
            const y1 = 50 + 38 * Math.sin(((ta - 90) * Math.PI) / 180);
            const x2 = 50 + 32 * Math.cos(((ta - 90) * Math.PI) / 180);
            const y2 = 50 + 32 * Math.sin(((ta - 90) * Math.PI) / 180);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--muted)"
                strokeWidth="0.5"
              />
            );
          })}
          {/* Needle */}
          <line
            x1="50"
            y1="50"
            x2={needleX}
            y2={needleY}
            stroke="var(--ink)"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ transition: "all 0.6s ease" }}
          />
          <circle cx="50" cy="50" r="2" fill="var(--ink)" />
        </svg>

        {/* Score */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-tabular text-4xl font-semibold",
                REGIME_COLORS[regime],
              )}
            >
              {score}
            </span>
            <span className="text-muted text-sm">/ 100</span>
          </div>
          <div className="text-sm font-medium text-ink mt-0.5">{data.label}</div>
          <div className="text-xs text-muted mt-0.5">
            {data.components.length} componentes
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="mt-5 space-y-2.5">
        {data.components.map((c, i) => (
          <ComponentRow key={c.name} c={c} index={i} />
        ))}
      </div>
    </div>
  );
}

function ComponentRow({ c, index }: { c: FgComponent; index: number }) {
  const Icon =
    c.value > 60 ? TrendingUp : c.value < 40 ? TrendingDown : Minus;
  return (
    <div
      className="flex items-center gap-3 animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Icon
        className={cn(
          "w-3.5 h-3.5 shrink-0",
          c.value > 60 ? "text-positive" : c.value < 40 ? "text-negative" : "text-muted",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-ink truncate">{c.label}</span>
          <span className="font-tabular text-xs text-muted shrink-0">
            {c.value}
            <span className="text-faint ml-1">· {Math.round(c.weight * 100)}%</span>
          </span>
        </div>
        <div className="mt-1 h-1 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${c.value}%`,
              background:
                c.value > 60
                  ? "var(--positive)"
                  : c.value < 40
                    ? "var(--negative)"
                    : "var(--muted)",
            }}
          />
        </div>
        <div className="text-[10px] text-faint mt-0.5 truncate font-tabular">
          {c.raw.description}
        </div>
      </div>
    </div>
  );
}
