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
    price: number | null;
    prevClose: number | null;
    change: number | null;
    changePercent: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    dayOpen: number | null;
    volume: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
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

  // Quote + metrics only (small, 60s cache). Bundle in the
  // /api/asset/[symbol] endpoint can hit a stale brapi:full:* cache
  // entry that has empty historicalDataPrice — splitting candles out
  // means the metrics still load instantly even if Brapi's candle
  // path is slow.
  const {
    data: bundle,
    error: bundleError,
    isLoading,
    mutate,
  } = useSWR<Omit<AssetBundle, "candles">>(
    `/api/asset/${encodeURIComponent(symbol)}`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  // Default 1y candles for the first paint.
  const { data: rangeData } = useSWR<{ candles: AssetBundle["candles"] }>(
    `/api/asset/${encodeURIComponent(symbol)}/candles?range=${range}`,
    fetcher,
    { keepPreviousData: true },
  );

  const candles = rangeData?.candles ?? [];

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
        background: "#0a0a0c",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-8 pt-5 pb-12">
        <AssetHeader
          symbol={symbol}
          sector={bundle?.sector ?? null}
          shortName={bundle?.shortName ?? null}
          longName={bundle?.longName ?? null}
          loading={isLoading}
          onRefresh={() => mutate()}
        />

        {/* Chart + news side-by-side from md (768px, iPad mini) up.
            Chart is 2/3 width, news 1/3 — both stretched to equal
            height (items-stretch) so the chart's flex-1 container
            has a real height to fill; otherwise the Recharts SVG
            collapses to 0×0 and the chart renders blank. The news
            card has its own internal scroll (overflow-y-auto). */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          <div className="md:col-span-2 h-full">
            <ChartCard
              symbol={symbol}
              currency={bundle?.currency ?? "BRL"}
              quote={bundle?.quote ?? null}
              candles={candles}
              range={range}
              onRangeChange={setRange}
              loading={isLoading}
            />
          </div>
          <div className="md:col-span-1">
            <NewsCard symbol={symbol} />
          </div>
        </div>

        <MetricsStrip
          currency={bundle?.currency ?? "BRL"}
          metrics={bundle?.metrics ?? null}
          quote={bundle?.quote ?? null}
          loading={isLoading}
        />
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
      className="flex items-center justify-between gap-4 pb-4 border-b border-border/40"
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