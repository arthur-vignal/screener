"use client";

/**
 * PeriodTabs — seletor de período horizontal (pills).
 *
 * Padrão visual (sulfur-ui-rules §3.3):
 *   Container: bg-white/[0.02] rounded-md p-0.5 border border-white/10
 *   Item:      px-3 py-1 rounded text-[12px] text-muted-foreground
 *   Ativo:     bg-white/[0.06] text-foreground
 *
 * Suporta também uma opção "max" (sem limite) como null.
 */

import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type PeriodRange = {
  startYear: number | null;
  endYear: number | null;
};

export type PeriodPreset = {
  /** Label exibido. Ex: "1A", "5Y", "Max". */
  label: string;
  /** Valor. null = sem filtro (Max). */
  value: PeriodRange;
  /** Se true, desabilita (ex: histórico curto demais). */
  disabled?: boolean;
};

type Props = {
  /** Lista de presets disponíveis. */
  presets: PeriodPreset[];
  /** Valor selecionado. */
  value: PeriodRange;
  /** Callback ao mudar. */
  onChange: (value: PeriodRange) => void;
  className?: string;
  /** Tamanho da fonte. Default: "sm". */
  size?: "sm" | "md";
};

const sizeMap = {
  sm: { container: "p-0.5", item: "px-2.5 py-1 text-[11px]" },
  md: { container: "p-0.5", item: "px-3 py-1.5 text-[12px]" },
};

export function PeriodTabs({
  presets,
  value,
  onChange,
  className,
  size = "sm",
}: Props): JSX.Element {
  const sizes = sizeMap[size];

  return (
    <div
      className={cn(
        "inline-flex bg-white/[0.02] rounded-md border border-white/10",
        sizes.container,
        className
      )}
      role="tablist"
    >
      {presets.map((preset) => {
        const isActive = preset.value === value;
        return (
          <button
            key={preset.label}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={preset.disabled}
            onClick={() => onChange(preset.value)}
            className={cn(
              "rounded font-medium tabular-nums transition-colors",
              sizes.item,
              isActive
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:text-foreground",
              preset.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

// Helper: filtra array de pontos (com .endDate) pelo range.
export function filterByRange<T extends { endDate: string }>(
  data: T[],
  range: PeriodRange
): T[] {
  if (!range.startYear && !range.endYear) return data;
  return data.filter((d) => {
    const year = parseInt(d.endDate.slice(0, 4), 10);
    if (range.startYear && year < range.startYear) return false;
    if (range.endYear && year > range.endYear) return false;
    return true;
  });
}
