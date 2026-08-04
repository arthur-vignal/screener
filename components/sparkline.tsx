"use client";

import useSWR from "swr";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SparklineProps = {
  symbol: string;
  width?: number;
  height?: number;
  className?: string;
  positive?: boolean;
};

/**
 * Sparkline — mini SVG chart rendered from /api/chart/[ticker]?range=1M.
 * Stroke color follows the change direction (or the explicit prop).
 */
export function Sparkline({
  symbol,
  width = 60,
  height = 20,
  className,
  positive,
}: SparklineProps) {
  const { data } = useSWR<{ history: { close: number }[] }>(
    `/api/chart/${encodeURIComponent(symbol)}?range=1M`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const points = data?.history ?? [];
  if (points.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={cn("shrink-0", className)}
        aria-hidden
      />
    );
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const stepX = width / (closes.length - 1);

  const path = closes
    .map((c, i) => {
      const x = i * stepX;
      const y = height - ((c - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const isUp = positive ?? closes[closes.length - 1] >= closes[0];
  const stroke = isUp ? "var(--positive)" : "var(--negative)";
  const fill = isUp ? "var(--positive-soft)" : "var(--negative-soft)";

  const lastY = height - ((closes[closes.length - 1] - min) / range) * height;
  const lastX = (closes.length - 1) * stepX;

  return (
    <svg
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d={`${path} L ${lastX.toFixed(2)} ${height} L 0 ${height} Z`}
        fill={fill}
        opacity={0.4}
      />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-stroke-draw"
        style={{ "--draw-length": points.length * 12 } as React.CSSProperties}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={1.5}
        fill={stroke}
      />
    </svg>
  );
}
