"use client";

/**
 * AssetHeader — header da página /asset/[symbol] (estilo Fey TSLA).
 *
 * Layout:
 *   [←] [logo] PETR4                       [Analyze] [⤓] [⚙] [☐]
 *         Energia                          3 ícones (analyze, dropdown, bookmark)
 *         Petrobras ...
 */

import Link from "next/link";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  Settings,
} from "lucide-react";
import type { JSX } from "react";

import { TickerLogo } from "@/components/foundation/ticker-logo";
import { cn } from "@/lib/utils";

type Props = {
  symbol: string;
  longName: string | null;
  shortName: string | null;
  sector: string;
  className?: string;
};

export function AssetHeader({
  symbol,
  longName,
  shortName,
  sector,
  className,
}: Props): JSX.Element {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-6 pb-5",
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
            "shrink-0 flex items-center justify-center h-9 w-9 rounded-md",
            "text-muted-foreground/85",
            "hover:bg-white/[0.04] hover:text-foreground",
            "transition-colors cursor-pointer"
          )}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>

        <TickerLogo symbol={symbol} size="md" />

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-semibold tracking-tight text-foreground">
              {symbol}
            </h1>
            {sector && (
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/85 font-medium">
                {sector}
              </span>
            )}
          </div>
          {(longName ?? shortName) && (
            <p className="text-[12px] text-muted-foreground/70 truncate max-w-[60ch]">
              {longName ?? shortName}
            </p>
          )}
        </div>
      </div>

      {/* Direita: ações (estilo Fey TSLA) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md",
            "bg-white/[0.04] border border-white/10 text-foreground",
            "text-[12px] font-medium",
            "hover:bg-white/[0.08] hover:border-white/20",
            "transition-colors cursor-pointer"
          )}
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={2} />
          Analyze
        </button>

        <button
          type="button"
          aria-label="Mais opções"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md",
            "bg-white/[0.04] border border-white/10 text-foreground",
            "hover:bg-white/[0.08] hover:border-white/20",
            "transition-colors cursor-pointer"
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        </button>

        <button
          type="button"
          aria-label="Adicionar aos favoritos"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md",
            "bg-white/[0.04] border border-white/10 text-foreground",
            "hover:bg-white/[0.08] hover:border-white/20",
            "transition-colors cursor-pointer"
          )}
        >
          <Bookmark className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
