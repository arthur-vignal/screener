"use client";

/**
 * AddHoldingDialog — modal pra adicionar posição a um portfolio.
 *
 * Modelo novo (migration 0006): posição tem `qty` + `avg_price` +
 * `purchased_at` (sem slider de weight).
 *
 * UX:
 *   1. User digita ticker (PETR4, VALE3, ...) — autocomplete via
 *      /api/assets/list?q=<query>
 *   2. Seleciona o ticker da lista
 *   3. Escolhe data/hora da compra (`<input type="datetime-local">`)
 *   4. Sistema busca automaticamente o candle mais próximo via brapi
 *      e preenche `avg_price`. User pode editar manualmente.
 *   5. User digita `qty` (quantidade de ações)
 *   6. Confirma → POST /api/portfolio/[slug]/holdings
 *
 * Sem limite de soma — não tem "soma dos pesos" como no modelo weight.
 *
 * Se o dialog é aberto a partir do `/portfolio/new` (deep link via
 * `?add=1`), mostra o título "Adicionar primeiro ativo" e CTA mais
 * destacado (botão primário azul em vez de secundário).
 */

import { Calendar, Search, X, Loader2, Sparkles } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  /** True se aberto a partir do /portfolio/new (deep link). */
  isFirstHolding?: boolean;
};

const SUGGESTION_LIMIT = 8;

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

