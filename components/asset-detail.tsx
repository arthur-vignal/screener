"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, Newspaper, Calendar, Plus } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import { AssetScores } from "@/components/asset-scores";
import { EtfHoldings } from "@/components/etf-holdings";
import { cn, formatCompact } from "@/lib/utils";
import { AllFundamentals } from "@/components/all-fundamentals";
import { CvmFundamentalsPanel } from "@/components/cvm-fundamentals-panel";
import { NewsForTickers } from "@/components/news-for-tickers";
import { WatchlistButton } from "@/components/watchlist-button";
import { CompareButton } from "@/components/compare-button";
import { AddToPortfolioButton } from "@/components/add-to-portfolio-button";
import { isBrazilianTicker } from "@/lib/brapi";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AssetData = {
  ticker: string;
  secAsOf?: string | null;
  source?: string;
  quote: {
    price?: number;
    change?: number;
    changePercent?: number;
    currency?: string;
    dayHigh?: number;
    dayLow?: number;
    dayOpen?: number;
    prevClose?: number;
    volume?: number;
    marketCap?: number;
    c?: number;
    d?: number;
    dp?: number;
    h?: number;
    l?: number;
    o?: number;
    pc?: number;
  };
  // US path: full Finnhub profile object.
  // BR path: undefined — fields live at the top level (name, exchange, sector,
  // industry, currency, marketCap, logo, summary).
  profile?: {
    name: string;
    finnhubIndustry: string;
    exchange: string;
    currency: string;
    marketCapitalization: number;
    logo?: string;
  };
  // BR-only top-level fields (optional, present when source === "brapi").
  name?: string | null;
  exchange?: string | null;
  sector?: string | null;
  industry?: string | null;
  currency?: string | null;
  marketCap?: number | null;
  logo?: string | null;
  summary?: string | null;
  metrics: Record<string, number | null>;
  finviz?: Record<string, string>;
};

/**
 * Normalize the asset payload into a single view-model regardless of source
 * (Finnhub/Yahoo for US, Brapi for BR). Returns null when there's not enough
 * data to render.
 */
function normalizeAsset(data: AssetData): {
  name: string;
  exchange: string;
  industry: string;
  currency: string;
  currencySymbol: string;
  marketCap: number | null;
  isBR: boolean;
  source: "brapi" | "us-bundle";
} | null {
  const isBR = data.source === "brapi";
  const us = data.profile;
  const name = us?.name ?? data.name ?? data.ticker;
  const exchange = us?.exchange ?? data.exchange ?? "—";
  const industry = us?.finnhubIndustry ?? data.industry ?? "—";
  const currency = us?.currency ?? data.currency ?? data.quote?.currency ?? "USD";
  const currencySymbol = currency === "BRL" ? "R$" : "$";
  // US: profile.marketCapitalization is in millions of USD per Finnhub contract.
  // BR: data.marketCap is already the raw BRL value.
  const marketCap = us?.marketCapitalization
    ? us.marketCapitalization * 1e6
    : data.marketCap ?? data.quote?.marketCap ?? null;
  if (!name) return null;
  return {
    name,
    exchange,
    industry,
    currency,
    currencySymbol,
    marketCap,
    isBR,
    source: (data.source as "brapi" | "us-bundle") ?? "us-bundle",
  };
}

