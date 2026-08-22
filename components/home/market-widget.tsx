"use client";

/**
 * MarketWidget — Fey-style B3 market overview card.
 *
 * Header: 'Mercado B3' subtitle + tab pills (Acoes / ETFs / BDRs / FIIs).
 * Table: top 10 movers in the active category, columns:
 *   ativo | setor | 24h | 7d | 30d | volume | marketcap.
 * Row click navigates to /asset/[symbol].
 *
 * Data: /api/assets/list?exchange=b3&limit=200 + /api/assets/quote
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import useSWR from "swr";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { MetallicCard } from "@/components/ui/metallic-card";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AssetRow = {
  symbol: string;
  name: string;
  type: string;
  sector: string;
  market: string;
};

type QuoteRow = {
  symbol: string;
  sector: string;
  quote: {
    price: number;
    changePercent: number;
    changePercent7d?: number | null;
    changePercent30d?: number | null;
    volume: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  } | null;
  metrics?: {
    marketCap?: number | null;
  } | null;
};

/**
 * Format a BRL/USD market cap as a short, compact label.
 * - < 1B  -> "987M" (1 decimal)
 * - >= 1B -> "234B" (no decimals; finance convention)
 * - >= 1T -> "1.2T" (1 decimal)
 */
function formatMarketCap(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return String(Math.round(value));
}

const MARKETS = [
  { id: "stock", label: "Ações" },
  { id: "etf", label: "ETFs" },
  { id: "bdr", label: "BDRs" },
  { id: "fii", label: "FIIs" },
] as const;

const PAGE_SIZE = 20;

