"use client";

/**
 * ValuationPreview — preview SVG estática do card "Valuation".
 *
 * Mostra série temporal com banda empírica (P25-P75 do subsetor, padrão
 * §12.3 sulfur-ui-rules) + ponto atual destacado com label P/L.
 */

import { cn } from "@/lib/utils";

const SERIES = [
  12, 13, 11, 14, 15, 13, 16, 18, 17, 19, 18, 20, 19, 21, 20, 22, 21, 23,
];
const BAND_HIGH = SERIES.map((v) => v * 1.45);
const BAND_LOW = SERIES.map((v) => Math.max(0, v * 0.7));
const CURRENT = SERIES[SERIES.length - 1]!;

export function ValuationPreview() {
  const w = 320;
  const h = 130;
  const all = [...SERIES, ...BAND_HIGH, ...BAND_LOW, CURRENT];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const yScale = (v: number) =>
    h - ((v - min) / (max - min)) * (h - 22) - 11;
  const xAt = (i: number) => (i / (SERIES.length - 1)) * w;

  const highPath = BAND_HIGH.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(" ");
  const lowPath = BAND_LOW.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(" ");
  const seriesPath = SERIES.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(" ");
  const bandArea = `${highPath} ${BAND_LOW.map((_, i) => `L ${xAt(BAND_LOW.length - 1 - i).toFixed(1)} ${yScale(BAND_LOW[BAND_LOW.length - 1 - i]!).toFixed(1)}`).join(" ")} Z`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="text-[26px] font-semibold tabular-nums text-foreground tracking-tight">
          {CURRENT.toFixed(1)}x
        </span>
        <span className="text-[12px] tabular-nums font-medium text-muted-foreground/70">
          P/L 5a
        </span>
        <span className="ml-auto text-[10.5px] text-muted-foreground/60 uppercase tracking-[0.14em]">
          Subsetor · Energia
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full h-[100px]"
        aria-label="Banda empírica de P/L 5 anos"
      >
        <path d={bandArea} fill="#489ffa" fillOpacity="0.10" />
        <path
          d={highPath}
          fill="none"
          stroke="#489ffa"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <path
          d={lowPath}
          fill="none"
          stroke="#489ffa"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <path
          d={seriesPath}
          fill="none"
          stroke="#eeeff1"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={xAt(SERIES.length - 1)}
          cy={yScale(CURRENT)}
          r="3.5"
          fill="#489ffa"
          stroke="#eeeff1"
          strokeWidth="1.5"
        />
      </svg>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 tabular-nums">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-white" />
          P/L histórico
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-[#489ffa]/20 border border-[#489ffa]/40" />
          P25 — P75 subsetor
        </span>
      </div>
    </div>
  );
}
