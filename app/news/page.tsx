"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ExternalLink, Newspaper, Search, Loader2 } from "lucide-react";

type NewsItem = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  relatedTickers?: string[];
};

// Feed principal: 30 tickers top (top US + crypto + ETFs)
const FEED_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "WMT", "HD", "PG", "JNJ", "XOM", "CVX", "UNH", "LLY",
  "AVGO", "MA", "COST", "ABBV", "BAC", "NFLX", "CRM", "AMD",
  "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "ADA-USD",
  "SPY", "QQQ", "IWM", "GLD", "TLT",
];

// Mapeamento ticker -> setor
const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", GOOGL: "Technology", AMZN: "Retail",
  NVDA: "Semiconductors", META: "Technology", TSLA: "Automobiles", JPM: "Banking",
  WMT: "Retail", HD: "Retail", PG: "Consumer Staples", JNJ: "Healthcare",
  XOM: "Energy", CVX: "Energy", UNH: "Healthcare", LLY: "Pharmaceuticals",
  AVGO: "Semiconductors", MA: "Financial Services", COST: "Retail", ABBV: "Pharmaceuticals",
  BAC: "Banking", NFLX: "Media", CRM: "Technology", AMD: "Semiconductors",
  "BTC-USD": "Cryptocurrency", "ETH-USD": "Cryptocurrency", "SOL-USD": "Cryptocurrency",
  "BNB-USD": "Cryptocurrency", "ADA-USD": "Cryptocurrency",
  SPY: "ETF", QQQ: "ETF", IWM: "ETF", GLD: "Commodity ETF", TLT: "Bond ETF",
};

export default function NewsPage() {
  const [news, setNews] = useState<(NewsItem & { ticker: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [tickerFilter, setTickerFilter] = useState<string>("all");

  // Carrega news
  useEffect(() => {
    Promise.all(
      FEED_TICKERS.map((t) =>
        fetch(`/api/news/${encodeURIComponent(t)}`)
          .then((r) => r.json())
          .then((d) => ({
            ticker: t,
            news: ((d.news ?? []) as NewsItem[]).map((n) => ({ ...n, ticker: t })),
          }))
          .catch(() => ({ ticker: t, news: [] })),
      ),
    ).then((results) => {
      const all = results.flatMap((r) => r.news);
      all.sort((a, b) => b.datetime - a.datetime);
      setNews(all);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return news.filter((n) => {
      if (search && !`${n.headline} ${n.summary}`.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (sectorFilter !== "all" && SECTOR_MAP[n.ticker] !== sectorFilter) {
        return false;
      }
      if (tickerFilter !== "all" && n.ticker !== tickerFilter) {
        return false;
      }
      return true;
    });
  }, [news, search, sectorFilter, tickerFilter]);

  // Setores únicos
  const sectors = useMemo(() => {
    const s = new Set<string>();
    news.forEach((n) => {
      const sector = SECTOR_MAP[n.ticker];
      if (sector) s.add(sector);
    });
    return Array.from(s).sort();
  }, [news]);

  // Tickers únicos
  const tickersInFeed = useMemo(() => {
    const t = new Set<string>();
    news.forEach((n) => t.add(n.ticker));
    return Array.from(t).sort();
  }, [news]);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">News</h1>
        <p className="text-sm text-text-secondary">
          Feed consolidado de {FEED_TICKERS.length}+ ativos. Filtre por ticker, setor ou busque por palavra-chave.
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-border bg-surface p-4 mb-6">
        <div className="relative mb-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            strokeWidth={2}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por palavra-chave no título ou resumo..."
            className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">
              Setor
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-foreground/30"
            >
              <option value="all">Todos os setores</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">
              Ticker
            </label>
            <select
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-foreground/30"
            >
              <option value="all">Todos os tickers</option>
              {tickersInFeed.map((t) => (
                <option key={t} value={t}>
                  {t} ({SECTOR_MAP[t] ?? "—"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="text-xs text-text-muted mb-3">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Carregando feed...
          </span>
        ) : (
          <span>{filtered.length} notícias · {tickersInFeed.length} tickers</span>
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Newspaper className="w-8 h-8 text-text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-text-secondary text-sm">
            Sem notícias pra esses filtros. Tente outro ticker ou setor.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.slice(0, 50).map((n) => (
          <a
            key={`${n.ticker}-${n.id}`}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-border bg-surface p-4 hover:bg-surface-elevated transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Link
                    href={`/asset/${encodeURIComponent(n.ticker)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono font-semibold text-xs text-accent hover:underline"
                  >
                    {n.ticker}
                  </Link>
                  {SECTOR_MAP[n.ticker] && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted">
                      {SECTOR_MAP[n.ticker]}
                    </span>
                  )}
                  <span className="text-xs text-text-muted">{n.source}</span>
                  <span className="text-xs text-text-muted">·</span>
                  <span className="text-xs text-text-muted">
                    {new Date(n.datetime * 1000).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <h4 className="font-medium text-foreground group-hover:text-accent transition-colors mb-1">
                  {n.headline}
                </h4>
                {n.summary && (
                  <p className="text-sm text-text-secondary line-clamp-2">{n.summary}</p>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
