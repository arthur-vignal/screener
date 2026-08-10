"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Grid3x3, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CorrelationMatrix = {
  symbols: string[];
  matrix: number[][];
  range: "1Y";
  computedAt: number;
};

/**
 * CorrelationHeatmap — N×N matrix showing Pearson correlation between assets.
 * Hover highlights row+column. Color: -1 (negative) red, 0 (neutral) gray, +1 (positive) green.
 */
export function CorrelationHeatmap() {
  const { data } = useSWR<CorrelationMatrix>("/api/correlation", fetcher, {
    refreshInterval: 60 * 60 * 1000, // 1h
  });

  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);

  const symbols = data?.symbols ?? [];
  const matrix = data?.matrix ?? [];

  const hoveredValue = useMemo(() => {
    if (!hovered || !matrix[hovered.row]?.[hovered.col]) return null;
    return matrix[hovered.row][hovered.col];
  }, [hovered, matrix]);

  if (symbols.length === 0) {
    return (
      <div className="panel p-12 text-center text-sm text-muted">
        Carregando matriz de correlação...
      </div>
    );
  }

  return (
    <div className="panel p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-brand-deep" />
          <h3 className="text-sm font-medium text-ink uppercase tracking-wider">
            Correlação entre ativos
          </h3>
        </div>
        {hovered && (
          <div className="text-xs text-muted">
            <span className="font-mono text-ink">{symbols[hovered.row]}</span>
            <span className="text-faint mx-1.5">×</span>
            <span className="font-mono text-ink">{symbols[hovered.col]}</span>
            <span
              className={cn(
                "ml-2 font-tabular font-medium",
                (hoveredValue ?? 0) > 0.3 && "text-positive",
                (hoveredValue ?? 0) < -0.3 && "text-negative",
                Math.abs(hoveredValue ?? 0) <= 0.3 && "text-muted",
              )}
            >
              {hoveredValue?.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-1 py-1.5 w-16"></th>
              {symbols.map((s, i) => (
                <th
                  key={s}
                  className={cn(
                    "px-1 py-1.5 font-mono font-medium text-[10px] text-muted w-9 text-center align-bottom",
                    hovered?.row === i && "text-ink",
                  )}
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((s, i) => (
              <tr key={s}>
                <td className="px-1 py-1 font-mono font-medium text-[10px] text-muted text-right">
                  {s}
                </td>
                {symbols.map((_, j) => {
                  const v = matrix[i][j] ?? 0;
                  const isDiag = i === j;
                  const isHovered = hovered?.row === i || hovered?.col === j;
                  const isCross = hovered?.row === i && hovered?.col === j;
                  return (
                    <td
                      key={j}
                      onMouseEnter={() => setHovered({ row: i, col: j })}
                      onMouseLeave={() => setHovered(null)}
                      className={cn(
                        "p-0.5 transition-all duration-150",
                        isCross && "outline outline-2 outline-ink outline-offset-1",
                        !isCross && isHovered && "outline outline-1 outline-ink/30 outline-offset-0",
                      )}
                    >
                      <div
                        className="w-8 h-8 flex items-center justify-center font-tabular text-[10px] font-medium"
                        style={{
                          backgroundColor: cellColor(v),
                          color: textColor(v),
                        }}
                      >
                        {isDiag ? "1" : v.toFixed(1)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-hairline">
        <div className="text-xs text-muted">
          {symbols.length} ativos · 1Y daily returns · Pearson
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted">−1</span>
          <div
            className="h-1.5 w-32 rounded-full"
            style={{
              background:
                "linear-gradient(to right, var(--negative), #7a4e3c, var(--muted), #4a8a64, var(--positive))",
            }}
          />
          <span className="text-muted">+1</span>
        </div>
      </div>
    </div>
  );
}

function cellColor(v: number): string {
  // Map -1 → +1 to color gradient
  const clamped = Math.max(-1, Math.min(1, v));
  if (clamped >= 0) {
    const t = clamped;
    // Desaturated: gray (#3f4047) to green (#34d399) per Fey palette
    const r = Math.round(63 + (52 - 63) * t);
    const g = Math.round(64 + (211 - 64) * t);
    const b = Math.round(71 + (153 - 71) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = -clamped;
    // Gray (#3f4047) to red (#f2555f)
    const r = Math.round(63 + (242 - 63) * t);
    const g = Math.round(64 + (85 - 64) * t);
    const b = Math.round(71 + (95 - 71) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function textColor(v: number): string {
  const abs = Math.abs(v);
  return abs > 0.5 ? "white" : "var(--ink)";
}
