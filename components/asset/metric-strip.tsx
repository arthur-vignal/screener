"use client";

/**
 * MetricStrip — strip horizontal com 10 widgets (estilo Fey TSLA).
 *
 * Visual: 1 linha, 10 colunas, separadores verticais sutis entre cada.
 * Sem cards separados — flow contínuo.
 * Botão "—" quando sem dado (igual print).
 *
 * Layout:
 *   Mkt cap | EV/Sales | P/E ratio | FY Revenue | EPS | ... | Sector
 *   $1.06T  | 10.82    | 149.04   | $97.69B   | $2.21| ... | Cons Cyc
 */

import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type MetricCell = {
  label: string;
  value: string;
};

type Props = {
  cells: MetricCell[];
  className?: string;
};

export function MetricStrip({ cells, className }: Props): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] px-5 py-4",
        "flex items-stretch justify-between overflow-x-auto",
        className
      )}
    >
      {cells.map((cell, idx) => (
        <div
          key={`${cell.label}-${idx}`}
          className={cn(
            "flex-1 min-w-0 px-4 first:pl-0 last:pr-0",
            idx > 0 && "border-l border-white/[0.06]"
          )}
        >
          <div className="text-[11px] text-muted-foreground/70 mb-1 truncate">
            {cell.label}
          </div>
          <div
            className={cn(
              "text-[15px] font-semibold tabular-nums text-foreground",
              cell.value === "—" && "text-muted-foreground/40"
            )}
          >
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}
