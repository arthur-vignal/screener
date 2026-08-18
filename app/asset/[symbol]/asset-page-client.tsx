"use client";

/**
 * AssetPageClient — top-level client shell for /asset/[symbol].
 *
 * Composes:
 *   <AssetHeader />        — back arrow, ticker chip, sector pill, "Analyze" button
 *   <PriceHero />          — price + change (above the chart, left aligned)
 *   <ChartCard />          — Recharts LineChart + time-range pills + prevClose line + volume
 *   <MetricsStrip />       — horizontal strip: Setor, Mkt Cap, PE, ROE, Div Yield, EBITDA, FCF
 *   <NewsCard />           — All/Press/Analysis tabs + 3-5 headlines (filtered by ticker)
 *
 * Data flow:
 *   - GET /api/asset/[symbol]           → quote + metrics + default 1y candles
 *   - GET /api/asset/[symbol]/candles?range=…  → when user picks a new range
 *   - GET /api/news/multi/[tickers]?tickers=SYM  → news for this ticker
 *   - Auto-refresh quote every 60s via SWR refreshInterval.
 */

import useSWR from "swr";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Bookmark, MoreHorizontal, RefreshCw } from "lucide-react";
import { ChartCard, type RangeKey } from "./chart-card";
import { MetricsStrip } from "./metrics-strip";
import { NewsCard } from "./news-card";

type AssetBundle = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  sector: string;
  currency: string;
  marketState: string;
  quote: {
    price: number;
    prevClose: number;
    change: number;
    changePercent: number;
    dayHigh: number;
    dayLow: number;
    dayOpen: number;
    volume: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    marketCap: number | null;
    marketTime: string | null;
  };
  metrics: {
    sector: string;
    marketCap: number | null;
    trailingPE: number | null;
    returnOnEquity: number | null;
    ebitda: number | null;
    freeCashflow: number | null;
    dividendYield: number | null;
  };
  candles: Array<{
    date: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
  }>;
};

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
});

export function AssetPageClient({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<RangeKey>("1y");

  // Bundle: quote + metrics + default 1y candles. Auto-refreshes
  // every 60s so price stays fresh without manual reload.
  const {
    data: bundle,
    error: bundleError,
    isLoading,
    mutate,
  } = useSWR<AssetBundle>(
    `/api/asset/${encodeURIComponent(symbol)}`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  // Range-specific candles (fetched lazily when user picks a range).
  const { data: rangeData } = useSWR<{ candles: AssetBundle["candles"] }>(
    bundle ? `/api/asset/${encodeURIComponent(symbol)}/candles?range=${range}` : null,
    fetcher,
    { keepPreviousData: true },
  );

  const candles = rangeData?.candles ?? bundle?.candles ?? [];

  if (bundleError) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-[13px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Erro
          </p>
          <h1 className="text-[28px] font-medium tracking-tight">Ticker inválido</h1>
          <p className="text-[13px] text-muted-foreground">
            Não encontramos dados para <span className="font-medium text-foreground">{symbol}</span>.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 mt-4 text-[12px] tracking-[0.18em] uppercase text-foreground/70 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar para home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div
      className="min-h-screen text-foreground overflow-x-hidden"
      style={{
        fontFamily: "var(--font-manrope)",
        background:
          "linear-gradient(135deg, #0a0a0c 0%, #14151a 60%, #0a0a0c 100%)",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 pt-6 pb-32">
        <AssetHeader
          symbol={symbol}
          sector={bundle?.sector ?? null}
          shortName={bundle?.shortName ?? null}
          longName={bundle?.longName ?? null}
          loading={isLoading}
          onRefresh={() => mutate()}
        />

        <ChartCard
          symbol={symbol}
          currency={bundle?.currency ?? "BRL"}
          quote={bundle?.quote ?? null}
          candles={candles}
          range={range}
          onRangeChange={setRange}
          loading={isLoading}
        />

        <MetricsStrip
          currency={bundle?.currency ?? "BRL"}
          metrics={bundle?.metrics ?? null}
          quote={bundle?.quote ?? null}
          loading={isLoading}
        />

        <NewsCard symbol={symbol} />
      </div>
    </div>
  );
}

// ─────────────────────────── Header ───────────────────────────

function AssetHeader({
  symbol,
  sector,
  shortName,
  longName,
  loading,
  onRefresh,
}: {
  symbol: string;
  sector: string | null;
  shortName: string | null;
  longName: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const name = longName ?? shortName ?? symbol;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between gap-4 pb-5 border-b border-border/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/home"
          aria-label="Voltar"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-foreground/5 hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold tracking-tight">{symbol}</h1>
            {sector && !loading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-foreground/5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {sector}
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground truncate max-w-[60ch]">
            {loading ? " " : name}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRefresh}
          aria-label="Atualizar"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-foreground/5 hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <Link
          href={`/analysis?symbol=${encodeURIComponent(symbol)}`}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-foreground text-background text-[11px] tracking-[0.18em] uppercase font-medium hover:opacity-90 transition-opacity"
        >
          <Search className="h-3.5 w-3.5" />
          Analyze
        </Link>
        <button
          aria-label="Salvar"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-foreground/5 hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition-colors"
        >
          <Bookmark className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Mais"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-foreground/5 hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}