"use client";

import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { useWatchlist } from "@/lib/use-watchlist";
import { PriceChart } from "@/components/price-chart";
import { cn, formatCompact, formatNumber, formatPercent } from "@/lib/utils";

type Quote = {
  // Yahoo shape
  price?: number;
  change?: number;
  changePercent?: number;
  // Finnhub shape (fallback)
  c?: number;
  d?: number;
  dp?: number;
};

type AssetData = {
  ticker: string;
  quote: Quote;
  profile: { name: string; finnhubIndustry: string; exchange: string; currency: string; marketCapitalization: number };
  metrics: Record<string, number | null>;
};

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    const err = new Error(`HTTP ${r.status}`);
    throw err;
  }
  return r.json();
};

export function AssetDetail({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR<AssetData>(
    `/api/asset/${ticker}`,
    fetcher,
  );

  if (error) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-negative">{String(error)}</p>
        <Link href="/screen/stocks" className="text-sm text-accent hover:underline mt-2 inline-block">
          ← Voltar para lista
        </Link>
      </div>
    );
  }

  if (isLoading || !data || !data.profile) {
    return (
      <div className="px-8 py-8 space-y-4">
        <div className="h-8 w-48 shimmer rounded" />
        <div className="h-72 shimmer rounded-lg" />
        <div className="h-32 shimmer rounded-lg" />
      </div>
    );
  }

  const { quote, profile, metrics } = data;
  const watchlist = useWatchlist();

  // Normaliza quote: aceita Yahoo (price) ou Finnhub (c)
  const price = quote?.price ?? quote?.c ?? 0;
  const change = quote?.change ?? quote?.d ?? 0;
  const changePercent = quote?.changePercent ?? quote?.dp ?? 0;

  return (
    <div className="px-8 py-8 max-w-6xl">
      <Link
        href="/screen/stocks"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </Link>

      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-3xl font-semibold tracking-tight font-mono">
          {data.ticker}
        </h1>
        <span className="text-text-secondary">{profile?.name ?? ticker}</span>
        <button
          onClick={() => watchlist.has(data.ticker) ? watchlist.remove(data.ticker) : watchlist.add(data.ticker)}
          className="ml-2 p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
          aria-label={watchlist.has(data.ticker) ? "Remover da watchlist" : "Adicionar à watchlist"}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-colors",
              watchlist.has(data.ticker)
                ? "text-yellow-500 fill-yellow-500"
                : "text-text-muted hover:text-foreground"
            )}
            strokeWidth={1.5}
          />
        </button>
      </div>
      <div className="flex items-baseline gap-4 mb-8">
        <span className="text-5xl font-semibold tabular-nums tracking-tight">
          ${price.toFixed(2)}
        </span>
        <span
          className={cn(
            "text-base font-mono tabular-nums",
            changePercent >= 0 ? "text-positive" : "text-negative",
          )}
        >
          {changePercent >= 0 ? "+" : ""}
          {change.toFixed(2)} ({formatPercent(changePercent)})
        </span>
      </div>

      <PriceChart ticker={data.ticker} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <Stat label="Market cap" value={`$${formatCompact(((profile?.marketCapitalization ?? 0) * 1e6))}`} />
        <Stat label="Setor" value={(profile?.finnhubIndustry ?? '—')} />
        <Stat label="Exchange" value={(profile?.exchange ?? '—')} />
        <Stat label="Moeda" value={(profile?.currency ?? 'USD')} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <Stat label="P/E" value={formatNumber(metrics.peRatio)} />
        <Stat label="PEG" value={formatNumber(metrics.pegRatio)} />
        <Stat label="P/VP" value={formatNumber(metrics.priceToBook)} />
        <Stat label="EV/EBITDA" value={formatNumber(metrics.evEbitda)} />
        <Stat label="ROE" value={metrics.roe ? formatPercent(metrics.roe) : "—"} />
        <Stat label="ROA" value={metrics.roa ? formatPercent(metrics.roa) : "—"} />
        <Stat label="Margem op." value={metrics.operatingMargin ? formatPercent(metrics.operatingMargin) : "—"} />
        <Stat label="Margem líq." value={metrics.profitMargin ? formatPercent(metrics.profitMargin) : "—"} />
        <Stat label="Dividend yield" value={metrics.dividendYield ? formatPercent(metrics.dividendYield) : "—"} />
        <Stat label="Payout" value={metrics.payoutRatio ? formatPercent(metrics.payoutRatio) : "—"} />
        <Stat label="Beta" value={formatNumber(metrics.beta)} />
        <Stat label="52w high" value={metrics.yearHigh ? `$${metrics.yearHigh.toFixed(2)}` : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-xs uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div className="text-sm font-medium font-mono tabular-nums">{value}</div>
    </div>
  );
}