export function MarketWidget() {
  const [active, setActive] = useState<(typeof MARKETS)[number]["id"]>("stock");
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const ddRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside / Escape.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        if (searchOpen) {
          setSearchOpen(false);
          setQuery("");
        }
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, searchOpen]);

  // Focus the search input when search opens.
  useEffect(() => {
    if (searchOpen) {
      // small delay so the AnimatePresence has time to mount
      const t = setTimeout(() => searchRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Reset paging when market filter or search query changes.
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
    if (listScrollRef.current) listScrollRef.current.scrollTop = 0;
  }, [active, query]);

  const { data: listData } = useSWR<{ items: AssetRow[] }>(
    `/api/assets/list?exchange=b3&limit=500`,
    fetcher,
  );

  const allOfType = useMemo(
    () => (listData?.items ?? []).filter((r) => r.type === active),
    [listData, active],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOfType;
    return allOfType.filter(
      (r) =>
        r.symbol.toLowerCase().includes(q) ||
        (r.name ?? "").toLowerCase().includes(q),
    );
  }, [allOfType, query]);

  const visible = filtered.slice(0, displayCount);
  // Fetch quotes for the FULL filtered set (current type + current search
  // query), not just the visible window. SWR keys on the URL which includes
  // the full symbols list, so once a query returns the data is reused as
  // the user scrolls. Only typing a new query (which narrows the set)
  // triggers a refetch; widening back to no query reuses the cache too.
  const symbols = filtered.map((r) => r.symbol).join(",");
  const hasMore = displayCount < filtered.length;

  // Infinite scroll: when sentinel intersects viewport, load next page.
  // Re-runs every time displayCount changes so the observer attaches to
  // the freshly-mounted sentinel <li> (motion.ul key remounts it).
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    const root = listScrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setDisplayCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
          }
        }
      },
      { root, rootMargin: "0px 0px 400px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filtered.length, displayCount]);

  const { data: quotesData } = useSWR<{ rows: QuoteRow[] }>(
    symbols ? `/api/assets/quote?symbols=${symbols}` : null,
    fetcher,
  );

  const quotes = new Map(
    (quotesData?.rows ?? []).map((q) => [q.symbol, q]),
  );

  return (
    <MetallicCard className="h-full">
      {/* Header: title + actions (search + market dropdown) */}
      <div className="px-2 pt-5 pb-3 border-b border-border flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-foreground/90 shrink-0">
          Cotações oficiais
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {/* Inline search: icon button expands into an input */}
          <div className="relative flex items-center justify-end">
            <AnimatePresence initial={false} mode="wait">
              {!searchOpen ? (
                <motion.button
                  key="search-icon"
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Buscar ativo"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="cursor-pointer inline-flex items-center justify-center h-7 w-7 rounded-full border border-border bg-foreground/5 hover:bg-foreground/10 transition-colors text-foreground"
                >
                  <Search className="h-3.5 w-3.5" />
                </motion.button>
              ) : (
                <motion.div
                  key="search-input"
                  initial={{ width: 32, opacity: 0 }}
                  animate={{ width: 200, opacity: 1 }}
                  exit={{ width: 32, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border bg-foreground/5 overflow-hidden"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar ticker..."
                    className="flex-1 min-w-0 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Limpar busca"
                      className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        <div className="relative" ref={ddRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] tracking-wide",
              "border border-border bg-foreground/5 hover:bg-foreground/10 transition-colors text-foreground",
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="font-medium">{MARKETS.find((m) => m.id === active)?.label}</span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="inline-flex"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.span>
          </button>
          <AnimatePresence>
            {open && (
              <motion.ul
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[140px] py-1 rounded-xl border border-white/10 backdrop-blur-md"
                style={{
                  background: "rgba(15,15,18,0.92)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
                role="listbox"
              >
                {MARKETS.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active === m.id}
                      onClick={() => {
                        setActive(m.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3.5 py-2 text-[12px] cursor-pointer transition-colors",
                        active === m.id
                          ? "text-foreground bg-foreground/5"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                      )}
                    >
                      <span>{m.label}</span>
                      {active === m.id && (
                        <Check className="h-3.5 w-3.5 text-foreground/80" />
                      )}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

      {/* Table — scrollable body with sticky header. Scrollbar hidden. */}
      <div
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        ref={listScrollRef}
      >
        <div className="sticky top-0 z-10 grid grid-cols-[1.5fr_0.55fr_0.55fr_0.55fr_0.7fr_0.7fr] gap-3 px-2 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <span>Ativo · Setor</span>
          <span className="text-right">24h</span>
          <span className="text-right">7d</span>
          <span className="text-right">30d</span>
          <span className="text-right">Vol</span>
          <span className="text-right">Mkt Cap</span>
        </div>
        <motion.ul
key={active + ":" + query + ":" + visible.length}
        >
          {/* No parent variants — children animate themselves via
              initial/animate below. Otherwise the ul runs its
              hidden->show transition on SSR with 0 children and
              the new li that mount after SWR resolves never get
              animated. */}
          {visible.map((row, idx) => {
            const q = quotes.get(row.symbol)?.quote;
            const ch = q?.changePercent ?? 0;
            const ch7 = q?.changePercent7d ?? null;
            const ch30 = q?.changePercent30d ?? null;
            return (
              <motion.li
                key={row.symbol}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Link
                  href={`/asset/${row.symbol}`}
                  className="grid grid-cols-[1.5fr_0.55fr_0.55fr_0.55fr_0.7fr_0.7fr] gap-3 px-2 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[22px] font-semibold text-foreground truncate">
                      {row.symbol.replace(/\d$/, "")}
                      <span className="text-muted-foreground ml-1">
                        {row.symbol.match(/\d$/)?.[0]}
                      </span>
                    </p>
                    <p className="text-[12px] text-muted-foreground truncate">
                      {row.sector || "—"}
                    </p>
                  </div>
                  <p
                    className="text-[16px] tabular-nums text-right"
                    style={{ color: ch >= 0 ? "#10b981" : "#f43f5e" }}
                  >
                    {q ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "—"}
                  </p>
                  <p
                    className="text-[12px] tabular-nums text-right"
                    style={{ color: ch7 == null ? undefined : ch7 >= 0 ? "#10b981" : "#f43f5e" }}
                  >
                    {ch7 == null ? "—" : `${ch7 >= 0 ? "+" : ""}${ch7.toFixed(2)}%`}
                  </p>
                  <p
                    className="text-[12px] tabular-nums text-right"
                    style={{ color: ch30 == null ? undefined : ch30 >= 0 ? "#10b981" : "#f43f5e" }}
                  >
                    {ch30 == null ? "—" : `${ch30 >= 0 ? "+" : ""}${ch30.toFixed(2)}%`}
                  </p>
                  <p className="text-[16px] tabular-nums text-right text-muted-foreground">
                    {q?.volume != null && q.volume > 0
                      ? `${(q.volume / 1_000_000).toFixed(2)}M`
                      : "—"}
                  </p>
                  <p className="text-[16px] tabular-nums text-right text-muted-foreground">
                    {quotes.get(row.symbol)?.metrics?.marketCap != null
                      ? formatMarketCap(quotes.get(row.symbol)!.metrics!.marketCap!)
                      : "—"}
                  </p>
                </Link>
              </motion.li>
            );
          })}
          {hasMore && (
            <li
              ref={sentinelRef}
              className="text-center py-3 text-[11px] text-muted-foreground/60"
            >
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                Carregando mais...
              </motion.span>
            </li>
          )}
        </motion.ul>
        {filtered.length === 0 && (
          <p className="text-center text-[12px] text-muted-foreground py-8">
            {query
              ? `Nenhum resultado para “${query}”.`
              : "Sem dados para esta categoria."}
          </p>
        )}
      </div>
    </MetallicCard>
  );
}