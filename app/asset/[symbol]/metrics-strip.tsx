"use client";

/**
 * MetricsStrip — horizontal strip of fundamentals below the chart.
 *
 * Each tile is a link that drills down into the dedicated stats page
 * for its metric group:
 *   - valuation       → /asset/[symbol]/valuation
 *   - profitability  → /asset/[symbol]/profitability
 *   - income         → /asset/[symbol]/income
 *   - balance-sheet  → /asset/[symbol]/balance-sheet
 *   - cashflow       → /asset/[symbol]/cashflow
 *   - financial-health → /asset/[symbol]/financial-health
 *   - growth         → /asset/[symbol]/growth
 *   - about          → /asset/[symbol]/about
 *
 * Tiles within the same group are visually grouped (no divider between
 * them, divider before the next group). The "Sobre" tile stays as a
 * final cell pointing at the company-profile page.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { compactBRL, formatMultiple, formatPercent, formatNumber } from "@/lib/format";

type Metrics = {
  sector: string;
  marketCap: number | null;
  trailingPE: number | null;
  returnOnEquity: number | null;
  ebitda: number | null;
  freeCashflow: number | null;
  dividendYield: number | null;
};

type Quote = {
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
};

type Group = "valuation" | "profitability" | "income" | "financial-health" | "growth" | "risk" | "cashflow" | "dividends" | "about";

type Tile = {
  label: string;
  value: number | string | null;
  kind:
    | "text"
    | "multiple"
    | "percent"
    | "percent-conditional"
    | "compact";
  group: Group;
  href: (symbol: string) => string;
  showOnlyIfPositive?: boolean;
};

export function MetricsStrip({
  symbol,
  currency,
  metrics,
  quote,
  loading,
}: {
  symbol: string;
  currency: string;
  metrics: Metrics | null;
  quote: Quote | null;
  loading: boolean;
}) {
  const tiles: Tile[] = [
    // ── Valuation group ──────────────────────────────────────────
    {
      label: "P/E",
      value: metrics?.trailingPE ?? null,
      kind: "multiple",
      group: "valuation",
      href: (s) => `/asset/${s}/valuation`,
    },
    {
      label: "Market cap",
      value: (metrics?.marketCap ?? quote?.marketCap) ?? null,
      kind: "compact",
      group: "valuation",
      href: (s) => `/asset/${s}/valuation`,
    },
    {
      label: "52w range",
      value: quote?.fiftyTwoWeekLow != null && quote?.fiftyTwoWeekHigh != null
        ? `${quote.fiftyTwoWeekLow.toFixed(2)}–${quote.fiftyTwoWeekHigh.toFixed(2)}`
        : null,
      kind: "text",
      group: "valuation",
      href: (s) => `/asset/${s}/valuation`,
    },
    // ── Profitability group ──────────────────────────────────────
    {
      label: "ROE",
      value: metrics?.returnOnEquity ?? null,
      kind: "percent",
      group: "profitability",
      href: (s) => `/asset/${s}/profitability`,
    },
    {
      label: "EBITDA",
      value: metrics?.ebitda ?? null,
      kind: "compact",
      group: "profitability",
      href: (s) => `/asset/${s}/profitability`,
    },
    {
      label: "Free cash flow",
      value: metrics?.freeCashflow ?? null,
      kind: "compact",
      group: "profitability",
      href: (s) => `/asset/${s}/profitability`,
    },
    {
      label: "Dividend yield",
      value: metrics?.dividendYield ?? null,
      kind: "percent-conditional",
      group: "profitability",
      href: (s) => `/asset/${s}/profitability`,
      showOnlyIfPositive: true,
    },
    // ── About ────────────────────────────────────────────────────
    {
      label: "Setor",
      value: metrics?.sector ?? null,
      kind: "text",
      group: "about",
      href: (s) => `/asset/${s}/about`,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.12 }}
      className="mt-5"
    >
      <div className="px-1 pb-2 flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60">
          Métricas
        </h2>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/40">
          {currency}
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {tiles.map((tile, idx) => {
            const prevGroup = idx > 0 ? tiles[idx - 1].group : null;
            const isNewGroup = tile.group !== prevGroup;
            const showDivider = idx > 0 && isNewGroup;
            return (
              <MetricCell
                key={tile.label}
                tile={tile}
                symbol={symbol}
                currency={currency}
                loading={loading}
                divider={showDivider}
              />
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

function MetricCell({
  tile,
  symbol,
  currency,
  loading,
  divider,
}: {
  tile: Tile;
  symbol: string;
  currency: string;
  loading: boolean;
  divider: boolean;
}) {
  const value = tile.value;

  // Hide dividend yield tile if value is null/0 (issuer doesn't pay).
  if (tile.kind === "percent-conditional") {
    const num = typeof value === "number" ? value : null;
    if (num == null || num <= 0) return null;
  }

  const display = formatValue(tile, currency, loading);

  return (
    <Link
      href={tile.href(symbol)}
      className={
        "group relative px-4 py-4 sm:py-5 transition-colors hover:bg-foreground/[0.04] " +
        (divider
          ? "border-t border-border/40 sm:border-t-0 sm:border-l border-border/40 "
          : "")
      }
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {tile.label}
        </p>
        <ChevronRight className="h-3 w-3 -mb-0.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="mt-1.5 text-[15px] md:text-[16px] font-medium tabular-nums truncate">
        {display}
      </p>
    </Link>
  );
}

function formatValue(tile: Tile, currency: string, loading: boolean): string {
  if (loading) return "—";
  const v = tile.value;
  if (v == null || v === "" || (typeof v === "number" && !Number.isFinite(v))) return "—";
  // Usa o formatador central de lib/format.ts pra garantir unidade consistente.
  switch (tile.kind) {
    case "text":
      return String(v);
    case "multiple":
      return typeof v === "number" ? formatMultiple(v) : "—";
    case "percent":
      return typeof v === "number" ? formatPercent(v, { decimals: 2 }) : "—";
    case "percent-conditional":
      return typeof v === "number" ? formatPercent(v, { decimals: 2 }) : "—";
    case "compact":
      return typeof v === "number" ? compactBRL(v) : "—";
    default:
      return String(v);
  }
}

function formatCompact(v: number, currency: string): string {
  if (v >= 1e12) return `${prefix(currency)}${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${prefix(currency)}${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${prefix(currency)}${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${prefix(currency)}${(v / 1e3).toFixed(1)}k`;
  return `${prefix(currency)}${v.toFixed(0)}`;
}

function prefix(currency: string): string {
  return currency === "USD" ? "$" : "R$ ";
}