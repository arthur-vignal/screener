"use client";

/**
 * TickerChip — clickable pill with a logo placeholder + the ticker
 * symbol. Used inline inside article headlines to make any B3 ticker
 * mention a jump-to-asset-page link.
 *
 * Layout (matches the Mobbin/NVDA reference):
 *   ┌──────────────────────┐
 *   │ [○]  PETR4           │   ← circular colored badge with the first
 *   │                      │     letter, then the symbol in semibold
 *   └──────────────────────┘
 *
 * Colors are derived from a stable hash of the symbol so the same
 * ticker always renders the same color across the app.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { B3_BY_SYMBOL } from "@/lib/b3-tickers";

const PALETTE = [
  { bg: "from-emerald-500 to-emerald-700", text: "text-white" },
  { bg: "from-blue-500 to-blue-700", text: "text-white" },
  { bg: "from-purple-500 to-purple-700", text: "text-white" },
  { bg: "from-rose-500 to-rose-700", text: "text-white" },
  { bg: "from-amber-500 to-amber-700", text: "text-black" },
  { bg: "from-cyan-500 to-cyan-700", text: "text-white" },
  { bg: "from-pink-500 to-pink-700", text: "text-white" },
  { bg: "from-indigo-500 to-indigo-700", text: "text-white" },
  { bg: "from-teal-500 to-teal-700", text: "text-white" },
  { bg: "from-orange-500 to-orange-700", text: "text-white" },
];

function hashColor(symbol: string) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

/**
 * Render a small letter avatar for the ticker. We use the first
 * character of the symbol — works for the common Latin B3 case.
 */
function TickerAvatar({ symbol, size }: { symbol: string; size: number }) {
  const palette = hashColor(symbol);
  const letter = symbol.charAt(0);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${palette.bg} ${palette.text} font-semibold shrink-0 select-none`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        lineHeight: 1,
      }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

/**
 * TickerChip — compact inline link (use inside headlines/body).
 */
export function TickerChip({
  symbol,
  size = 16,
  showSymbol = true,
  className,
}: {
  symbol: string;
  size?: number;
  showSymbol?: boolean;
  className?: string;
}) {
  const entry = B3_BY_SYMBOL[symbol];
  const displayName = entry?.name ?? symbol;
  return (
    <Link
      href={`/asset/${encodeURIComponent(symbol)}`}
      className={cn(
        "inline-flex items-center gap-1.5 align-baseline rounded-full",
        "bg-white/5 hover:bg-white/10 border border-white/10",
        "px-1.5 py-0.5 transition-colors no-underline",
        "hover:border-white/20",
        className
      )}
      title={`Ir para ${displayName} (${symbol})`}
    >
      <TickerAvatar symbol={symbol} size={size} />
      {showSymbol && (
        <span className="text-[12.5px] font-semibold tracking-tight text-foreground/95">
          {symbol}
        </span>
      )}
    </Link>
  );
}

/**
 * TickerChipLarge — for the "stand-alone" header treatment (matches
 * the Mobbin NVDA reference: large circular badge + ticker beside).
 * Used outside an article, e.g. at the top of a news card or when a
 * user is reading the asset page.
 */
export function TickerChipLarge({
  symbol,
  size = 56,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const entry = B3_BY_SYMBOL[symbol];
  const displayName = entry?.name ?? symbol;
  return (
    <Link
      href={`/asset/${encodeURIComponent(symbol)}`}
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl bg-white/[0.03]",
        "hover:bg-white/[0.06] border border-white/10 px-4 py-3",
        "transition-colors no-underline",
        className
      )}
      title={`Ir para ${displayName} (${symbol})`}
    >
      <TickerAvatar symbol={symbol} size={size} />
      <div className="flex flex-col leading-tight">
        <span className="text-[20px] font-semibold tracking-tight text-foreground">
          {symbol}
        </span>
        {entry?.name && (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground line-clamp-1 max-w-[180px]">
            {displayName}
          </span>
        )}
      </div>
    </Link>
  );
}
