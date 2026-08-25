"use client";

/**
 * ScoreRadar — F3-3.
 *
 * Sulfur Score: composite 0-100 score across 5 axes. Each axis is
 * normalized from a different Brapi field:
 *
 *   Quality    = clamp(mean(roe%, ebitdaMargin%, currentRatio*50), 0, 100)
 *   Cash       = clamp(fcf/ebitda * 100, 0, 100)
 *   Valuation  = inverted percentile of trailingPE vs history
 *   Income     = clamp(dividendYield * 100, 0, 100)
 *   Momentum   = clamp(52WeekChange * 100, 0, 100)
 *
 * Renders as a hand-rolled SVG radar (5 axes, 4 grid rings) because
 * Recharts' RadarChart doesn't compose well with our flat grid style.
 */

import { useMemo } from "react";

type Score = {
  axis: string;
  value: number; // 0..100
};

const AXES: Score["axis"][] = [
  "Qualidade",
  "Caixa",
  "Valuation",
  "Renda",
  "Momentum",
];

export function ScoreRadar({
  scores,
}: {
  scores: Record<string, number>;
}) {
  const data = AXES.map((a) => ({ axis: a, value: clamp(scores[a] ?? 0, 0, 100) }));
  const overall =
    data.reduce((s, d) => s + d.value, 0) / Math.max(1, data.length);

  // Pentagon geometry
  const cx = 150;
  const cy = 150;
  const radius = 110;
  const angle = (i: number) => (Math.PI * 2 * i) / AXES.length - Math.PI / 2;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 320 320" className="w-full max-w-[320px]">
        {/* Background rings */}
        {[0.25, 0.5, 0.75, 1].map((scale, i) => (
          <polygon
            key={i}
            points={AXES.map((_, idx) => {
              const r = radius * scale;
              return `${cx + Math.cos(angle(idx)) * r},${cy + Math.sin(angle(idx)) * r}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}
        {/* Axis spokes */}
        {AXES.map((_, idx) => {
          const x = cx + Math.cos(angle(idx)) * radius;
          const y = cy + Math.sin(angle(idx)) * radius;
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}
        {/* Value polygon */}
        <polygon
          points={data
            .map((d, idx) => {
              const r = (radius * d.value) / 100;
              return `${cx + Math.cos(angle(idx)) * r},${cy + Math.sin(angle(idx)) * r}`;
            })
            .join(" ")}
          fill="rgba(16,185,129,0.20)"
          stroke="#10b981"
          strokeWidth={1.5}
        />
        {/* Axis labels */}
        {AXES.map((label, idx) => {
          const labelR = radius + 22;
          const x = cx + Math.cos(angle(idx)) * labelR;
          const y = cy + Math.sin(angle(idx)) * labelR;
          return (
            <text
              key={idx}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground/80"
              fontSize={11}
              style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}
            >
              {label}
            </text>
          );
        })}
        {/* Score in center */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={28}
          style={{ fontWeight: 600 }}
        >
          {overall.toFixed(0)}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-muted-foreground/60"
          fontSize={10}
          style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}
        >
          Score Sulfur
        </text>
      </svg>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 w-full max-w-[440px]">
        {data.map((d) => (
          <div
            key={d.axis}
            className="rounded-lg border border-border/60 bg-foreground/[0.02] px-3 py-2 text-center"
          >
            <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/60">
              {d.axis}
            </p>
            <p className="mt-1 text-[16px] font-semibold tabular-nums">
              {d.value.toFixed(0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}