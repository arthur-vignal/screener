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
import { TickerLogo } from "@/components/ticker-logo";
import { ChartCard, type RangeKey } from "./chart-card";
import { NewsCard } from "./news-card";
import { MetricsTable, type MetricsBundle } from "./components/metrics-table";
import { useAssetBackground } from "@/lib/use-asset-background";

type AssetBundle = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  logoUrl: string | null;
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
  /**
   * Loose shape — /api/asset/[symbol] forwards the raw fields from
   * lib/brapi.ts's getBrapiFundamentals(). Use `unknown` here and let
   * adaptForMetrics() cast at the boundary.
   */
  keyStatistics?: Record<string, number | null | undefined>;
  historicals?: {
    income?: Array<Record<string, unknown>>;
    balance?: Array<Record<string, unknown>>;
    cashflow?: Array<Record<string, unknown>>;
    valueAdded?: Array<Record<string, unknown>>;
    keyStatistics?: Array<Record<string, unknown>>;
    financialData?: Array<Record<string, unknown>>;
    dividends?: Array<Record<string, unknown>>;
  };
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

export function AssetPageClient({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<RangeKey>("1y");
  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);

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
  } = useSWR<AssetBundle>(
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
      className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-manrope)",
        ...bgStyle,
      }}
    >
      <div className="px-1 pt-5 pb-12">
        <AssetHeader
          symbol={symbol}
          sector={bundle?.sector ?? null}
          shortName={bundle?.shortName ?? null}
          longName={bundle?.longName ?? null}
          logoUrl={bundle?.logoUrl ?? null}
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
          <div className="md:col-span-1 h-full">
            <NewsCard symbol={symbol} />
          </div>
        </div>

        {bundle && <MetricsTable bundle={adaptForMetrics(bundle)} />}
      </div>
    </div>
  );
}

/**
 * Adapter: `bundle` from /api/asset/[symbol] uses lib/brapi's
 * `BrapiFundamentals` shape (different from `BrapiFull` in
 * lib/brapi-full.ts). Map it into the loose `MetricsBundle` that the
 * table component actually consumes.
 */
