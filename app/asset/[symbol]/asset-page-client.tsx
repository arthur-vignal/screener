"use client";

/**
 * AssetPageClient — client shell de /asset/[symbol] (estilo Fey TSLA).
 *
 * Layout:
 *   <AssetHeader />              ← voltar + logo + ticker + sector + 3 ícones
 *   <PriceHero />                ← preço + delta inline + "BRL · B3"
 *   <PriceChart />               ← 2/3 width, 8 tabs (1D | 1W | ...)
 *   <NewsSummaryCard />          ← 1/3 width, tabs News | KPIs | About
 *   <MetricStrip />              ← 10 colunas, 1 linha
 *   <AnalystEstimates />         ← card com "All estimates" + tabs
 *
 * Dados:
 *   - GET /api/asset/[symbol]           → bundle (quote + metrics + candles)
 *   - GET /api/asset/[symbol]/candles   → range dinâmico
 *   - GET /api/news/multi?tickers=SYM   → news summary
 */

import { motion } from "motion/react";
import useSWR from "swr";
import { useMemo, useState } from "react";
import type { JSX } from "react";

import { DashboardDock } from "@/components/foundation/dashboard-dock";
import {
  StaggerOnMount,
  staggerParentVariants,
} from "@/components/foundation/stagger";
import { useAssetBackground } from "@/lib/use-asset-background";
import { AssetHeader } from "@/components/asset/asset-header";
import type { AssetBundle } from "@/components/asset/asset-bundle";
import { MetricStrip, type MetricCell } from "@/components/asset/metric-strip";
import {
  NewsSummaryCard,
  type NewsSummaryItem,
} from "@/components/asset/news-summary-card";
import { PriceChart, type RangeKey, RANGE_DAYS } from "@/components/asset/price-chart";
import { PriceHero } from "@/components/asset/price-hero";

type Props = {
  symbol: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

export default function AssetPageClient({ symbol }: Props): JSX.Element {
  const [range, setRange] = useState<RangeKey>("1Y");

  useAssetBackground(symbol);

  // Bundle principal
  const { data: bundle, isLoading } = useSWR<AssetBundle>(
    `/api/asset/${symbol}`,
    fetchJson,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  // Candles do range selecionado
  const days = RANGE_DAYS[range];
  const candlesUrl =
    range === "YTD"
      ? `/api/asset/${symbol}/candles?range=YTD`
      : days != null
        ? `/api/asset/${symbol}/candles?days=${days}`
        : `/api/asset/${symbol}/candles?range=Max`;
  const { data: candlesData } = useSWR<{ candles?: AssetBundle["candles"] }>(
    candlesUrl,
    fetchJson,
    { keepPreviousData: true }
  );
  const candles = candlesData?.candles ?? bundle?.candles ?? [];

  // News summary (pega primeira notícia relevante do ticker)
  const { data: newsData, isLoading: newsLoading } = useSWR<{ items?: NewsApiItem[] }>(
    `/api/news/multi?tickers=${symbol}`,
    fetchJson
  );
  const newsItems = useMemo<NewsSummaryItem[]>(() => {
    const items = newsData?.items ?? [];
    return items.slice(0, 1).map((n) => ({
      id: n.id,
      title: n.headline,
      summary: n.summary ?? "",
      source: n.source,
      publishedAt: n.publishedAt,
    }));
  }, [newsData]);

  // Metric strip (10 widgets estilo Fey TSLA)
  const metricCells = useMemo<MetricCell[]>(() => {
    if (!bundle) return [];
    const m = bundle.metrics;
    const q = bundle.quote;

    const fmtCompact = (v: number | null) =>
      v == null ? "—" : v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
    const fmtCurrency = (v: number | null, c: string) =>
      v == null
        ? "—"
        : v.toLocaleString("en-US", {
          style: "currency",
          currency: c,
          notation: "compact",
          maximumFractionDigits: 2,
        });
    const fmtPercent = (v: number | null) =>
      v == null ? "—" : `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    const fmtMultiple = (v: number | null) =>
      v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 2 });

    return [
      { label: "Mkt cap", value: fmtCompact(m.marketCap) },
      { label: "EV/Sales", value: "—" }, // requer campo que bundle não tem
      { label: "P/E ratio", value: fmtMultiple(m.trailingPE) },
      { label: "FY Revenue", value: "—" }, // requer campo
      { label: "EPS", value: "—" }, // requer campo
      { label: "Gross Margin", value: "—" }, // requer campo
      { label: "Profit Margin", value: "—" }, // requer campo
      { label: "Beta", value: "—" }, // requer campo
      { label: "Div yield", value: fmtPercent(m.dividendYield) },
      { label: "Sector", value: m.sector ?? "—" },
    ];
  }, [bundle]);

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#070709" }}>
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-6 pb-32"
      >
        <StaggerOnMount>
          <AssetHeader
            symbol={symbol}
            longName={bundle?.longName ?? null}
            shortName={bundle?.shortName ?? null}
            sector={bundle?.sector ?? "—"}
          />
        </StaggerOnMount>

        <StaggerOnMount>
          <PriceHero
            price={bundle?.quote.price ?? null}
            currency={(bundle?.currency as "BRL" | "USD") ?? "BRL"}
            change={bundle?.quote.change ?? null}
            changePercent={bundle?.quote.changePercent ?? null}
            location="B3"
            loading={isLoading && !bundle}
          />
        </StaggerOnMount>

        {/* Grid 2-col: gráfico (2/3) + news (1/3) */}
        <StaggerOnMount>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            <PriceChart
              candles={candles}
              range={range}
              onRangeChange={setRange}
              prevClose={bundle?.quote.prevClose ?? null}
              loading={isLoading && candles.length === 0}
            />
            <NewsSummaryCard items={newsItems} loading={newsLoading && newsItems.length === 0} />
          </div>
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          <MetricStrip cells={metricCells} />
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          <AnalystEstimates symbol={symbol} hasEstimates={false} />
        </StaggerOnMount>
      </motion.main>

      <DashboardDock />
    </div>
  );
}

// ─── Analyst estimates (placeholder pra Fase 4) ────────────────────────────

function AnalystEstimates({
  symbol,
  hasEstimates,
}: {
  symbol: string;
  hasEstimates: boolean;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
            Analyst estimates
          </h2>
          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-semibold text-muted-foreground/70">
            A
          </span>
        </div>
        <button
          type="button"
          disabled={!hasEstimates}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md",
            "bg-white/[0.04] border border-white/10 text-foreground",
            "text-[12px] font-medium",
            "hover:bg-white/[0.08] hover:border-white/20",
            "transition-colors cursor-pointer",
            !hasEstimates && "opacity-50 cursor-not-allowed"
          )}
        >
          All estimates
        </button>
      </div>

      {hasEstimates ? (
        <div className="space-y-3">
          {/* Implementação real virá na Fase 4 */}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <EmptyColumn label="Analyst ratings" symbol={symbol} />
          <EmptyColumn label="Price target" symbol={symbol} />
        </div>
      )}
    </div>
  );
}

function EmptyColumn({
  label,
  symbol,
}: {
  label: string;
  symbol: string;
}): JSX.Element {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 text-center">
      <p className="text-[12px] text-muted-foreground/70">
        {label} indisponível para {symbol}.
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}

type NewsApiItem = {
  id: string;
  headline: string;
  summary?: string;
  source: string;
  publishedAt: string;
};
