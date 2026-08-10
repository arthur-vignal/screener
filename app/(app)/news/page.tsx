"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Newspaper,
  Search,
  Loader2,
  Star,
  StarOff,
  X,
  Calendar,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NewsItem = {
  id: string;
  ticker?: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category?: "yahoo" | "google" | "sec";
  relatedTickers?: string[];
};

const TIER1_SOURCES = new Set([
  "reuters",
  "bloomberg",
  "associated press",
  "wall street journal",
  "wsj",
  "financial times",
  "ft.com",
  "new york times",
  "nytimes",
  "barron's",
  "cnbc",
  "marketwatch",
  "forbes",
  "morningstar",
  "investopedia",
  "business insider",
  "yahoo finance",
]);

const FEED_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "WMT", "HD", "PG", "JNJ", "XOM", "CVX", "UNH", "LLY",
  "AVGO", "MA", "COST", "ABBV", "BAC", "NFLX", "CRM", "AMD",
  "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD",
  "SPY", "QQQ", "IWM", "GLD", "TLT",
];

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", GOOGL: "Technology", AMZN: "Retail",
  NVDA: "Semiconductors", META: "Technology", TSLA: "Automobiles", JPM: "Banking",
  WMT: "Retail", HD: "Retail", PG: "Consumer Staples", JNJ: "Healthcare",
  XOM: "Energy", CVX: "Energy", UNH: "Healthcare", LLY: "Pharmaceuticals",
  AVGO: "Semiconductors", MA: "Financial Services", COST: "Retail", ABBV: "Pharmaceuticals",
  BAC: "Banking", NFLX: "Media", CRM: "Technology", AMD: "Semiconductors",
  "BTC-USD": "Cryptocurrency", "ETH-USD": "Cryptocurrency", "SOL-USD": "Cryptocurrency",
  "BNB-USD": "Cryptocurrency",
  SPY: "ETF", QQQ: "ETF", IWM: "ETF", GLD: "Commodity ETF", TLT: "Bond ETF",
};

