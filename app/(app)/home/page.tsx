"use client";

/**
 * /home — dashboard principal.
 *
 * Layout 3-colunas:
 *   ┌──────────┬───────────────────────────────┬──────────┐
 *   │ Carteira │   Cotações oficiais           │ Notícias │
 *   │  (hero)  │   (header interno + filter    │  (feed)  │
 *   │          │    + search + tabela)         │          │
 *   ├──────────┤                               │          │
 *   │ Notícia  │                               │          │
 *   │ do dia   │                               │          │
 *   └──────────┴───────────────────────────────┴──────────┘
 *                              [dock só ícones]
 *
 * Dados:
 *   - /api/auth/me              → nome
 *   - /api/portfolio/summary    → patrimônio
 *   - /api/assets/quote?type=…  → cotações paginadas
 *   - /api/news/multi           → feed B3 (Google News, infinite scroll)
 */

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";

import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import { StaggerOnMount, staggerParentVariants } from "@/components/foundation/stagger";
import { StatusBar } from "@/components/foundation/status-bar";
import { TypedGreeting } from "@/components/foundation/typed-greeting";
import { DayHighlightCard } from "@/components/home/day-highlight-card";
import { NewsFeed, type NewsItem } from "@/components/home/news-feed";
import {
  PortfolioCard,
  type PortfolioCardState,
} from "@/components/home/portfolio-card";
import { QuotationsTable, type QuoteRow } from "@/components/home/quotations-table";

type AssetType = "stock" | "fii" | "etf" | "bdr";

