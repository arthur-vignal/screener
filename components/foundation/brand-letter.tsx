"use client";

/**
 * BrandLetter — avatar circular de ticker com cor de marca.
 *
 * Mostra a primeira letra do ticker com fundo tingido pela cor da marca
 * (vinda de lib/brand-colors.ts). Fallback: letra sobre muted background.
 *
 * Tamanhos: sm (28px), md (40px), lg (56px).
 */

import type { JSX } from "react";

import { BRAND_COLOR, getBrandColor } from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

export type BrandLetterSize = "sm" | "md" | "lg";

type Props = {
  symbol: string;
  size?: BrandLetterSize;
  /** Se fornecido, sobrescreve a cor da marca (hex). */
  color?: string;
  className?: string;
};

const sizeMap: Record<
  BrandLetterSize,
  { box: string; text: string }
> = {
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-10 w-10", text: "text-[14px]" },
  lg: { box: "h-14 w-14", text: "text-[18px]" },
};

export function BrandLetter({
  symbol,
  size = "md",
  color,
  className,
}: Props): JSX.Element {
  const sizes = sizeMap[size];
  const hex = color ?? getBrandColor(symbol) ?? "#475569";
  const letter = symbol.slice(0, 1).toUpperCase();

  // Calcula luminância pra decidir cor do texto
  const luminance = hexLuminance(hex);
  const textColor = luminance > 0.55 ? "#0a0a0c" : "#eeeff1";

  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center font-semibold tracking-tight select-none",
        sizes.box,
        sizes.text,
        className
      )}
      style={{
        background: `linear-gradient(180deg, ${hex}26, ${hex}1a)`,
        border: `1px solid ${hex}40`,
        color: textColor,
      }}
      aria-label={symbol}
      title={symbol}
    >
      {letter}
    </div>
  );
}

// Luminância relativa WCAG. threshold ~0.55 separa fundos claros/escuros.
function hexLuminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Re-exporta utilitários pra quem importa daqui.
export { BRAND_COLOR };
