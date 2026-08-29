"use client";

/**
 * SectorMedianStrip — referência rápida ao subsetor.
 *
 * Visual:
 *   ┌─────────────────────────────────────────────┐
 *   │ Energia · 6 peers                            │
 *   │                                              │
 *   │   P/E        EV/EBITDA    ROIC              │
 *   │   8.39x      5.87x        —                  │
 *   │   vs setor   vs setor     vs setor           │
 *   │   median 12.0x  median 17.3x                 │
 *   │   [-3.7x]     [-11.5x]    [—]               │
 *   └─────────────────────────────────────────────┘
 *
 * Dados:
 *   - asset: P/E, EV/EBITDA, ROIC do próprio ticker (de peer-benchmarks.asset)
 *   - medians: P/E, EV/EBITDA, ROIC medianos do subsetor
 *   - delta: diferença vs setor (positivo = acima, negativo = abaixo)
 *
 * Cor:
 *   - Acima do setor = neutro (não necessariamente ruim — depende)
 *   - P/E alto em setor de baixa margem = ruim; EV/EBITDA alto = caro
 *   - Por simplicidade, mostramos magnitude e cor neutra quando fora
 *     de ±1σ da mediana do subsetor.
 */

import type { JSX } from "react";
import { cn } from "@/lib/utils";

export type SectorMedian = {
  symbol: string;
  subSector: string | null;
  peerCount: number;
  asset: {
    pe: number | null;
    evEbitda: number | null;
    roic: number | null;
  };
  medians: {
    pe: number | null;
    evEbitda: number | null;
    roic: number | null;
  };
};

type Props = {
  data: SectorMedian | null;
  loading?: boolean;
  className?: string;
};

type Metric = {
  label: string;
  asset: number | null;
  median: number | null;
  /** True se "menor é melhor" (P/E, EV/EBITDA). False se "maior é melhor" (ROIC). */
  lowerIsBetter: boolean;
};

export function SectorMedianStrip({
  data,
  loading,
  className,
}: Props): JSX.Element {
  if (loading && !data) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-white/[0.06] bg-white/[0.02] h-[100px] animate-pulse",
          className,
        )}
      />
    );
  }

  if (!data || data.peerCount === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 flex items-center justify-between text-[12px] text-muted-foreground/70",
          className,
        )}
      >
        <span>Setor não disponível — Brapi não retornou pares do subsetor.</span>
      </div>
    );
  }

  const metrics: Metric[] = [
    {
      label: "P/E",
      asset: data.asset.pe,
      median: data.medians.pe,
      lowerIsBetter: true,
    },
    {
      label: "EV/EBITDA",
      asset: data.asset.evEbitda,
      median: data.medians.evEbitda,
      lowerIsBetter: true,
    },
    {
      label: "ROIC",
      asset: data.asset.roic,
      median: data.medians.roic,
      lowerIsBetter: false,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">
            Setor
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {data.subSector ?? "B3"}
          </span>
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">
            · {data.peerCount} pares
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <SectorMetric key={m.label} metric={m} />
        ))}
      </div>
    </div>
  );
}

function SectorMetric({ metric }: { metric: Metric }): JSX.Element {
  const { asset, median, label, lowerIsBetter } = metric;

  if (asset == null && median == null) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
          {label}
        </div>
        <div className="text-[18px] font-semibold tabular-nums text-muted-foreground/40">
          —
        </div>
      </div>
    );
  }

  // Delta
  const delta = asset != null && median != null ? asset - median : null;
  const deltaAbs = delta != null ? Math.abs(delta) : null;

  // Cor: se lowerIsBetter, abaixo do median = bom (verde); senão, acima = bom.
  let colorClass = "text-foreground/85";
  if (delta != null && median != null) {
    const favorable = lowerIsBetter ? delta < 0 : delta > 0;
    if (Math.abs(delta) / median < 0.1) {
      // dentro de ±10% — neutro
      colorClass = "text-foreground/85";
    } else if (favorable) {
      colorClass = "text-[var(--positive)]";
    } else {
      colorClass = "text-[var(--negative)]";
    }
  }

  const fmtValue = (v: number | null) =>
    v == null
      ? "—"
      : v.toLocaleString("en-US", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        });

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
        {label}
      </div>
      <div className={cn("text-[18px] font-semibold tabular-nums leading-tight", colorClass)}>
        {fmtValue(asset)}
        {median != null && (
          <span className="text-[12px] font-medium text-muted-foreground/60 ml-1.5">
            vs {fmtValue(median)}
          </span>
        )}
      </div>
      {delta != null && deltaAbs != null && (
        <div
          className={cn(
            "text-[10px] tabular-nums mt-0.5",
            delta === 0
              ? "text-muted-foreground/60"
              : delta > 0
                ? lowerIsBetter
                  ? "text-[var(--negative)]"
                  : "text-[var(--positive)]"
                : lowerIsBetter
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]",
          )}
        >
          {delta >= 0 ? "+" : "−"}
          {deltaAbs.toFixed(2)}
        </div>
      )}
    </div>
  );
}
