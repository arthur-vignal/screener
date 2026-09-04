"use client";

/**
 * IndexPageClient — client shell de /index/[tickerindex].
 *
 * Layout (clone enxuto de /asset/[symbol]):
 *   <IndexHeader />          ← voltar + logo do índice + nome + país
 *   <PriceHero />            ← preço + delta inline + "PONTOS · B3"
 *   <PriceChart />           ← clone 1:1 do /asset/[symbol]
 *   <IndexMetricStrip />     ← métricas de índice (YTD, max 52w, vol, etc)
 *
 * Dados:
 *   - GET /api/index/[tickerindex]    → bundle (index + candles)
 *
 * Sem:
 *   - 11 gráficos analíticos do /analysis (não se aplica a índice)
 *   - métricas fundamentalistas (P/E de stock, receita trimestral, etc)
 *
 * Glow de fundo: usa cor da bandeira do país (Brazil = verde Petrobras,
 * USA = vermelho/azul, etc). Mapeamento em INDEX_HEADER_GLOW.
 */

import { motion } from "motion/react";
import useSWR from "swr";
import { useMemo, useState } from "react";
import type { JSX } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import {
  StaggerOnMount,
  staggerParentVariants,
} from "@/components/foundation/stagger";
import { IndexLogo } from "@/components/foundation/index-logo";
import { PriceChart, type RangeKey } from "@/components/asset/price-chart";
import { PriceHero } from "@/components/asset/price-hero";
import { Skeleton } from "@/components/foundation/skeleton";
import { findIndex, type IndexLive } from "@/lib/indexes";
import { cn } from "@/lib/utils";

