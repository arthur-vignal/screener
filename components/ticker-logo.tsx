"use client";

/**
 * TickerLogo — circular colored badge with the first letter(s) of the
 * ticker symbol. Used as the identity mark on the asset-page header.
 *
 * Color is derived from a stable hash of the symbol so the same ticker
 * always renders the same color across the app. Matches the palette
 * used by TickerChip so the two feel related visually.
 *
 * Size variants:
 *   - "sm" (28px) — inline with text
 *   - "md" (44px) — header (default)
 *   - "lg" (64px) — hero
 */

import { cn } from "@/lib/utils";

const PALETTE: Array<{ bg: string; letter: string }> = [
  { bg: "#10b981", letter: "#ffffff" }, // emerald
  { bg: "#3b82f6", letter: "#ffffff" }, // blue
  { bg: "#a855f7", letter: "#ffffff" }, // purple
  { bg: "#f43f5e", letter: "#ffffff" }, // rose
  { bg: "#f59e0b", letter: "#0a0a0a" }, // amber
  { bg: "#06b6d4", letter: "#ffffff" }, // cyan
  { bg: "#ec4899", letter: "#ffffff" }, // pink
  { bg: "#6366f1", letter: "#ffffff" }, // indigo
  { bg: "#14b8a6", letter: "#ffffff" }, // teal
  { bg: "#f97316", letter: "#ffffff" }, // orange
];

function hashColor(symbol: string) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

function pickLetters(symbol: string): string {
  // PETR4 → P (single)
  // ABEV3 → A (single)
  // AURE3 → A
  // For 4-letter tickers (rare on B3) fall back to first two letters.
  return symbol.length <= 5 ? symbol.charAt(0) : symbol.slice(0, 2);
}

type Size = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, { box: string; text: string }> = {
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-11 w-11", text: "text-[16px]" },
  lg: { box: "h-16 w-16", text: "text-[24px]" },
};

export function TickerLogo({
  symbol,
  size = "md",
  className,
}: {
  symbol: string;
  size?: Size;
  className?: string;
}) {
  const letter = pickLetters(symbol).toUpperCase();
  const c = hashColor(symbol);
  const s = SIZE_CLASSES[size];
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-semibold tracking-tight select-none",
        s.box,
        s.text,
        className,
      )}
      style={{ background: c.bg, color: c.letter }}
    >
      {letter}
    </div>
  );
}