"use client";

/**
 * /home-debug — página de teste isolada do news feed.
 *
 * OBJETIVO: isolar se o travamento do /home é causado pelo NewsFeed/
 * NewsCard/tagTickers OU pela interação entre News + outro componente
 * (dock aceternity, TypedGreeting, PortfolioCard, etc).
 *
 * Esta página tem APENAS:
 *   - NewsFeed com fetch real de /api/news/multi
 *   - 6 cards (mesmo maxItems do /home)
 *   - Background escuro
 *
 * NÃO TEM:
 *   - AnimatedFloatingDock (aceternity)
 *   - TypedGreeting (typewriter com setInterval 38ms)
 *   - PortfolioCard
 *   - QuotationsTable
 *   - DayHighlightCard
 *   - StaggerOnMount / motion variants
 *
 * COMO TESTAR:
 *   1. Abrir https://screener-production-4f58.up.railway.app/home-debug
 *   2. Aguardar fetch (~1-8s cold) + ver 6 cards
 *   3. Deixar página idle por 30s — se CPU ficar > 5% sem mover mouse,
 *      tem loop de re-render
 *   4. Mover mouse sobre os cards — se travar ao passar, é problema
 *      de mouse events
 *   5. F12 → Performance tab → gravar 10s → ver se há "Scripting" alto
 *
 * Remover após diagnóstico.
 */

import { useEffect, useState } from "react";
import type { JSX } from "react";

import { NewsFeed, type NewsItem } from "@/components/home/news-feed";

type NewsApiItem = {
  id: string;
  headline: string;
  source: string;
  publishedAt?: string;
  datetime?: number;
  url: string;
  tickers?: string[];
  relatedTickers?: string[];
};

function toNewsItem(n: NewsApiItem): NewsItem {
  const publishedAt =
    n.publishedAt ??
    (typeof n.datetime === "number" && n.datetime > 0
      ? new Date(n.datetime * 1000).toISOString()
      : new Date().toISOString());
  return {
    id: n.id,
    headline: n.headline,
    source: n.source,
    publishedAt,
    url: n.url,
    tickers: n.tickers ?? n.relatedTickers ?? [],
  };
}

export default function HomeDebugPage(): JSX.Element {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchMs, setFetchMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    async function load() {
      try {
        const r = await fetch("/api/news/multi", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { news?: NewsApiItem[] };
        const items = (data.news ?? []).slice(0, 30);
        const mapped = items.map(toNewsItem);
        if (!cancelled) {
          setNews(mapped);
          setFetchMs(Math.round(performance.now() - t0));
        }
      } catch (e) {
        if (!cancelled) {
          setFetchMs(Math.round(performance.now() - t0));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="min-h-screen text-foreground p-8"
      style={{ background: "#070709" }}
    >
      <div className="mb-4 text-[12px] text-muted-foreground/70">
        /home-debug — só NewsFeed + fetch real. Sem dock, sem typewriter, sem
        portfolio.{" "}
        {fetchMs !== null && (
          <span>
            fetch: <strong className="text-foreground">{fetchMs}ms</strong>
          </span>
        )}
      </div>

      <div className="max-w-[400px] mx-auto">
        <NewsFeed items={news} loading={loading} maxItems={6} />
      </div>
    </div>
  );
}