function sourceTier(source: string): 1 | 2 | 3 {
  const s = source.toLowerCase();
  if (Array.from(TIER1_SOURCES).some((t1) => s.includes(t1))) return 1;
  return 2;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [tickerFilter, setTickerFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [tierOnly, setTierOnly] = useState(false);

  // Modal state
  const [openArticle, setOpenArticle] = useState<NewsItem | null>(null);

  useEffect(() => {
    const tickersParam = FEED_TICKERS.slice(0, 25).join(",");
    fetch(`/api/news/multi/${tickersParam}`)
      .then((r) => r.json())
      .then((d) => {
        setNews(d.news ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!openArticle) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenArticle(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openArticle]);

  const filtered = useMemo(() => {
    return news.filter((n) => {
      if (search && !`${n.headline} ${n.summary}`.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (sectorFilter !== "all" && (!n.ticker || (n.ticker ? SECTOR_MAP[n.ticker] : undefined) !== sectorFilter)) {
        return false;
      }
      if (tickerFilter !== "all" && n.ticker !== tickerFilter) {
        return false;
      }
      if (sourceFilter !== "all" && n.source !== sourceFilter) {
        return false;
      }
      if (tierOnly && sourceTier(n.source) !== 1) {
        return false;
      }
      return true;
    });
  }, [news, search, sectorFilter, tickerFilter, sourceFilter, tierOnly]);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    news.forEach((n) => {
      const sec = n.ticker ? (n.ticker ? SECTOR_MAP[n.ticker] : undefined) : undefined;
      if (sec) s.add(sec);
    });
    return Array.from(s).sort();
  }, [news]);

  const tickersInFeed = useMemo(() => {
    const t = new Set<string>();
    news.forEach((n) => { if (n.ticker) t.add(n.ticker); });
    return Array.from(t).sort();
  }, [news]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    news.forEach((n) => s.add(n.source));
    return Array.from(s).sort();
  }, [news]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    news.forEach((n) => {
      counts[n.source] = (counts[n.source] ?? 0) + 1;
    });
    return counts;
  }, [news]);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">News</h1>
          <p className="text-sm text-body">
            Feed consolidado de {FEED_TICKERS.length} ativos via Yahoo Finance + Google News + SEC EDGAR.
          </p>
        </div>
        {!loading && (
          <div className="text-xs text-muted text-right">
            <div>{news.length} artigos · {sources.length} fontes</div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-hairline bg-surface p-4 mb-6">
        <div className="relative mb-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            strokeWidth={2}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por palavra-chave..."
            className="w-full bg-canvas-soft border border-hairline rounded-md pl-10 pr-4 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted font-medium block mb-2">
              Setor
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand"
            >
              <option value="all">Todos os setores</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted font-medium block mb-2">
              Ticker
            </label>
            <select
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="w-full bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand"
            >
              <option value="all">Todos os tickers</option>
              {tickersInFeed.map((t) => (
                <option key={t} value={t}>
                  {t} ({SECTOR_MAP[t] ?? "—"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted font-medium block mb-2">
              Fonte
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand"
            >
              <option value="all">Todas as fontes</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s} ({sourceCounts[s] ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setTierOnly(!tierOnly)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors",
              tierOnly
                ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                : "border-hairline text-muted hover:text-ink"
            )}
          >
            {tierOnly ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
            Apenas fontes premium (Reuters, Bloomberg, WSJ, FT, CNBC...)
          </button>
        </div>
      </div>

      <div className="text-xs text-muted mb-3">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Carregando feed de {FEED_TICKERS.slice(0, 25).length} tickers (3 fontes)...
          </span>
        ) : (
          <span>{filtered.length} de {news.length} notícias · {tickersInFeed.length} tickers · {sources.length} fontes</span>
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-lg border border-hairline bg-surface p-12 text-center">
          <Newspaper className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-body text-sm">
            Sem notícias pra esses filtros. Tente outro ticker ou setor.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.slice(0, 50).map((n) => {
          const tier = sourceTier(n.source);
          return (
            <button
              key={n.id}
              onClick={() => setOpenArticle(n)}
              className="w-full text-left block rounded-lg border border-hairline bg-surface p-4 hover:bg-surface-elevated/60 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {n.ticker && (
                      <span className="font-mono font-semibold text-xs text-brand-bright">
                        {n.ticker}
                      </span>
                    )}
                    {(n.ticker ? SECTOR_MAP[n.ticker] : undefined) && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-elevated/60 text-muted">
                        {(n.ticker ? SECTOR_MAP[n.ticker] : undefined)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        tier === 1 ? "text-amber-300" : "text-muted"
                      )}
                    >
                      {n.source}
                    </span>
                    {tier === 1 && <Star className="w-3 h-3 fill-amber-300 text-amber-300" />}
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-muted">
                      {new Date(n.datetime * 1000).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h4 className="font-medium text-ink group-hover:text-brand-bright transition-colors mb-1">
                    {n.headline}
                  </h4>
                  {n.summary && (
                    <p className="text-sm text-body line-clamp-2">{n.summary}</p>
                  )}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {openArticle && (
        <ArticleModal article={openArticle} onClose={() => setOpenArticle(null)} />
      )}
    </div>
  );
}

function ArticleModal({ article, onClose }: { article: NewsItem; onClose: () => void }) {
  const [content, setContent] = useState<{ text: string | null; status: "loading" | "ready" | "unavailable" }>(
    { text: null, status: "loading" },
  );

  useEffect(() => {let cancelled = false;
    setContent({ text: null, status: "loading" });
    fetch(`/api/news/article?url=${encodeURIComponent(article.url)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.content) {
          setContent({ text: d.content, status: "ready" });
        } else {
          setContent({ text: null, status: "unavailable" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setContent({ text: null, status: "unavailable" });
      });return () => {
      cancelled = true;
    };
  }, [article.url]);

  const tier = sourceTier(article.source);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-hairline rounded-lg max-w-3xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-hairline">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {article.ticker && (
                <Link
                  href={`/asset/${encodeURIComponent(article.ticker)}`}
                  className="font-mono font-semibold text-xs text-brand-bright hover:underline"
                  onClick={onClose}
                >
                  {article.ticker}
                </Link>
              )}
              {(article.ticker ? SECTOR_MAP[article.ticker] : undefined) && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-elevated/60 text-muted">
                  {(article.ticker ? SECTOR_MAP[article.ticker] : undefined)}
                </span>
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  tier === 1 ? "text-amber-300" : "text-muted"
                )}
              >
                {article.source}
              </span>
              {tier === 1 && <Star className="w-3 h-3 fill-amber-300 text-amber-300" />}
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(article.datetime * 1000).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h2 className="text-xl font-semibold leading-tight">{article.headline}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-elevated/60 rounded-md transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {content.status === "loading" && (
            <div className="flex items-center justify-center py-12 text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando conteúdo...
            </div>
          )}
          {content.status === "unavailable" && (
            <div className="text-center py-8">
              <Globe className="w-10 h-10 text-muted mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-body text-sm mb-4">
                Não conseguimos extrair o conteúdo completo desta notícia.
              </p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-bright hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir no portal original
              </a>
            </div>
          )}
          {content.status === "ready" && content.text && (
            <div className="prose prose-invert max-w-none">
              {article.summary && (
                <p className="text-base text-ink font-medium mb-4 leading-relaxed">
                  {article.summary}
                </p>
              )}
              <div className="text-sm text-body leading-relaxed whitespace-pre-line">
                {content.text}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-hairline p-4 flex items-center justify-between text-xs text-muted">
          <span className="truncate flex-1 mr-4">{article.url}</span>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-brand-bright hover:underline shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir no {article.source}
          </a>
        </div>
      </div>
    </div>
  );
}
