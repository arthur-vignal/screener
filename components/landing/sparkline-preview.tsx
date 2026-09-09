"use client";

/**
 * SparklinePreview — preview SVG estática (sem Recharts) do card "Carteiras".
 *
 * 1 série: linha fina off-white + fill gradient + valor textual (KPIs visíveis).
 * Inspiração pack 05 chart-pack-references.
 */

import { cn } from "@/lib/utils";

const POINTS = [
  40, 38, 42, 45, 43, 48, 46, 50, 54, 52, 58, 61, 59, 64, 68, 66, 72, 76, 74,
  80,
];

export function SparklinePreview() {
  const w = 320;
  const h = 120;
  const min = Math.min(...POINTS);
  const max = Math.max(...POINTS);
  const xs = POINTS.map((_, i) => (i / (POINTS.length - 1)) * w);
  const ys = POINTS.map((v) => h - ((v - min) / (max - min)) * (h - 16) - 8);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i]!.toFixed(1)}`).join(" ");
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="text-[26px] font-semibold tabular-nums text-foreground tracking-tight">
          R$ 14.280
        </span>
        <span className="text-[12px] tabular-nums font-medium text-[#4dbe95]">
          +R$ 95,29
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full h-[80px]"
        aria-label="Variação de portfolio nos últimos 30 dias"
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4dbe95" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4dbe95" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-fill)" />
        <path
          d={d}
          fill="none"
          stroke="#eeeff1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground/60 tabular-nums tracking-wide">
        <span>30D atrás</span>
        <span>Hoje</span>
      </div>
    </div>
  );
}
