"use client";

/**
 * MetricsStrip — horizontal strip of fundamentals below the chart.
 *
 * Per the user's spec:
 *   Setor · Marketcap · PE · ROE · Dividend Yield (if paying) ·
 *   EBITDA · Free Cash Flow
 *
 * Each tile shows label + value, and a small change vs previous
 * period (when available) — same Fey-style horizontal layout.
 */

import { motion } from "motion/react";

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

export function MetricsStrip({
  currency,
  metrics,
  quote,
  loading,
}: {
  currency: string;
  metrics: Metrics | null;
  quote: Quote | null;
  loading: boolean;
}) {
  const tiles: Tile[] = [
    {
      label: "Setor",
      value: metrics?.sector ?? null,
      kind: "text",
    },
    {
      label: "Market cap",
      value: (metrics?.marketCap ?? quote?.marketCap) ?? null,
      kind: "compact",
    },
    {
      label: "P/E",
      value: metrics?.trailingPE ?? null,
      kind: "multiple",
    },
    {
      label: "ROE",
      value: metrics?.returnOnEquity ?? null,
      kind: "percent",
    },
    {
      label: "Dividend yield",
      value: metrics?.dividendYield ?? null,
      kind: "percent-conditional",
      showOnlyIfPositive: true,
    },
    {
      label: "EBITDA",
      value: metrics?.ebitda ?? null,
      kind: "compact",
    },
    {
      label: "Free cash flow",
      value: metrics?.freeCashflow ?? null,
      kind: "compact",
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

      <div
        className="rounded-2xl border border-border/60 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #08090c 0%, #15161b 30%, #0d0e12 55%, #1c1d22 80%, #07080b 100%)",
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {tiles.map((tile, idx) => (
            <MetricCell
              key={tile.label}
              tile={tile}
              currency={currency}
              loading={loading}
              divider={idx > 0}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

type Tile = {
  label: string;
  value: number | string | null;
  kind:
    | "text"
    | "multiple"
    | "percent"
    | "percent-conditional"
    | "compact";
  showOnlyIfPositive?: boolean;
};

function MetricCell({
  tile,
  currency,
  loading,
  divider,
}: {
  tile: Tile;
  currency: string;
  loading: boolean;
  divider: boolean;
}) {
  const value = tile.value;
  const display = formatValue(tile, currency, loading);

  // Hide dividend yield tile if value is null/0 (issuer doesn't pay).
  if (tile.kind === "percent-conditional") {
    const num = typeof value === "number" ? value : null;
    if (num == null || num <= 0) return null;
  }

  return (
    <div
      className={
        "px-4 py-4 sm:py-5 " +
        (divider ? "border-t border-border/40 sm:border-t-0 sm:border-l border-border/40 " : "")
      }
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {tile.label}
      </p>
      <p className="mt-1.5 text-[15px] md:text-[16px] font-medium tabular-nums truncate">
        {display}
      </p>
    </div>
  );
}

function formatValue(tile: Tile, currency: string, loading: boolean): string {
  if (loading) return "—";
  const v = tile.value;
  if (v == null || v === "" || (typeof v === "number" && !Number.isFinite(v))) return "—";
  switch (tile.kind) {
    case "text":
      return String(v);
    case "multiple":
      return typeof v === "number" ? v.toFixed(2) : "—";
    case "percent":
      return typeof v === "number" ? `${v.toFixed(2)}%` : "—";
    case "percent-conditional":
      return typeof v === "number" ? `${v.toFixed(2)}%` : "—";
    case "compact":
      return typeof v === "number" ? formatCompact(v, currency) : "—";
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