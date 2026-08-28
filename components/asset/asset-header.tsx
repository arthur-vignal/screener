"use client";

/**
 * AssetHeader — header da página /asset/[symbol].
 *
 * Layout:
 *   ┌──────┬─────────────────────────────────────┬──────────┐
 *   │ ←    │ [logo] PETR4                        │  ANALYZE │
 *   │      │ Petrobras ...                       │          │
 *   └──────┴─────────────────────────────────────┴──────────┘
 *
 * Toggle BRL/USD (pílula canto superior direito) — switch entre
 * moeda local e USD pra cotações.
 */

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { JSX } from "react";

import { TickerLogo } from "@/components/foundation/ticker-logo";
import { cn } from "@/lib/utils";

type Props = {
  symbol: string;
  longName: string | null;
  shortName: string | null;
  sector: string;
  /** Moeda atual exibida. */
  currency: "BRL" | "USD";
  /** Callback do toggle. */
  onCurrencyChange: (next: "BRL" | "USD") => void;
  className?: string;
};

export function AssetHeader({
  symbol,
  longName,
  shortName,
  sector,
  currency,
  onCurrencyChange,
  className,
}: Props): JSX.Element {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-6 pb-5 border-b border-border/40",
        className
      )}
    >
      {/* Esquerda: voltar + identidade */}
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/home"
          aria-label="Voltar para a home"
          title="Voltar"
          className={cn(
            "shrink-0 flex items-center justify-center h-10 w-10 rounded-md",
            "bg-white/[0.04] border border-white/10 text-muted-foreground/85",
            "hover:bg-white/[0.08] hover:border-white/20 hover:text-foreground",
            "transition-colors cursor-pointer"
          )}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>

        <TickerLogo symbol={symbol} size="lg" />

        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[32px] font-semibold tracking-tight text-foreground">
              {symbol}
            </h1>
            {sector && (
              <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground/85 font-medium">
                {sector}
              </span>
            )}
          </div>
          {(longName ?? shortName) && (
            <p className="text-[13px] text-muted-foreground/85 truncate max-w-[60ch]">
              {longName ?? shortName}
            </p>
          )}
        </div>
      </div>

      {/* Direita: toggle moeda + ANALYZE */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={cn(
            "inline-flex bg-white/[0.02] rounded-md border border-white/10 p-0.5"
          )}
          role="tablist"
          aria-label="Moeda"
        >
          <CurrencyPill
            active={currency === "BRL"}
            onClick={() => onCurrencyChange("BRL")}
          >
            BRL
          </CurrencyPill>
          <CurrencyPill
            active={currency === "USD"}
            onClick={() => onCurrencyChange("USD")}
          >
            USD
          </CurrencyPill>
        </div>

        <button
          type="button"
          onClick={() => {
            // FUTURO: abrir modal de análise completa (Phase 4 — leva dedicada).
            // Por enquanto só loga.
            // eslint-disable-next-line no-console
            console.log("ANALYZE clicked", symbol);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 h-10 px-4 rounded-md",
            "bg-[var(--primary)] text-[#070709]",
            "text-[13px] font-semibold",
            "hover:opacity-90 transition-opacity cursor-pointer"
          )}
        >
          Analyze
        </button>
      </div>
    </header>
  );
}

function CurrencyPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded text-[12px] font-medium transition-colors",
        active
          ? "bg-white/[0.06] text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