const PAGE_SIZE = 50;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage(): JSX.Element {
  const [userName, setUserName] = useState<string>("");

  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [search, setSearch] = useState("");
  const [pageCache, setPageCache] = useState<Map<number, QuoteRow[]>>(
    () => new Map(),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [loadingPageNav, setLoadingPageNav] = useState(false);
  const inFlightPageRef = useRef<number | null>(null);

  const [portfolio, setPortfolio] = useState<PortfolioCardState>({
    kind: "loading",
  });

  const [highlight, setHighlight] = useState<{
    headline: string;
    source: string;
    url: string;
    relatedCount: number;
  } | null>(null);
  const [highlightLoading, setHighlightLoading] = useState(true);

  // ── News (2026-09-02: sistema simplificado, Google News RSS único) ──
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsLoadingMore, setNewsLoadingMore] = useState(false);
  const [newsCursor, setNewsCursor] = useState<number | null>(null);
  const [newsHasMore, setNewsHasMore] = useState(true);

  // ── User name ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { user?: { username?: string } };
        if (!cancelled && data.user?.username) setUserName(data.user.username);
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Quotes (paginado) ──────────────────────────────────────────────────────
  // Reset completo quando muda o tipo (cache vira do tipo novo).
  useEffect(() => {
    setPageCache(new Map());
    setCurrentPage(1);
    setTotalPages(1);
    setTotal(0);
    setQuotesLoading(true);
    void fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType]);

  // Quando currentPage muda, busca a página se ainda não tá no cache.
  useEffect(() => {
    if (pageCache.has(currentPage)) return;
    if (inFlightPageRef.current === currentPage) return;
    void fetchPage(currentPage, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  async function fetchPage(page: number, isInitial: boolean) {
    if (inFlightPageRef.current === page) return;
    inFlightPageRef.current = page;
    if (isInitial) setQuotesLoading(true);
    else setLoadingPageNav(true);
    try {
      const url = `/api/assets/quote?type=${assetType}&page=${page}&pageSize=${PAGE_SIZE}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as {
        rows?: QuoteApiRow[];
        page?: number;
        totalPages?: number;
        total?: number;
      };
      const mapped = (data.rows ?? []).map(toQuoteRow);
      setPageCache((prev) => {
        const next = new Map(prev);
        next.set(page, mapped);
        return next;
      });
      setCurrentPage(data.page ?? page);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      setTotal(data.total ?? 0);
    } catch {
      // silent — usuário vê a página anterior no cache
    } finally {
      inFlightPageRef.current = null;
      if (isInitial) setQuotesLoading(false);
      else setLoadingPageNav(false);
    }
  }

  const loadNextPage = useCallback(() => {
    if (inFlightPageRef.current != null) return;
    const next = currentPage + 1;
    if (next > totalPages) return;
    void fetchPage(next, false);
  }, [currentPage, totalPages, assetType]);

  // Rows da página atual — só atualiza quando o cache da página atual muda.
  const rows = pageCache.get(currentPage) ?? [];

  // ── Portfolio ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/portfolio/summary", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          hasPortfolio: boolean;
          name?: string;
          totalValue?: number;
          changeToday?: number;
          changeTodayPercent?: number;
          currency?: "BRL" | "USD";
        };
        if (cancelled) return;

        if (!data.hasPortfolio) {
          setPortfolio({ kind: "empty", name: data.name ?? null });
          return;
        }
        setPortfolio({
          kind: "ready",
          name: data.name ?? "Arthur",
          totalValue: data.totalValue ?? 0,
          changeToday: data.changeToday ?? 0,
          changeTodayPercent: data.changeTodayPercent ?? 0,
          currency: data.currency ?? "BRL",
        });
      } catch {
        if (!cancelled) setPortfolio({ kind: "error" });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── News (fetch + paginação) ───────────────────────────────────────────────
  const fetchNews = useCallback(
    async (cursor: number | null = null) => {
      if (cursor === null) setNewsLoading(true);
      else setNewsLoadingMore(true);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (cursor !== null) params.set("cursor", String(cursor));
        const r = await fetch(`/api/news/multi?${params}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          news?: Array<NewsItem & { datetime?: number }>;
        };
        const items = data.news ?? [];
        const mapped: NewsItem[] = items.map((n) => ({
          id: n.id,
          title: n.title,
          source: n.source,
          publishedAt: n.publishedAt,
          url: n.url,
        }));
        setNews((prev) => (cursor === null ? mapped : [...prev, ...mapped]));
        if (items.length > 0) {
          const oldest = Math.min(
            ...items.map(
              (n) =>
                n.datetime ??
                Math.floor(new Date(n.publishedAt).getTime() / 1000),
            ),
          );
          setNewsCursor(oldest);
        }
        setNewsHasMore(items.length >= 20);
      } catch {
        if (cursor === null) setNews([]);
      } finally {
        setNewsLoading(false);
        setNewsLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchNews(null);
  }, [fetchNews]);

  const loadMoreNews = useCallback(() => {
    if (newsLoadingMore || !newsHasMore || newsCursor === null) return;
    void fetchNews(newsCursor);
  }, [fetchNews, newsCursor, newsHasMore, newsLoadingMore]);

  // Highlight do dia: sem endpoint server-side ainda; deixa loading false
  // pra mostrar o card vazio em vez de skeleton perpétuo.
  useEffect(() => {
    setHighlightLoading(false);
  }, []);

  const todayText = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#070709" }}>
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-6 pb-32"
      >
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <TypedGreeting name={userName} size="lg" />
          <StatusBar />
        </div>

        {/* 3-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_360px] gap-5 items-stretch">
          {/* Coluna esquerda */}
          <div
            className="flex flex-col gap-5"
            style={{ maxHeight: "calc(100dvh - 240px)" }}
          >
            <StaggerOnMount className="flex-1 min-h-0 flex">
              <PortfolioCard state={portfolio} className="h-full w-full" />
            </StaggerOnMount>
            <StaggerOnMount>
              <DayHighlightCard
                className="h-full"
                headline={highlight?.headline ?? null}
                source={highlight?.source ?? null}
                url={highlight?.url ?? null}
                relatedCount={highlight?.relatedCount}
                dateText={todayText}
                loading={highlightLoading}
              />
            </StaggerOnMount>
          </div>

          {/* Coluna central */}
          <StaggerOnMount
            className="flex-1 min-h-0 flex"
            style={{ maxHeight: "calc(100dvh - 240px)" }}
          >
            <QuotationsTable
              className="h-full w-full"
              rows={rows}
              allRows={Array.from(pageCache.values()).flat()}
              onSearchMissNextPage={loadNextPage}
              hasMorePages={currentPage < totalPages}
              loadingPageNav={loadingPageNav}
              loading={quotesLoading}
              onRetry={() => fetchPage(currentPage, true)}
              assetType={assetType}
              onAssetTypeChange={setAssetType}
              search={search}
              onSearchChange={setSearch}
              page={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => {
                setCurrentPage(p);
              }}
            />
          </StaggerOnMount>

          {/* Coluna direita — NewsFeed alinha ao fim do card de cotações via
              maxHeight + flex; infinite scroll sem barra de scroll visível */}
          <StaggerOnMount
            className="flex flex-col"
            style={{ maxHeight: "calc(100dvh - 240px)" }}
          >
            <NewsFeed
              items={news}
              loading={newsLoading}
              loadingMore={newsLoadingMore}
              onLoadMore={loadMoreNews}
              hasMore={newsHasMore}
              onRetry={() => fetchNews(null)}
              className="flex-1 min-h-0"
            />
          </StaggerOnMount>
        </div>
      </motion.main>

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── API mappers ─────────────────────────────────────────────────────────────

type QuoteApiRow = {
  symbol: string;
  sector?: string;
  longName?: string | null;
  type?: "stock" | "fii" | "etf" | "bdr";
  quote: {
    price: number | null;
    currency: "BRL" | "USD";
    changePercent: number | null;
    changePercent7d?: number | null;
    changePercent30d?: number | null;
    volume: number | null;
  } | null;
  metrics?: {
    marketCap: number | null;
  };
};

function toQuoteRow(r: QuoteApiRow): QuoteRow {
  return {
    symbol: r.symbol,
    longName: r.longName ?? null,
    sector: r.sector ?? "—",
    price: r.quote?.price ?? null,
    currency: r.quote?.currency ?? "BRL",
    changePercent: r.quote?.changePercent ?? null,
    changePercent7d: r.quote?.changePercent7d ?? null,
    changePercent30d: r.quote?.changePercent30d ?? null,
    volume: r.quote?.volume ?? null,
    marketCap: r.metrics?.marketCap ?? null,
    type: r.type ?? "stock",
  };
}
