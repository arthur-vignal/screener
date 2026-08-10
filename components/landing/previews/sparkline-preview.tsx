"use client";

import { useEffect, useState } from "react";
import { getHistory } from "@/lib/brapi-history";

/**
 * SparklinePreview — small inline SVG sparkline rendered from real
 * Brapi historical data. Used inside CometCard to give each feature
 * a visual demo of the data it shows.
 */
export function SparklinePreview({
  symbol,
  range = "3mo",
  height = 56,
  positive,
}: {
  symbol: string;
  range?: "1mo" | "3mo" | "6mo" | "1y";
  height?: number;
  positive?: boolean;
}) {
  const [points, setPoints] = useState<{ t: number; v: number }[] | null>(
    null,
  );

  useEffect(() => {
    getHistory(symbol, range)
      .then(setPoints)
      .catch(() => setPoints([]));
  }, [symbol, range]);

  const w = 280;
  const h = height;
  if (!points || points.length < 2) {
    return (
      <div
        className="w-full rounded-md shimmer"
        style={{ height: `${h}px` }}
      />
    );
  }
  const closes = points.map((p) => p.v);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const rangeV = max - min || 1;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - ((p.v - min) / rangeV) * (h - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const isUp =
    positive != null ? positive : closes[closes.length - 1] >= closes[0];
  const color = isUp ? "#34d399" : "#f2555f";
  const last = closes[closes.length - 1];
  const first = closes[0];
  const change = last - first;
  const pct = (change / first) * 100;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          {symbol}
        </span>
        <span
          className="num text-[11.5px] font-medium"
          style={{ color }}
        >
          {change >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${h}px` }}
      >
        <defs>
          <linearGradient id={`spark-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L${w},${h} L0,${h} Z`}
          fill={`url(#spark-${symbol})`}
        />
        <path
          d={path}
          stroke={color}
          strokeWidth="1.4"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