/** Converte Date → string `YYYY-MM-DDTHH:MM` no timezone local do browser. */
function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converte string `YYYY-MM-DDTHH:MM` → Date no timezone local. */
function fromLocalDatetimeValue(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Date → unix seconds. */
function toUnixSec(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

export function AddHoldingDialog({
  open,
  onClose,
  onAdded,
  portfolioSlug,
  isFirstHolding = false,
}: Props): JSX.Element | null {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AssetListItem | null>(null);
  // Default: agora (round minute pra baixo pra UX).
  const [purchasedAt, setPurchasedAt] = useState<Date>(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  });
  const [avgPrice, setAvgPrice] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [priceAutoFilled, setPriceAutoFilled] = useState(false);
  const [priceFetching, setPriceFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Foca o input quando abre + reset state quando fecha.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setSelected(null);
      setPurchasedAt(() => {
        const now = new Date();
        now.setSeconds(0, 0);
        return now;
      });
      setAvgPrice("");
      setQty("");
      setPriceAutoFilled(false);
      setPriceFetching(false);
      setError(null);
    }
  }, [open]);

  // Autocomplete: server-side via /api/assets/list
  const { data: suggestions, isLoading: loadingSuggestions } = useSWR<{
    items: AssetListItem[];
  }>(
    query.length >= 2 && !selected
      ? `/api/assets/list?exchange=b3&q=${encodeURIComponent(query)}&limit=${SUGGESTION_LIMIT}`
      : null,
    fetchJson,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  // Auto-preenche avg_price quando user seleciona ticker OU muda a data.
  // Cancela requisição antiga se user muda tudo rápido (race condition).
  const fetchPrice = useCallback(
    async (symbol: string, at: Date, signal: AbortSignal): Promise<void> => {
      setPriceFetching(true);
      setPriceAutoFilled(false);
      try {
        // /api/asset/[symbol]/candles aceita range=24h, 7d, 3m, ytd, 1y, 5y.
        // Estratégia: pra datas recentes (< 7 dias), usa 7d (pega intraday 5m).
        // Pra datas mais antigas, usa 1y (pega daily) — cobre tudo com
        // razoável precisão.
        const daysAgo = (Date.now() - at.getTime()) / 86_400_000;
        const range = daysAgo <= 7 ? "7d" : "1y";
        const r = await fetch(
          `/api/asset/${encodeURIComponent(symbol)}/candles?range=${range}`,
          { signal, cache: "no-store" },
        );
        if (!r.ok) return;
        const data = (await r.json()) as {
          candles: Array<{ timestamp: number; close: number }>;
        };
        const candles = data.candles ?? [];
        if (candles.length === 0) return;
        const targetTs = at.getTime();
        // Binary search do candle mais próximo.
        const closest = findClosest(candles, targetTs);
        if (!closest) return;
        // Rejeita se a distância for > 30 dias (ticker novo ou data muito
        // antiga). Deixa o user digitar manualmente.
        const distDays = Math.abs(closest.timestamp - targetTs) / 86_400_000;
        if (distDays > 30) return;
        setAvgPrice(closest.close.toFixed(2));
        setPriceAutoFilled(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      } finally {
        if (!signal.aborted) setPriceFetching(false);
      }
    },
    [],
  );

  // Quando ticker OU data muda, dispara fetchPrice.
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void fetchPrice(selected.symbol, purchasedAt, controller.signal);
    return () => controller.abort();
  }, [selected, purchasedAt, fetchPrice]);

  // Computed: valor total estimado da posição (qty × avg_price).
  const estimatedValue = useMemo(() => {
    const q = Number(qty);
    const p = Number(avgPrice);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) {
      return null;
    }
    return q * p;
  }, [qty, avgPrice]);

  if (!open) return null;

  async function handleSubmit(): Promise<void> {
    if (!selected) {
      setError("Selecione um ticker");
      return;
    }
    const qtyNum = Number(qty);
    const priceNum = Number(avgPrice);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError("Quantidade deve ser maior que zero");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Preço médio deve ser maior que zero");
      return;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const purchasedSec = toUnixSec(purchasedAt);
    if (purchasedSec > nowSec) {
      setError("Data de compra não pode ser no futuro");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/portfolio/${portfolioSlug}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selected.symbol,
          qty: qtyNum,
          avg_price: priceNum,
          purchased_at: purchasedSec,
        }),
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
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
              {isFirstHolding ? "Adicionar primeiro ativo" : "Adicionar ativo"}
            </h2>
            {isFirstHolding && (
              <p className="mt-0.5 text-[12px] text-muted-foreground/70">
                Registre sua primeira compra pra começar a acompanhar o portfolio.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Ticker autocomplete */}
          <Field
            label="Ticker"
            required
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" strokeWidth={2} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.toUpperCase());
                  setSelected(null);
                  setAvgPrice("");
                  setPriceAutoFilled(false);
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
            {!selected && (
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
                            "hover:bg-white/[0.04] transition-colors text-left",
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
            )}
            {selected && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08]">
                <TickerLogo symbol={selected.symbol} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-foreground tracking-tight">
                    {selected.symbol}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 truncate">
                    {selected.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setQuery("");
                    setAvgPrice("");
                  }}
                  className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground/70 hover:bg-white/[0.06] hover:text-foreground transition-colors"
                  aria-label="Trocar ticker"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
            )}
          </Field>

          {/* Data/hora da compra */}
          <Field
            label="Data e hora da compra"
            required
          >
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" strokeWidth={2} />
              <input
                type="datetime-local"
                value={toLocalDatetimeValue(purchasedAt)}
                onChange={(e) => {
                  const d = fromLocalDatetimeValue(e.target.value);
                  if (d) setPurchasedAt(d);
                }}
                max={toLocalDatetimeValue(new Date())}
                className={cn(
                  "w-full h-10 pl-9 pr-3 rounded-md",
                  "bg-white/[0.04] border border-white/10",
                  "text-[13px] text-foreground",
                  "[color-scheme:dark]",
                  "focus:outline-none focus:border-white/25 focus:bg-white/[0.06]",
                  "transition-colors tabular-nums",
                )}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              Não pode ser no futuro. Aceita data e hora.
            </p>
          </Field>

          {/* Preço médio */}
          <Field
            label="Preço médio (R$)"
            required
            rightSlot={
              priceFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" strokeWidth={2} />
              ) : priceAutoFilled ? (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
                  <Sparkles className="h-3 w-3" strokeWidth={2} />
                  brapi
                </span>
              ) : null
            }
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground/70">
                R$
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={avgPrice}
                onChange={(e) => {
                  setAvgPrice(e.target.value);
                  setPriceAutoFilled(false);
                }}
                placeholder={priceFetching ? "buscando…" : "0,00"}
                className={cn(
                  "w-full h-10 pl-10 pr-3 rounded-md",
                  "bg-white/[0.04] border border-white/10",
                  "text-[13px] text-foreground placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:border-white/25 focus:bg-white/[0.06]",
                  "transition-colors tabular-nums",
                )}
              />
            </div>
            {priceAutoFilled && (
              <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                Preenchido automaticamente com o candle mais próximo. Ajuste se quiser.
              </p>
            )}
          </Field>

          {/* Quantidade */}
          <Field label="Quantidade" required>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="100"
              className={cn(
                "w-full h-10 px-3 rounded-md",
                "bg-white/[0.04] border border-white/10",
                "text-[13px] text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:border-white/25 focus:bg-white/[0.06]",
                "transition-colors tabular-nums",
              )}
            />
          </Field>

          {/* Valor estimado da posição */}
          {estimatedValue != null && (
            <div className="rounded-md bg-white/[0.03] border border-white/[0.06] px-3 py-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
                Valor estimado
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                {estimatedValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

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
            {isFirstHolding ? "Adicionar depois" : "Cancelar"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting || priceFetching}
            className={cn(
              "inline-flex items-center h-9 px-4 rounded-md",
              isFirstHolding
                ? "bg-[var(--primary)] text-[#070709]"
                : "bg-[var(--primary)] text-[#070709]",
              "text-[13px] font-semibold",
              "hover:opacity-90 transition-opacity cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" strokeWidth={2.5} />
                Adicionando…
              </>
            ) : isFirstHolding ? (
              "Adicionar primeiro ativo"
            ) : (
              "Adicionar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  rightSlot,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-[12px] uppercase tracking-[0.14em] text-muted-foreground/85 font-semibold">
          {label}
          {required && <span className="text-[#d84f68] ml-1">*</span>}
        </label>
        {rightSlot}
      </div>
      {hint && (
        <p className="mt-1 text-[12px] text-muted-foreground/70 leading-relaxed">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Binary search do candle mais próximo de `targetMs`. Candles ASC. */
function findClosest(
  candles: Array<{ timestamp: number; close: number }>,
  targetMs: number,
): { timestamp: number; close: number } | null {
  if (candles.length === 0) return null;
  if (targetMs <= candles[0]!.timestamp) return candles[0]!;
  if (targetMs >= candles[candles.length - 1]!.timestamp) {
    return candles[candles.length - 1]!;
  }
  let lo = 0;
  let hi = candles.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = candles[mid]!;
    if (c.timestamp === targetMs) return c;
    if (c.timestamp < targetMs) lo = mid + 1;
    else hi = mid - 1;
  }
  const before = candles[lo - 1]!;
  const after = candles[lo]!;
  const distBefore = targetMs - before.timestamp;
  const distAfter = after.timestamp - targetMs;
  return distBefore <= distAfter ? before : after;
}