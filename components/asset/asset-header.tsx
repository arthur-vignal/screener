"use client";

/**
 * AssetHeader — header da página /asset/[symbol] (estilo Fey TSLA).
 *
 * Layout:
 *   [←] [logo] PETR4                       [Analyze] [▼] [☐]
 *         Energia                          3 ícones (analyze, dropdown, bookmark)
 *         Petrobras ...
 *
 * Seta esquerda (`variant`):
 *   - root      → dropdown menu com "Voltar home", "Raw data",
 *                  "Full analysis" (cada um navega pra rota alvo).
 *   - analysis  → `router.back()` (volta pra /asset/[symbol]).
 *   - raw-data  → `router.back()` (volta pra /asset/[symbol]).
 *
 * Default = "root" (mantém comportamento legado da raiz).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  FileText,
  LineChart,
  LogOut,
  Settings,
} from "lucide-react";
import type { JSX } from "react";

import { TickerLogo } from "@/components/foundation/ticker-logo";
import { cn } from "@/lib/utils";

type Variant = "root" | "analysis" | "raw-data";

type Props = {
  symbol: string;
  longName: string | null;
  shortName: string | null;
  sector: string;
  className?: string;
  /**
   * Onde o AssetHeader está renderizado. Controla o comportamento da
   * seta esquerda:
   *   - root:      dropdown menu (Voltar / Raw data / Full analysis)
   *   - analysis:  router.back() (volta pra raiz)
   *   - raw-data:  router.back() (volta pra raiz)
   */
  variant?: Variant;
};

export function AssetHeader({
  symbol,
  longName,
  shortName,
  sector,
  className,
  variant = "root",
}: Props): JSX.Element {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Click-outside + Escape fecha o dropdown.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-6 pb-5",
        className
      )}
    >
      {/* Esquerda: voltar + identidade */}
      <div className="flex items-center gap-4 min-w-0">
        {variant === "root" ? (
          <div className="relative shrink-0">
            <button
              ref={triggerRef}
              type="button"
              aria-label="Navegação"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground/85 hover:bg-white/[0.04] hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[200px] rounded-xl border border-white/10 bg-[#101116]/95 shadow-2xl shadow-black/40 backdrop-blur-md p-1.5"
              >
                <Link
                  href="/home"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-foreground/85 hover:bg-white/[0.04] transition-colors"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground/70" />
                  Voltar para home
                </Link>
                <div className="my-1 mx-3 border-t border-white/[0.06]" />
                <Link
                  href={`/asset/${symbol}/raw-data`}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-foreground/85 hover:bg-white/[0.04] transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground/70" />
                  Raw data
                </Link>
                <Link
                  href={`/asset/${symbol}/analysis`}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-foreground/85 hover:bg-white/[0.04] transition-colors"
                >
                  <LineChart className="h-4 w-4 text-muted-foreground/70" />
                  Full analysis
                </Link>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            aria-label="Voltar para o ticker"
            title="Voltar"
            onClick={() => router.back()}
            className="shrink-0 flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground/85 hover:bg-white/[0.04] hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
        )}

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