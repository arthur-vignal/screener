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

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import useSWR from "swr";
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

const TABS = [
  { id: "stock", label: "Ações" },
  { id: "etf", label: "ETFs" },
  { id: "bdr", label: "BDRs" },
  { id: "fii", label: "FIIs" },
] as const;

export function MarketWidget() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("stock");

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
    <div className="rounded-2xl border border-border bg-card overflow-hidden h-full flex flex-col">
      {/* Header + filter pills */}
      <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Mercado B3
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            maiores variações
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "cursor-pointer px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.10em] transition-all",
                active === t.id
                  ? "bg-foreground/10 text-foreground border border-foreground/20"
                  : "border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
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
    </div>
  );
}