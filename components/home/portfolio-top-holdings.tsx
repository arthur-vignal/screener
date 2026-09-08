"use client";

/**
 * PortfolioTopHoldings — lista compacta top-3 holdings do portfolio
 * (card "Carteira" da /home).
 *
 * Ordenação configurável via dropdown:
 *   - "24h var"   → por `changePercent` DESC (top 3 que mais subiram hoje)
 *   - "Alocação"  → por `weight` DESC       (top 3 com maior fatia)
 *
 * Cada row: ticker chip (cor da marca) + nome + preço + chip de
 * variação (24h) OU peso (alocação).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, ChevronDown } from "lucide-react";

import { TickerLogo } from "@/components/foundation/ticker-logo";
import { cn } from "@/lib/utils";

export type TopHolding = {
  symbol: string;
  longName?: string | null;
  price: number | null;
  changePercent: number | null;
  weight: number;
};

type Filter = "24h" | "alocacao";

type Props = {
  holdings: TopHolding[];
  className?: string;
};

const FILTER_LABEL: Record<Filter, string> = {
  "24h": "24h var",
  alocacao: "Alocação",
};

export function PortfolioTopHoldings({
  holdings,
  className,
}: Props): JSX.Element | null {
  const [filter, setFilter] = useState<Filter>("24h");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Click-outside + Escape (mesma skill do header do /portfolio)
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
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

  const top3 = useMemo(() => {
    const sorted = [...holdings];
    if (filter === "24h") {
      sorted.sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
    } else {
      sorted.sort((a, b) => b.weight - a.weight);
    }
    return sorted.slice(0, 3);
  }, [holdings, filter]);

  if (holdings.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Header — label + dropdown */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Top holdings
        </span>
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "inline-flex items-center gap-1 h-6 px-2 rounded-md",
              "bg-white/[0.04] border border-white/10",
              "text-[11px] font-medium text-foreground",
              "hover:bg-white/[0.08] hover:border-white/20 transition-colors"
            )}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {FILTER_LABEL[filter]}
            <ChevronDown className="h-3 w-3" strokeWidth={2} />
          </button>
          {open && (
            <div
              ref={menuRef}
              role="menu"
              className={cn(
                "absolute right-0 top-7 z-30 min-w-[120px]",
                "rounded-md bg-[#101116]/95 backdrop-blur-md border border-white/10",
                "shadow-2xl overflow-hidden"
              )}
            >
              {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="menuitemradio"
                  aria-checked={filter === f}
                  onClick={() => {
                    setFilter(f);
                    setOpen(false);
                  }}
                  className={cn(
                    "block w-full text-left px-3 py-1.5 text-[12px]",
                    "hover:bg-white/[0.06] transition-colors",
                    filter === f
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {FILTER_LABEL[f]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ul className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
        {top3.map((h) => (
          <HoldingRow key={h.symbol} h={h} filter={filter} />
        ))}
      </ul>
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function HoldingRow({
  h,
  filter,
}: {
  h: TopHolding;
  filter: Filter;
}): JSX.Element {
  const positive =
    h.changePercent != null && h.changePercent >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  const colorClass =
    h.changePercent == null
      ? "text-muted-foreground"
      : positive
        ? "text-[var(--positive)]"
        : "text-[var(--negative)]";

  return (
    <li>
      <Link
        href={`/asset/${h.symbol}`}
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
      >
        <TickerLogo symbol={h.symbol} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-foreground tracking-tight truncate">
            {h.symbol}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[12px] tabular-nums font-semibold text-foreground">
            {h.price != null
              ? h.price.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "—"}
          </div>
          <div className={cn("inline-flex items-center gap-0.5 text-[10.5px] tabular-nums font-semibold", colorClass)}>
            {filter === "24h" ? (
              <>
                {h.changePercent != null && <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />}
                {h.changePercent != null
                  ? `${positive ? "+" : "−"}${Math.abs(h.changePercent).toFixed(2)}%`
                  : "—"}
              </>
            ) : (
              <span className="text-muted-foreground font-semibold">
                {(h.weight * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}