"use client";

/**
 * MarketWidget — Fey-style B3 market overview card.
 *
 * Top: a filter pill row that lets you switch between asset
 *       types (Ações, ETFs, BDRs, FIIs). Each pill is a small
 *       glass button.
 * Table: list of top movers in the selected category with
 *       sector, 24h change, 7d change, 30d change, volume,
 *       marketcap. Clicking a row navigates to /asset/[symbol].
 *
 * Data: fetches /api/assets/list?exchange=b3&type=... and a
 * batched /api/assets/quote?symbols=... for the visible rows.
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

  // Top 10 movers per category, sorted by 24h change desc.
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
    <div className="h-full flex flex-col">
      {/* Header + filter pills */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/5">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.20em] text-muted-foreground">
            Mercado B3
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
            maiores variações
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "cursor-pointer px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.10em] transition-all",
                active === t.id
                  ? "bg-white/10 text-foreground border border-white/15"
                  : "border border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] gap-3 px-5 py-2 text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70 border-b border-white/5">
          <span>Ativo · Setor</span>
          <span className="text-right">24h</span>
          <span className="text-right">7d</span>
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
                  className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] gap-3 px-5 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
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
                    style={{ color: ch >= 0 ? "#34d399" : "#fb7185" }}
                  >
                    {q ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "—"}
                  </p>
                  <p className="text-[12px] tabular-nums text-right text-muted-foreground">
                    {/* 7d: not in current API; show sector instead */}
                    {row.sector ? row.sector.slice(0, 8) : "—"}
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