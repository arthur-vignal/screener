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

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import useSWR from "swr";
import { ChevronDown, Check } from "lucide-react";
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
    volume: number;
    marketCap?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  } | null;
};

const MARKETS = [
  { id: "stock", label: "Ações" },
  { id: "etf", label: "ETFs" },
  { id: "bdr", label: "BDRs" },
  { id: "fii", label: "FIIs" },
] as const;

export function MarketWidget() {
  const [active, setActive] = useState<(typeof MARKETS)[number]["id"]>("stock");
  const [open, setOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside / Escape.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { data: listData } = useSWR<{ items: AssetRow[] }>(
    `/api/assets/list?exchange=b3&limit=200`,
    fetcher,
  );

  const filtered = (listData?.items ?? [])
    .filter((r) => r.type === active)
    .slice(0, 10);
  const symbols = filtered.map((r) => r.symbol).join(",");

  const { data: quotesData } = useSWR<{ rows: QuoteRow[] }>(
    symbols ? `/api/assets/quote?symbols=${symbols}` : null,
    fetcher,
  );

  const quotes = new Map(
    (quotesData?.rows ?? []).map((q) => [q.symbol, q]),
  );

  return (
    <MetallicCard className="h-full">
      {/* Header: title + dropdown */}
      <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-foreground/90">
          Cotações oficiais
        </p>
        <div className="relative shrink-0" ref={ddRef}>
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

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-[1.5fr_0.55fr_0.55fr_0.55fr_0.7fr] gap-3 px-6 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 border-b border-border/60">
          <span>Ativo · Setor</span>
          <span className="text-right">24h</span>
          <span className="text-right">7d</span>
          <span className="text-right">30d</span>
          <span className="text-right">Vol</span>
        </div>
        <motion.ul
          key={active}
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.04 } },
          }}
        >
          {filtered.map((row) => {
            const q = quotes.get(row.symbol)?.quote;
            const ch = q?.changePercent ?? 0;
            return (
              <motion.li
                key={row.symbol}
                variants={{
                  hidden: { opacity: 0, x: -8 },
                  show: { opacity: 1, x: 0 },
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Link
                  href={`/asset/${row.symbol}`}
                  className="grid grid-cols-[1.5fr_0.55fr_0.55fr_0.55fr_0.7fr] gap-3 px-6 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground truncate">
                      {row.symbol.replace(/\d$/, "")}
                      <span className="text-muted-foreground ml-1">
                        {row.symbol.match(/\d$/)?.[0]}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {row.sector || "—"}
                    </p>
                  </div>
                  <p
                    className="text-[12.5px] tabular-nums text-right"
                    style={{ color: ch >= 0 ? "#10b981" : "#f43f5e" }}
                  >
                    {q ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "—"}
                  </p>
                  <p className="text-[12px] tabular-nums text-right text-muted-foreground">
                    —
                  </p>
                  <p className="text-[12px] tabular-nums text-right text-muted-foreground">
                    —
                  </p>
                  <p className="text-[12px] tabular-nums text-right text-muted-foreground">
                    {q?.volume
                      ? `${(q.volume / 1_000_000).toFixed(0)}M`
                      : "—"}
                  </p>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
        {filtered.length === 0 && (
          <p className="text-center text-[12px] text-muted-foreground py-8">
            Sem dados para esta categoria.
          </p>
        )}
      </div>
    </MetallicCard>
  );
}