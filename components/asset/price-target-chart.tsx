"use client";

/**
 * PriceTargetChart — comparação visual entre preço atual e alvos
 * (estilo Fey TSLA).
 *
 * Visual:
 *   ┌─────────────────────────────────────────────┐
 *   │ R$50.69  +18.32% potential                   │
 *   │                                              │
 *   │   ── High     R$50.69                        │
 *   │   ── Median   R$42.00                        │
 *   │   ●  Current  R$42.83                        │
 *   │   ── Low      R$29.31                        │
 *   │                                              │
 *   │ Bar range: [Low — High]                      │
 *   │ Marcador circular no Current                 │
 *   └─────────────────────────────────────────────┘
 *
 * Dados:
 *   - targetHigh / targetMedian / targetLow vêm do `bundle.metrics`
 *     (analyst price targets via brapi /stocks/statistics)
 *   - Fallback: 52w high/low + midpoint × 1.05 quando targets ausentes.
 */

import { useMemo } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type Props = {
  /** Preço atual. */
  current: number | null;
  /** 52-week high (sempre presente). */
  high52w: number | null;
  /** 52-week low (sempre presente). */
  low52w: number | null;
  /** Price target — High (analyst). */
  targetHigh?: number | null;
  /** Price target — Low (analyst). */
  targetLow?: number | null;
  /** Price target — Median (analyst). */
  targetMedian?: number | null;
  /** Price target — Mean (analyst). */
  targetMean?: number | null;
  currency: "BRL" | "USD";
  className?: string;
};

export function PriceTargetChart({
  current,
  high52w,
  low52w,
  targetHigh,
  targetLow,
  targetMedian,
  targetMean,
  currency,
  className,
}: Props): JSX.Element | null {
  const tHigh = targetHigh ?? high52w;
  const tLow = targetLow ?? low52w;
  // Fallback median: midpoint × 1.05 (proxy de upside).
  const tMedian =
    targetMedian ??
    (high52w != null && low52w != null ? ((high52w + low52w) / 2) * 1.05 : null);

  if (!current || !tHigh || !tLow || !tMedian) return null;

  // Upside potencial baseado em tMean (preferred) ou tMedian.
  const ref = targetMean ?? tMedian;
  const upsidePct = ((ref - current) / current) * 100;
  const upsideColor =
    upsidePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]";

  const fmt = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });

  const symbol = currency === "USD" ? "$" : "R$";

  // Calcula % de cada nível vs range [Low, High] (0-100%).
  const range = tHigh - tLow;
  const highPct = 100;
  const medianPct = range > 0 ? ((tMedian - tLow) / range) * 100 : 50;
  const currentPct = range > 0 ? ((current - tLow) / range) * 100 : 50;
  const lowPct = 0;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header: upside potencial */}
      <div className="flex items-baseline justify-between mb-4 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mb-1">
            Price target
          </div>
          <div className="text-[18px] font-semibold text-foreground tabular-nums leading-none">
            {fmt(ref)}
          </div>
        </div>
        <div
          className={cn(
            "text-[13px] font-semibold tabular-nums px-2.5 py-1 rounded-md",
            upsidePct >= 0
              ? "bg-[var(--positive)]/12 text-[var(--positive)]"
              : "bg-[var(--negative)]/12 text-[var(--negative)]",
          )}
        >
          {upsidePct >= 0 ? "+" : ""}
          {upsidePct.toFixed(2)}%
        </div>
      </div>

      {/* Visual: range horizontal com marcadores */}
      <div className="relative h-[140px] mb-3">
        {/* Track (range bar) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/[0.05]" />

        {/* Preenchimento do range Low→Median (mais "esperado") */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-white/[0.08] to-white/[0.16]"
          style={{ left: `${lowPct}%`, width: `${medianPct - lowPct}%` }}
        />

        {/* Marcadores */}
        <Marker
          x={highPct}
          label="High"
          value={tHigh}
          currency={currency}
          symbol={symbol}
          isExtreme
          extremeColor="text-[var(--positive)]"
          fmt={fmt}
        />
        <Marker
          x={medianPct}
          label="Median"
          value={tMedian}
          currency={currency}
          symbol={symbol}
          isMedian
          fmt={fmt}
        />
        <Marker
          x={currentPct}
          label="Current"
          value={current}
          currency={currency}
          symbol={symbol}
          isCurrent
          fmt={fmt}
        />
        <Marker
          x={lowPct}
          label="Low"
          value={tLow}
          currency={currency}
          symbol={symbol}
          isExtreme
          extremeColor="text-[var(--negative)]"
          fmt={fmt}
        />
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <StatBlock
          label="52w Range"
          value={`${fmt(tLow)} – ${fmt(tHigh)}`}
        />
        <StatBlock
          label="Spread"
          value={`${(((tHigh - tLow) / tLow) * 100).toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

function Marker({
  x,
  label,
  value,
  currency,
  symbol,
  isExtreme,
  isMedian,
  isCurrent,
  extremeColor,
  fmt,
}: {
  x: number;
  label: string;
  value: number;
  currency: "BRL" | "USD";
  symbol: string;
  isExtreme?: boolean;
  isMedian?: boolean;
  isCurrent?: boolean;
  extremeColor?: string;
  fmt: (v: number) => string;
}): JSX.Element {
  // Clamp x entre 2-98 pra não cortar label nas pontas.
  const clampedX = Math.max(2, Math.min(98, x));

  return (
    <div
      className="absolute top-0 bottom-0 flex flex-col items-center justify-between pointer-events-none"
      style={{ left: `${clampedX}%`, transform: "translateX(-50%)" }}
    >
      {/* Label em cima */}
      <div
        className={cn(
          "text-[9px] uppercase tracking-[0.14em] font-semibold leading-none",
          isExtreme && extremeColor
            ? extremeColor
            : isCurrent
              ? "text-foreground"
              : isMedian
                ? "text-muted-foreground/85"
                : "text-muted-foreground/70",
        )}
      >
        {label}
      </div>
      {/* Marker dot */}
      <div
        className={cn(
          "rounded-full border-2 border-[#070709]",
          isCurrent
            ? "h-4 w-4 bg-[#489ffa] shadow-[0_0_12px_rgba(72,159,250,0.5)]"
            : isMedian
              ? "h-2.5 w-2.5 bg-foreground/70"
              : isExtreme
                ? "h-2 w-2 bg-foreground/40"
                : "h-2 w-2 bg-foreground/40",
        )}
      />
      {/* Valor embaixo */}
      <div
        className={cn(
          "text-[11px] font-semibold tabular-nums leading-none",
          isCurrent ? "text-foreground" : "text-muted-foreground/85",
        )}
      >
        {fmt(value)}
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="rounded-md bg-white/[0.02] border border-white/[0.04] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-[12px] font-semibold tabular-nums text-foreground/85">
        {value}
      </div>
    </div>
  );
}