function formatByCurrency(n: number | undefined | null, currency: string, symbol: string): string {
  if (n == null || n === 0) return "—";
  const abs = Math.abs(n);
  const decimals = abs < 0.01 ? 6 : 2;
  const formatted = n.toLocaleString(currency === "BRL" ? "pt-BR" : "en-US", {
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
}

type Tab = "statistics" | "news" | "events";

export function AssetDetail({ ticker }: { ticker: string }) {
  const [tab, setTab] = useState<Tab>("statistics");

  const { data, error, isLoading } = useSWR<AssetData>(
    `/api/asset/${ticker}`,
    fetcher,
  );

  if (error) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-negative">{String(error)}</p>
        <Link
          href="/market/stocks"
          className="text-sm text-brand-deep link-underline mt-2 inline-block"
        >
          ← Voltar para Stocks
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="px-8 py-6 space-y-2">
        <div className="h-8 w-48 shimmer" />
        <div className="h-96 shimmer" />
        <div className="h-32 shimmer" />
      </div>
    );
  }

  const quote = data.quote;
  const price = quote?.price ?? quote?.c ?? 0;
  const change = quote?.change ?? quote?.d ?? 0;
  const changePercent = quote?.changePercent ?? quote?.dp ?? 0;
  const vm = normalizeAsset(data);
  if (!vm) {
    // Defensive fallback: never return null on BR pages where some fields may
    // be missing — render a minimal page with just the ticker so we never end
    // up with a blank screen.
    return (
      <div className="max-w-[1920px] mx-auto bg-canvas text-ink px-8 py-10">
        <Link
          href="/market/stocks"
          className="label label-muted-2 hover:text-ink"
        >
          ← Back to Stocks
        </Link>
        <h1 className="font-display text-[28px] text-ink mt-4 mb-2">
          {data.ticker}
        </h1>
        <p className="text-muted text-sm">
          Asset data unavailable for this ticker.
        </p>
      </div>
    );
  }
  const { name, exchange, industry, currency, currencySymbol, marketCap, source } = vm;

  const formatPrice = (n: number | undefined | null) =>
    formatByCurrency(n, currency, currencySymbol);

  const dataSourceLabel =
    source === "brapi"
      ? "Brapi · B3"
      : "Delayed 15 min · Yahoo Finance";

  return (
    <div className="max-w-[1920px] mx-auto bg-canvas text-ink">
      {/* ============= BREADCRUMB BAR (42px, canvas-soft) ============= */}
      <div className="h-[42px] bg-canvas-soft border-b border-hairline-strong px-8 flex items-center justify-between">
        <div className="label flex items-center gap-2">
          <Link href="/market/stocks" className="text-brand-deep link-underline">
            Stocks
          </Link>
          <span className="text-faint">›</span>
          <Link
            href={`/market/stocks?q=${encodeURIComponent(industry)}`}
            className="text-brand-deep link-underline"
          >
            {industry}
          </Link>
          <span className="text-faint">›</span>
          <span className="text-ink">{data.ticker}</span>
        </div>
        <div className="label label-muted-2">{dataSourceLabel}</div>
      </div>

      {/* ============= HERO ============= */}
      <div className="px-8 pt-[30px] pb-[26px] border-b border-hairline-strong">
        <Link
          href="/market/stocks"
          className="inline-flex items-center gap-1.5 label label-muted-2 hover:text-ink mb-3 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>

        <div className="flex items-end gap-6">
          <div className="flex items-end gap-5">
            <div className="w-[60px] h-[60px] bg-ink flex items-center justify-center shrink-0">
              <span className="font-display text-[15px] text-canvas leading-none font-bold">
                {data.ticker.slice(0, 4)}
              </span>
            </div>
            <div className="pb-1">
              <h1 className="font-display text-[30px] text-ink tracking-[-0.03em] leading-none mb-2">
                {name}
              </h1>
              <div className="label label-muted-2">
                {exchange}: {data.ticker} · {industry}
              </div>
            </div>
          </div>

          <div className="border-l border-hairline-strong pl-[34px] pb-1">
            <div className="flex items-baseline gap-4">
              <span className="num num-xxl text-ink leading-none">
                {formatPrice(price)}
              </span>
              <span
                className={cn(
                  "num text-[17px]",
                  changePercent >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {change >= 0 ? "+" : "−"}
                {Math.abs(change).toFixed(2)}{" "}
                <span className="ml-1">
                  ({changePercent >= 0 ? "+" : "−"}
                  {Math.abs(changePercent).toFixed(2)}%)
                </span>
              </span>
            </div>
            <div className="label label-muted-2 mt-2">
              {exchange} session · {currency}
              {quote?.prevClose ? (
                <span className="ml-2">
                  · prev close {formatPrice(quote.prevClose)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <WatchlistButton symbol={data.ticker} />
            <CompareButton symbol={data.ticker} />
            <AddToPortfolioButton symbol={data.ticker} />
          </div>
        </div>
      </div>

      {/* ============= MAIN SPLIT (1fr 320px) ============= */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 320px" }}>
        {/* LEFT — chart + scores + fundamentals */}
        <div className="border-r border-hairline-strong">
          <div className="px-8 pt-6 pb-2">
            <PriceChart ticker={data.ticker} />
          </div>

          {/* Fundamentals — exhaustive list, 7 categories */}
          <div className="px-8 pt-6 pb-6 border-t border-hairline-strong">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-[18px] text-ink tracking-[-0.03em]">
                Fundamentals
              </h2>
              <span className="label-s label-muted-2">
                {data.secAsOf
                  ? `As of ${data.secAsOf.slice(0, 10)}`
                  : "FY2025 · TTM"}
              </span>
            </div>
            {isBrazilianTicker(data.ticker) && (
              <div className="mb-6">
                <CvmFundamentalsPanel ticker={data.ticker} />
              </div>
            )}
            <AllFundamentals
                finviz={data.finviz}
                metrics={data.metrics}
                currency={currency}
              />
          </div>

          {industry === "ETF" && (
            <div className="px-8 py-4 border-t border-hairline-strong">
              <EtfHoldings ticker={data.ticker} />
            </div>
          )}

          {(tab === "news" || tab === "events") && (
            <div className="px-8 py-6 border-t border-hairline-strong">
              <div className="flex items-center gap-1 mb-4 border-b border-hairline-strong">
                <button
                  onClick={() => setTab("news")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 label border-b-2 -mb-px transition-colors",
                    tab === "news"
                      ? "text-ink border-brand-deep"
                      : "text-muted border-transparent hover:text-ink",
                  )}
                >
                  <Newspaper className="w-3 h-3" />
                  News
                </button>
                <button
                  onClick={() => setTab("events")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 label border-b-2 -mb-px transition-colors",
                    tab === "events"
                      ? "text-ink border-brand-deep"
                      : "text-muted border-transparent hover:text-ink",
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  Events
                </button>
              </div>
              {tab === "news" && <NewsTab ticker={data.ticker} />}
              {tab === "events" && <EventsTab ticker={data.ticker} />}
            </div>
          )}
        </div>

        {/* RIGHT — 380px rail */}
        <aside className="px-6 py-6 space-y-6">
          <section>
            <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em]">
              Session
            </h3>
            <div className="border-t border-hairline-strong">
              <RailRow label="Open" value={formatPrice(quote?.dayOpen ?? quote?.o)} />
              <RailRow label="Previous close" value={formatPrice(quote?.prevClose ?? quote?.pc)} />
              <RailRow
                label="Day range"
                value={
                  quote?.dayLow || quote?.dayHigh
                    ? `${formatPrice(quote?.dayLow ?? quote?.l)} – ${formatPrice(quote?.dayHigh ?? quote?.h)}`
                    : "—"
                }
              />
              <RailRow
                label="Volume"
                value={quote?.volume ? `${currencySymbol}${formatCompact(quote.volume)}` : "—"}
              />
              <RailRow
                label="Market cap"
                value={marketCap ? `${currencySymbol}${formatCompact(marketCap)}` : "—"}
              />
              <RailRow label="Exchange" value={exchange} />
              <RailRow label="Currency" value={currency} />
              <RailRow label="Sector" value={industry} />
            </div>
          </section>

          <RangeBlock
            low={quote?.dayLow ?? quote?.l ?? 0}
            high={quote?.dayHigh ?? quote?.h ?? 0}
            current={price}
          />

          <EventsPreview ticker={data.ticker} />

          <NewsForTickers
            tickers={[data.ticker]}
            title="News"
            showAllHref="/news"
            limit={6}
          />

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-display text-[14px] text-ink tracking-[-0.02em]">
                Quant scores
              </h3>
              <span className="label-s label-muted-2">68 peers</span>
            </div>
            <AssetScores ticker={data.ticker} compact />
          </section>
        </aside>
      </div>
    </div>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between h-8 px-3 border-b border-hairline">
      <span className="label-s label-muted-2">{label}</span>
      <span className="num text-[12.5px] text-ink">{value}</span>
    </div>
  );
}

function RangeBlock({
  low,
  high,
  current,
}: {
  low: number;
  high: number;
  current: number;
}) {
  const L = low || (current ? current * 0.85 : 0);
  const H = high || (current ? current * 1.15 : 0);
  const pct = H > L ? Math.min(100, Math.max(0, ((current - L) / (H - L)) * 100)) : 0;
  const tickPct = H > L ? 50 : 0;

  return (
    <section>
      <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em]">
        52w range
      </h3>
      <div className="border-t border-hairline-strong pt-3">
        <div className="relative h-1.5 bg-surface mb-2">
          <div
            className="absolute left-0 top-0 bottom-0 bg-brand"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-[-5px] w-0.5 h-4 bg-ink"
            style={{ left: `${tickPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="num text-[11px] text-muted">L {L ? L.toFixed(2) : "—"}</span>
          <span className="num text-[11px] text-ink font-medium">
            Now {current ? current.toFixed(2) : "—"}
          </span>
          <span className="num text-[11px] text-muted">H {H ? H.toFixed(2) : "—"}</span>
        </div>
      </div>
    </section>
  );
}

function EventsPreview({ ticker }: { ticker: string }) {
  const { data } = useSWR<{
    events: Array<{ date: string; type: string; description: string }>;
  }>(`/api/events/${ticker}`, fetcher);
  const events = data?.events ?? [];
  const upcoming = events.slice(0, 4);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-[16px] text-ink tracking-[-0.02em]">
          Events
        </h3>
      </div>
      <div className="border-t border-hairline-strong">
        {upcoming.length === 0 ? (
          <div className="py-4 text-faint text-[12px]">No upcoming events.</div>
        ) : (
          upcoming.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-3 h-[60px] px-3 border-b border-hairline hover-row"
            >
              <span className="num text-[10px] text-brand-deep w-[52px] shrink-0 pt-1">
                {e.date}
              </span>
              <div className="flex-1 min-w-0 pt-1">
                <div className="label-s label-muted-2 mb-1">{e.type}</div>
                <div className="text-[12px] text-ink truncate">{e.description}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  relatedTickers?: string[];
};

function NewsTab({ ticker }: { ticker: string }) {
  const { data, isLoading } = useSWR<{ news: NewsItem[] }>(
    `/api/news/multi/${ticker}`,
    fetcher,
  );
  const [openArticle, setOpenArticle] = useState<NewsItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 shimmer" />
        ))}
      </div>
    );
  }

  const news = data?.news ?? [];

  if (news.length === 0) {
    return (
      <div className="border-t border-hairline-strong py-12 text-center">
        <Newspaper className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-muted text-sm">No recent news for this ticker.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {news.slice(0, 20).map((n) => (
        <button
          key={n.id}
          onClick={() => setOpenArticle(n)}
          className="w-full text-left block border border-hairline-strong hover:bg-canvas-soft transition-colors group p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap label-s label-muted-2">
                <span>{n.source}</span>
                <span>·</span>
                <span>
                  {new Date(n.datetime * 1000).toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <h4 className="text-[13px] text-ink group-hover:text-brand-deep transition-colors mb-1 leading-snug">
                {n.headline}
              </h4>
              {n.summary && (
                <p className="text-[12px] text-muted line-clamp-2 leading-relaxed">
                  {n.summary}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}

      {openArticle && <NewsModal article={openArticle} onClose={() => setOpenArticle(null)} />}
    </div>
  );
}

function NewsModal({ article, onClose }: { article: NewsItem; onClose: () => void }) {
  const [content, setContent] = useState<{
    text: string | null;
    status: "loading" | "ready" | "unavailable";
  }>({ text: null, status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setContent({ text: null, status: "loading" });
    fetch(`/api/news/article?url=${encodeURIComponent(article.url)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.content) setContent({ text: d.content, status: "ready" });
        else setContent({ text: null, status: "unavailable" });
      })
      .catch(() => {
        if (!cancelled) setContent({ text: null, status: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [article.url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: "color-mix(in srgb, var(--canvas-soft) 78%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="bg-canvas border border-hairline-strong max-w-3xl w-full my-12 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 py-[15px] border-b border-hairline-strong flex items-center justify-between">
          <div className="label label-muted-2">
            <span className="text-brand-deep mr-2">{article.source}</span>
            <span>
              {new Date(article.datetime * 1000).toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 border border-hairline-strong flex items-center justify-center hover:bg-canvas-soft text-ink press"
          >
            <span className="text-[10px]">✕</span>
          </button>
        </div>
        <div className="px-7 py-[28px] max-h-[60vh] overflow-y-auto">
          <h2 className="font-display text-[28px] text-ink mb-5 tracking-[-0.03em] leading-[1.15]">
            {article.headline}
          </h2>
          {content.status === "loading" && (
            <div className="py-12 text-muted text-sm text-center">Loading…</div>
          )}
          {content.status === "unavailable" && (
            <div className="text-center py-8">
              <p className="text-muted text-sm mb-4">
                Couldn&apos;t extract full content from this article.
              </p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="label text-brand-deep link-underline"
              >
                Open in original portal →
              </a>
            </div>
          )}
          {content.status === "ready" && content.text && (
            <div
              className="text-[15.5px] text-body leading-[1.72] text-pretty"
              style={{ maxWidth: "68ch" }}
            >
              {article.summary && <p className="text-body mb-4">{article.summary}</p>}
              <p className="text-muted">{content.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventsTab({ ticker }: { ticker: string }) {
  const { data, isLoading } = useSWR<{
    events: Array<{ date: string; type: string; description: string }>;
  }>(`/api/events/${ticker}`, fetcher);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 shimmer" />
        ))}
      </div>
    );
  }

  const events = data?.events ?? [];

  if (events.length === 0) {
    return (
      <div className="border-t border-hairline-strong py-12 text-center">
        <Calendar className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-muted text-sm">No upcoming events.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-hairline-strong">
      {events.map((e, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-hairline last:border-0"
        >
          <div className="num text-[10px] uppercase text-brand-deep w-[52px] shrink-0">
            {e.date}
          </div>
          <div className="label-s label-muted-2 w-[100px] shrink-0">{e.type}</div>
          <div className="flex-1 text-[13px] text-ink">{e.description}</div>
        </div>
      ))}
    </div>
  );
}