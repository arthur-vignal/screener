"use client";

/**
 * IndexLogo — logo circular de índice B3.
 *
 * Fallback: letra sobre cor neutra do índice (definida no mapa).
 * Tamanhos: sm (28px), md (40px), lg (56px).
 *
 * Os SVGs/PNGs oficiais virão de B3. Por ora, usa-se fallback tipográfico.
 */

import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type IndexLogoSize = "sm" | "md" | "lg";

// Mapa de cores neutras por índice B3 (referência visual).
// Mantém consistência visual quando não temos o logo oficial.
const INDEX_PALETTE: Record<string, { bg: string; text: string; label: string }> = {
  IBOV: { bg: "#1f2427", text: "#eeeff1", label: "IB" },
  IBRX: { bg: "#1f2427", text: "#eeeff1", label: "IBX" },
  SMLL: { bg: "#1f2427", text: "#eeeff1", label: "SML" },
  IDIV: { bg: "#1f2427", text: "#eeeff1", label: "IDV" },
  IFIX: { bg: "#1f2427", text: "#eeeff1", label: "IFX" },
  // FIIs por setor (placeholder até termos logos)
};

const sizeMap: Record<IndexLogoSize, { box: string; text: string }> = {
  sm: { box: "h-7 w-7", text: "text-[10px]" },
  md: { box: "h-10 w-10", text: "text-[12px]" },
  lg: { box: "h-14 w-14", text: "text-[14px]" },
};

type Props = {
  symbol: string; // ex: "IBOV", "IFIX"
  size?: IndexLogoSize;
  className?: string;
};

export function IndexLogo({
  symbol,
  size = "md",
  className,
}: Props): JSX.Element {
  const sizes = sizeMap[size];
  const key = symbol.toUpperCase().replace(/[^A-Z]/g, "");
  const palette = INDEX_PALETTE[key] ?? {
    bg: "#1f2427",
    text: "#eeeff1",
    label: key.slice(0, 3),
  };

  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center font-semibold tracking-tight select-none border border-white/10",
        sizes.box,
        sizes.text,
        className
      )}
      style={{
        background: palette.bg,
        color: palette.text,
      }}
      aria-label={symbol}
      title={symbol}
    >
      {palette.label}
    </div>
  );
}
