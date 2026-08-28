"use client";

/**
 * TickerLogo — logo oficial do ticker via Brapi icons.
 *
 * URL: https://icons.brapi.dev/icons/{SYMBOL}.svg
 * Não precisa de token (público).
 *
 * Fallback: se a imagem falhar (404, timeout), mostra a primeira letra
 * com cor da marca (igual ao BrandLetter antigo).
 *
 * Tamanhos: sm (28px), md (40px), lg (56px).
 */

import { useState } from "react";
import type { JSX } from "react";

import { getBrandColor } from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

export type TickerLogoSize = "sm" | "md" | "lg";

type Props = {
  symbol: string;
  size?: TickerLogoSize;
  className?: string;
};

const sizeMap: Record<
  TickerLogoSize,
  { box: string; text: string }
> = {
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-10 w-10", text: "text-[14px]" },
  lg: { box: "h-14 w-14", text: "text-[18px]" },
};

function buildUrl(symbol: string): string {
  return `https://icons.brapi.dev/icons/${encodeURIComponent(symbol)}.svg`;
}

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

export function TickerLogo({
  symbol,
  size = "md",
  className,
}: Props): JSX.Element {
  const sizes = sizeMap[size];
  const [failed, setFailed] = useState(false);
  const letter = symbol.slice(0, 1).toUpperCase();

  // Fallback visual: brand letter
  if (failed) {
    const hex = getBrandColor(symbol) ?? "#475569";
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

  return (
    <div
      className={cn(
        "shrink-0 rounded-full overflow-hidden flex items-center justify-center",
        sizes.box,
        className
      )}
      aria-label={symbol}
      title={symbol}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={buildUrl(symbol)}
        alt={`${symbol} logo`}
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
