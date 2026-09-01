"use client";

/**
 * AssetHeader — header da página /asset/[symbol] (estilo Fey TSLA).
 *
 * Layout:
 *   [←] [logo] PETR4                       [Analyze] [▼] [☐]
 *         Energia                          3 ícones (analyze, dropdown, bookmark)
 *         Petrobras ...
 *
 * Seta esquerda:
 *   - root:      <Link href="/home"> simples (sem dropdown).
 *   - analysis:  router.back() (volta pra raiz).
 *   - raw-data:  router.back() (volta pra raiz).
 *
 * Dropdown ao lado do botão "Analyze" (seta ChevronDown):
 *   - Root só. Acesso rápido a rotas secundárias (Raw data).
 *   - Click-outside + Escape fecha.
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
   *   - root:      <Link href="/home">
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
          <Link
            href="/home"
            aria-label="Voltar para a home"
            title="Voltar"
            className="shrink-0 flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground/85 hover:bg-white/[0.04] hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
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

        {variant === "root" && <MoreMenu symbol={symbol} />}

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

// ─── Dropdown "More" (seta ao lado de Analyze) ───────────────────────────────

/**
 * Botão de seta que abre dropdown com rotas secundárias (Raw data, etc).
 * Aparece só na raiz (`variant === "root"`). Estilo: h-8 w-8 quadrado
 * (mesma altura/raio do Analyze, padrão button radius do design system).
 */
function MoreMenu({ symbol }: { symbol: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-white/[0.04] border border-white/10 text-foreground hover:bg-white/[0.08] hover:border-white/20 transition-colors cursor-pointer"
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {open && (
        <div
          ref={ref}
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[200px] rounded-xl border border-white/10 bg-[#101116]/95 shadow-2xl shadow-black/40 backdrop-blur-md p-1.5"
        >
          <Link
            href={`/asset/${symbol}/raw-data`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-foreground/85 hover:bg-white/[0.04] transition-colors"
          >
            <FileText className="h-4 w-4 text-muted-foreground/70" />
            Raw data
          </Link>
          <Link
            href={`/asset/${symbol}/analysis`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-foreground/85 hover:bg-white/[0.04] transition-colors"
          >
            <LineChart className="h-4 w-4 text-muted-foreground/70" />
            Full analysis
          </Link>
        </div>
      )}
    </div>
  );
}