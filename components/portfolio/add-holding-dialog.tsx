"use client";

/**
 * AddHoldingDialog — modal pra adicionar ativo a um portfolio.
 *
 * UX:
 *   1. User digita ticker (PETR4, VALE3, ...) — autocomplete via
 *      /api/assets/list?q=<query>
 *   2. Seleciona o ticker da lista
 *   3. Ajusta weight (slider 0-100% em incrementos de 1%)
 *   4. Confirma → POST /api/portfolio/[slug]/holdings
 *      → refresh do SWR no parent
 *
 * Validação client-side + server-side: soma dos weights não pode
 * passar 100%.
 */

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import useSWR from "swr";

import { Skeleton } from "@/components/foundation/skeleton";
import { TickerLogo } from "@/components/foundation/ticker-logo";
import { cn } from "@/lib/utils";

type AssetListItem = {
  symbol: string;
  name: string;
  sector: string;
  type: "stock" | "fii" | "etf" | "crypto";
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  portfolioSlug: string;
  /** Soma atual dos weights em decimal (0-1). */
  currentWeightSum: number;
};

const SUGGESTION_LIMIT = 8;

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

export function AddHoldingDialog({
  open, onClose, onAdded, portfolioSlug, currentWeightSum,
}: Props): JSX.Element | null {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AssetListItem | null>(null);
  const [weightPct, setWeightPct] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Foca o input quando abre.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      // Reset state ao fechar.
      setQuery("");
      setSelected(null);
      setWeightPct(10);
      setError(null);
    }
  }, [open]);

  // Autocomplete: server-side via /api/assets/list?exchange=b3
  const { data: suggestions, isLoading: loadingSuggestions } = useSWR<{
    items: AssetListItem[];
  }>(
    query.length >= 2
      ? `/api/assets/list?exchange=b3&q=${encodeURIComponent(query)}&limit=${SUGGESTION_LIMIT}`
      : null,
    fetchJson,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const remaining = useMemo(() => Math.max(0, 1 - currentWeightSum), [currentWeightSum]);
  const maxPct = Math.min(100, Math.floor(remaining * 100));

  if (!open) return null;

  async function handleSubmit(): Promise<void> {
    if (!selected) {
      setError("Selecione um ticker");
      return;
    }
    if (weightPct <= 0) {
      setError("Weight deve ser maior que 0%");
      return;
    }
    const weight = weightPct / 100;
    if (currentWeightSum + weight > 1.0001) {
      setError(`Soma dos pesos passaria de 100% (max ${(remaining * 100).toFixed(0)}%)`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/portfolio/${portfolioSlug}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selected.symbol, weight }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Erro ${r.status}`);
        return;
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#101116] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
            Adicionar ativo
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-[12px] uppercase tracking-[0.14em] text-muted-foreground/85 font-semibold">
              Ticker
            </label>
            <div className="mt-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" strokeWidth={2} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.toUpperCase());
                  setSelected(null);
                }}
                placeholder="PETR4, VALE3, ITUB4..."
                className={cn(
                  "w-full h-10 pl-9 pr-3 rounded-md",
                  "bg-white/[0.04] border border-white/10",
                  "text-[13px] text-foreground placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:border-white/25 focus:bg-white/[0.06]",
                  "transition-colors",
                )}
                autoComplete="off"
              />
            </div>
            {/* Suggestions */}
            <div className="mt-2 min-h-[44px]">
              {loadingSuggestions ? (
                <div className="space-y-1">
                  <Skeleton className="h-9 w-full" roundedMd />
                  <Skeleton className="h-9 w-3/4" roundedMd />
                </div>
              ) : suggestions && suggestions.items.length > 0 ? (
                <ul className="space-y-1">
                  {suggestions.items.map((it) => (
                    <li key={it.symbol}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(it);
                          setQuery(it.symbol);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md",
                          "hover:bg-white/[0.04] transition-colors",
                          "text-left",
                          selected?.symbol === it.symbol && "bg-white/[0.06]",
                        )}
                      >
                        <TickerLogo symbol={it.symbol} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-foreground tracking-tight">
                            {it.symbol}
                          </div>
                          <div className="text-[11px] text-muted-foreground/70 truncate">
                            {it.name}
                          </div>
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">
                          {it.type}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.length >= 2 ? (
                <p className="text-[12px] text-muted-foreground/70 px-2 py-2">
                  Nenhum ativo encontrado.
                </p>
              ) : (
                <p className="text-[12px] text-muted-foreground/60 px-2 py-2">
                  Digite pelo menos 2 letras.
                </p>
              )}
            </div>
          </div>

          {/* Selected ticker (chip) */}
          {selected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08]">
              <TickerLogo symbol={selected.symbol} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-foreground tracking-tight">
                  {selected.symbol}
                </div>
                <div className="text-[11px] text-muted-foreground/70 truncate">
                  {selected.name}
                </div>
              </div>
            </div>
          )}

          {/* Weight slider */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[12px] uppercase tracking-[0.14em] text-muted-foreground/85 font-semibold">
                Peso no portfolio
              </label>
              <div className="text-[14px] font-semibold tabular-nums text-foreground">
                {weightPct}%
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={Math.max(1, maxPct)}
              step={1}
              value={weightPct}
              onChange={(e) => setWeightPct(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/70 tabular-nums">
              <span>1%</span>
              <span>
                Restante: {(remaining * 100).toFixed(0)}% disponível
              </span>
              <span>{Math.max(1, maxPct)}%</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-[#d84f68]/10 border border-[#d84f68]/30 px-3 py-2 text-[12px] text-[#d84f68]">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center h-9 px-3 rounded-md text-[12px] font-medium text-muted-foreground/85 hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className={cn(
              "inline-flex items-center h-9 px-4 rounded-md",
              "bg-[var(--primary)] text-[#070709]",
              "text-[13px] font-semibold",
              "hover:opacity-90 transition-opacity cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
