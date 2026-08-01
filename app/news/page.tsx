"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";


type NewsItem = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  relatedTickers?: string[];
};

// Top 10 ações + 5 cryptos + 3 ETFs como proxy de feed "global"
const FEED_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "XOM", "WMT",
  "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "ADA-USD",
  "SPY", "QQQ", "GLD",
];

export default function NewsPage() {
  const [tickData, setTickData] = useState<Record<string, NewsItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      FEED_TICKERS.map((t) =>
        fetch(`/api/news/${encodeURIComponent(t)}`)
          .then((r) => r.json())
          .then((d) => ({ ticker: t, news: (d.news ?? []) as NewsItem[] }))
          .catch(() => ({ ticker: t, news: [] })),
      ),
    ).then((results) => {
      const map: Record<string, NewsItem[]> = {};
      for (const r of results) {
        map[r.ticker] = r.news;
      }
      setTickData(map);
      setLoading(false);
    });
  }, []);

  const allNews = Object.entries(tickData)
    .flatMap(([ticker, items]) => items.map((n) => ({ ...n, ticker })))
    .sort((a, b) => b.datetime - a.datetime);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">News</h1>
        <p className="text-sm text-text-secondary">
          Feed consolidado dos principais ativos. Cada notícia com tickers relacionados e impacto por setor.
        </p>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-md shimmer" />
          ))}
        </div>
      )}

      {!loading && allNews.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Newspaper className="w-8 h-8 text-text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-text-secondary text-sm">Sem notícias disponíveis.</p>
        </div>
      )}

      {!loading && allNews.length > 0 && (
        <div className="space-y-2">
          {allNews.slice(0, 50).map((n) => (
            <a
              key={`${n.ticker}-${n.id}`}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-border bg-surface p-4 hover:bg-surface-elevated transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/asset/${n.ticker}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono font-semibold text-xs text-accent hover:underline"
                    >
                      {n.ticker}
                    </Link>
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
                  <p className="text-sm text-text-secondary line-clamp-2">{n.summary}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