type Candle = {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

type Bundle = {
  index: IndexLive;
  candles: Candle[];
};

type Props = {
  symbol: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "YTD": 365,
  "1Y": 365,
  "5Y": 1825,
  All: 1825,
};

export default function IndexPageClient({ symbol }: Props): JSX.Element {
  const [range, setRange] = useState<RangeKey>("1Y");

  const { data: bundle, isLoading } = useSWR<Bundle>(
    `/api/index/${symbol}`,
    fetchJson,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  const entry = findIndex(symbol);

  // Slice candles pelo range
  const filteredCandles = useMemo(() => {
    if (!bundle) return [];
    const days = RANGE_TO_DAYS[range];
    const cutoff = Date.now() - days * 86_400_000;
    if (range === "YTD") {
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      return bundle.candles.filter((c) => c.timestamp >= yearStart.getTime());
    }
    return bundle.candles.filter((c) => c.timestamp >= cutoff);
  }, [bundle, range]);

  const isPositive = (bundle?.index.change ?? 0) >= 0;
  const glowColor = GLOW_BY_COUNTRY[bundle?.index.country ?? "Brazil"];

  return (
    <div
      className="min-h-screen text-foreground asset-bg"
      style={{
        background: "#070709",
        "--asset-glow-color": glowColor,
        "--asset-glow-opacity": "0.18",
      } as React.CSSProperties}
    >
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-6 pb-32 relative z-10"
      >
        <StaggerOnMount>
          <IndexHeader
            symbol={symbol}
            name={bundle?.index.name ?? entry?.name ?? symbol}
            country={bundle?.index.country ?? "Brazil"}
            loading={isLoading && !bundle}
          />
        </StaggerOnMount>

        <StaggerOnMount>
          <PriceHero
            price={bundle?.index.price ?? null}
            currency="BRL"
            change={bundle?.index.change ?? null}
            changePercent={bundle?.index.changePercent ?? null}
            location="B3 · pontos"
            loading={isLoading && !bundle}
          />
        </StaggerOnMount>

        <StaggerOnMount>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr] gap-5 mt-2">
            <PriceChart
              candles={filteredCandles}
              range={range}
              onRangeChange={setRange}
              prevClose={null}
              loading={isLoading && filteredCandles.length === 0}
            />
          </div>
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          <IndexMetrics bundle={bundle} loading={isLoading} />
        </StaggerOnMount>
      </motion.main>

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────

function IndexHeader({
  symbol, name, country, loading,
}: {
  symbol: string;
  name: string;
  country: IndexLive["country"];
  loading?: boolean;
}): JSX.Element {
  return (
    <header className="flex items-center justify-between gap-6 pb-5">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/analysis?tab=macro"
          aria-label="Voltar para análise"
          title="Voltar"
          className="shrink-0 flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground/85 hover:bg-white/[0.04] hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>

        <IndexLogo symbol={symbol} size="md" />

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-semibold tracking-tight text-foreground">
              {symbol}
            </h1>
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/85 font-medium">
              {country}
            </span>
            {loading && (
              <Skeleton className="h-3 w-12 inline-block" roundedMd />
            )}
          </div>
          <p className="text-[12px] text-muted-foreground/70 truncate max-w-[60ch]">
            {name}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[18px]" aria-hidden>
          {countryFlag(country)}
        </span>
      </div>
    </header>
  );
}

function countryFlag(country: IndexLive["country"]): string {
  switch (country) {
    case "Brazil": return "🇧🇷";
    case "USA": return "🇺🇸";
    case "Mexico": return "🇲🇽";
    case "Canada": return "🇨🇦";
  }
}

// ─── Metrics strip ───────────────────────────────────────────────────────

type MetricCell = {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
};

function IndexMetrics({
  bundle, loading,
}: { bundle?: Bundle; loading: boolean }): JSX.Element {
  const cells: MetricCell[] = useMemo(() => {
    if (!bundle) return [];
    const i = bundle.index;
    return [
      { label: "YTD", value: `${i.ytdPercent >= 0 ? "+" : ""}${i.ytdPercent.toFixed(2)}%`, trend: i.ytdPercent >= 0 ? "up" : "down" },
      { label: "Daily", value: `${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(2)}%`, trend: i.changePercent >= 0 ? "up" : "down" },
      { label: "P/LTM", value: i.peRatio > 0 ? i.peRatio.toFixed(2) : "N/A" },
      { label: "Div yield", value: i.divYield > 0 ? `${i.divYield.toFixed(2)}%` : "N/A" },
      { label: "Mkt cap", value: i.marketCap > 0 ? `${i.marketCap.toFixed(2)}B` : "—" },
      { label: "Volume", value: i.volume > 0 ? `${(i.volume / 1_000_000).toFixed(2)}M` : "—" },
      { label: "Country", value: i.country },
      { label: "Source", value: i.source === "brapi" ? "brapi v2" : "mock" },
    ];
  }, [bundle]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] p-6">
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
          Index metrics
        </h2>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-semibold text-muted-foreground/70">
          I
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading && !bundle
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" roundedMd />
            ))
          : cells.map((c) => (
              <MetricTile key={c.label} cell={c} />
            ))}
      </div>
    </div>
  );
}

function MetricTile({ cell }: { cell: MetricCell }): JSX.Element {
  const TrendIcon =
    cell.trend === "up" ? ArrowUp :
    cell.trend === "down" ? ArrowDown : null;
  const trendColor =
    cell.trend === "up" ? "text-[#4dbe95]" :
    cell.trend === "down" ? "text-[#d84f68]" :
    "text-foreground";
  return (
    <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
        {cell.label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[16px] font-semibold tabular-nums flex items-center gap-1",
          trendColor,
        )}
      >
        {TrendIcon && <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.25} />}
        {cell.value}
      </div>
    </div>
  );
}

// ─── Glow color por país ─────────────────────────────────────────────────

const GLOW_BY_COUNTRY: Record<IndexLive["country"], string> = {
  Brazil: "#009c3b",   // verde bandeira
  USA: "#3c3b6e",      // blue+red mix
  Mexico: "#006847",   // verde bandeira
  Canada: "#d52b1e",   // vermelho bandeira
};