function adaptForMetrics(b: AssetBundle): MetricsBundle {
  const hist = b.historicals ?? ({} as NonNullable<typeof b.historicals>);
  return {
    quote: {
      regularMarketPrice: b.quote?.price ?? null,
      marketCap: b.quote?.marketCap ?? null,
    },
    keyStatistics: b.keyStatistics
      ? {
          enterpriseValue: b.keyStatistics.enterpriseValue ?? null,
          forwardPE: b.keyStatistics.forwardPE ?? null,
          profitMargins: b.keyStatistics.profitMargins ?? null,
          floatShares: b.keyStatistics.floatShares ?? null,
          sharesOutstanding: b.keyStatistics.sharesOutstanding ?? null,
          beta: b.keyStatistics.beta ?? null,
          bookValue: b.keyStatistics.bookValue ?? null,
          priceToBook: b.keyStatistics.priceToBook ?? null,
          pegRatio: b.keyStatistics.pegRatio ?? null,
          earningsPerShare: b.keyStatistics.trailingEps ?? null,
          trailingEps: b.keyStatistics.trailingEps ?? null,
          enterpriseToRevenue: b.keyStatistics.enterpriseToRevenue ?? null,
          enterpriseToEbitda: b.keyStatistics.enterpriseToEbitda ?? null,
          fiftyTwoWeekChange: b.keyStatistics.fiftyTwoWeekChange ?? null,
          yield: b.keyStatistics.yield ?? null,
          dividendYield: b.keyStatistics.dividendYield ?? null,
          marketCap: b.keyStatistics.marketCap ?? null,
          priceEarnings: b.keyStatistics.priceEarnings ?? null,
        }
      : null,
    incomeStatementHistory: (hist.income ?? []).map((r) => ({
      endDate: (r as { endDate?: string }).endDate ?? "",
      netIncome: (r as { netIncome?: number | null }).netIncome ?? null,
      cleanNopat: (r as { cleanNopat?: number | null }).cleanNopat ?? null,
    })),
    balanceSheetHistory: (hist.balance ?? []).map((r) => ({
      endDate: (r as { endDate?: string }).endDate ?? "",
      cash: (r as { cash?: number | null }).cash ?? null,
      shareholdersEquity: (r as { shareholdersEquity?: number | null }).shareholdersEquity ?? null,
      totalAssets: (r as { totalAssets?: number | null }).totalAssets ?? null,
      loansAndFinancing: (r as { loansAndFinancing?: number | null }).loansAndFinancing ?? null,
      longTermLoansAndFinancing: (r as { longTermLoansAndFinancing?: number | null }).longTermLoansAndFinancing ?? null,
      debentures: (r as { debentures?: number | null }).debentures ?? null,
      longTermDebentures: (r as { longTermDebentures?: number | null }).longTermDebentures ?? null,
      longTermDebt: (r as { longTermDebt?: number | null }).longTermDebt ?? null,
      shortLongTermDebt: (r as { shortLongTermDebt?: number | null }).shortLongTermDebt ?? null,
    })),
    cashflowHistory: (hist.cashflow ?? []).map((r) => ({
      endDate: (r as { endDate?: string }).endDate ?? "",
      operatingCashFlow: (r as { operatingCashFlow?: number | null }).operatingCashFlow ?? null,
      freeCashFlow: (r as { freeCashFlow?: number | null }).freeCashFlow ?? null,
    })),
    keyStatisticsHistory: (hist.keyStatistics ?? []).map((r) => ({
      endDate: (r as { endDate?: string }).endDate ?? "",
      trailingPE: (r as { trailingPE?: number | null }).trailingPE ?? null,
      priceToBook: (r as { priceToBook?: number | null }).priceToBook ?? null,
      bookValue: (r as { bookValue?: number | null }).bookValue ?? null,
      enterpriseValue: (r as { enterpriseValue?: number | null }).enterpriseValue ?? null,
      enterpriseToRevenue: (r as { enterpriseToRevenue?: number | null }).enterpriseToRevenue ?? null,
      enterpriseToEbitda: (r as { enterpriseToEbitda?: number | null }).enterpriseToEbitda ?? null,
      marketCap: (r as { marketCap?: number | null }).marketCap ?? null,
      pegRatio: (r as { pegRatio?: number | null }).pegRatio ?? null,
      earningsPerShare: (r as { earningsPerShare?: number | null }).earningsPerShare ?? null,
      trailingEps: (r as { trailingEps?: number | null }).trailingEps ?? null,
      forwardPE: (r as { forwardPE?: number | null }).forwardPE ?? null,
      profitMargins: (r as { profitMargins?: number | null }).profitMargins ?? null,
      earningsQuarterlyGrowth: (r as { earningsQuarterlyGrowth?: number | null }).earningsQuarterlyGrowth ?? null,
      netIncomeToCommon: (r as { netIncomeToCommon?: number | null }).netIncomeToCommon ?? null,
      fiftyTwoWeekChange: (r as { "52WeekChange"?: number | null })["52WeekChange"] ?? null,
      lastDividendValue: (r as { lastDividendValue?: number | null }).lastDividendValue ?? null,
      lastDividendDate: (r as { lastDividendDate?: string | null }).lastDividendDate ?? null,
      dividendYield: (r as { dividendYield?: number | null }).dividendYield ?? null,
      yield: (r as { yield?: number | null }).yield ?? null,
    })),
    dividends: (hist.dividends ?? []).map((r) => ({
      rate: (r as { rate?: number }).rate ?? 0,
      paymentDate: (r as { paymentDate?: string }).paymentDate ?? "",
      label: (r as { label?: string }).label ?? "DIVIDENDO",
    })),
  };
}

// ─────────────────────────── Header ───────────────────────────

function AssetHeader({
  symbol,
  sector,
  shortName,
  longName,
  logoUrl,
  loading,
  onRefresh,
}: {
  symbol: string;
  sector: string | null;
  shortName: string | null;
  longName: string | null;
  logoUrl: string | null;
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
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={`${symbol} logo`}
                  className="h-11 w-11 rounded-full bg-white/5 object-contain shrink-0"
                />
              ) : (
                <TickerLogo symbol={symbol} size="md" />
              )}
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