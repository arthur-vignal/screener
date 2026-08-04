"use client";

import useSWR from "swr";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .catch(() => ({ tickers: [] }));

type Ticker = {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  href: string;
};

type TickerResponse = {
  tickers: Ticker[];
};

export function GlobalTicker() {
  const { data } = useSWR<TickerResponse>("/api/market/ticker", fetcher, {
    refreshInterval: 30_000,
  });

  const tickers = data?.tickers ?? [];

  if (tickers.length === 0) {
    return null;
  }

  const items = [...tickers, ...tickers];

  return (
    <div className="fixed top-0 inset-x-0 z-[60] h-7 bg-canvas-soft border-b border-hairline overflow-hidden group/ticker">
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-canvas-soft to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-canvas-soft to-transparent z-10 pointer-events-none" />
      <div className="ticker-track h-full flex items-center gap-6 group-hover/ticker:[animation-play-state:paused]">
        {items.map((t, i) => (
          <TickerItem key={`${t.symbol}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ t }: { t: Ticker }) {
  const cp = t.changePercent ?? 0;
  const Icon = cp > 0 ? TrendingUp : cp < 0 ? TrendingDown : Minus;
  const tone = cp > 0 ? "positive" : cp < 0 ? "negative" : "muted";

  return (
    <Link
      href={t.href}
      className="flex items-center gap-2 px-2 text-xs hover:bg-surface-elevated transition-colors duration-150 press h-full"
    >
      <span className="font-mono font-medium text-ink tracking-tight">{t.label}</span>
      <span className="font-tabular text-ink">
        {t.price == null
          ? "—"
          : t.price < 1
            ? t.price.toFixed(4)
            : t.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
      <span
        className={cn(
          "flex items-center gap-0.5 font-tabular font-medium",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "muted" && "text-muted",
        )}
      >
        <Icon className="w-3 h-3" />
        {cp >= 0 ? "+" : ""}
        {cp.toFixed(2)}%
      </span>
    </Link>
  );
}
