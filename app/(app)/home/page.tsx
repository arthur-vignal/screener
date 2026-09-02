"use client";

/**
 * /home — dashboard principal (Fase 2.1).
 *
 * Layout 3-colunas Fey-style:
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
 * Header: "Bom dia/tarde/noite, {nome}" com typewriter (caret piscando).
 * Cards: StaggerOnMount fade+slide-up ao montar.
 * Dock: 48x48, só ícones, hover scale 1.15 + sobe 4px.
 *
 * Dados:
 *   - /api/auth/me → nome do usuário
 *   - /api/portfolio/summary → patrimônio + variação
 *   - /api/assets/quote?symbols=... → cotações
 *   - /api/news/multi → feed
 *   - /api/news/multi?highlight=1 → destaque do dia
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
  // Cache local de páginas: Map<page, QuoteRow[]>. Mantém todas as
  // páginas já carregadas pra search cross-page (sem refazer fetch).
  const [pageCache, setPageCache] = useState<Map<number, QuoteRow[]>>(
    () => new Map(),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [quotesLoading, setQuotesLoading] = useState(true);
  // Loading de fetch em background (prefetch no scroll/search miss).
  const [loadingPageNav, setLoadingPageNav] = useState(false);
  // `useRef` pra evitar que o efeito de reset do assetType reentre em
  // loop quando currentPage ainda não atualizou.
  const inFlightPageRef = useRef<number | null>(null);

  const [portfolio, setPortfolio] = useState<PortfolioCardState>({
    kind: "loading",
  });

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const [highlight, setHighlight] = useState<{
    headline: string;
    source: string;
    url: string;
    relatedCount: number;
  } | null>(null);
  const [highlightLoading, setHighlightLoading] = useState(true);

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

  // Quando currentPage muda (sem ser de reset), busca a página se ainda
  // não tá no cache.
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

  // Prefetch da próxima página quando search cross-page não acha nada.
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

  // ── News ──────────────────────────────────────────────────────────────────
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const r = await fetch("/api/news/multi", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { items?: NewsApiItem[] };
      const mapped = (data.items ?? []).slice(0, 30).map(toNewsItem);
      setNews(mapped);
    } catch {
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // ── Highlight ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/news/multi?highlight=1", {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          headline?: string;
          source?: string;
          url?: string;
          relatedCount?: number;
        };
        if (!cancelled && data.headline && data.source && data.url) {
          setHighlight({
            headline: data.headline,
            source: data.source,
            url: data.url,
            relatedCount: data.relatedCount ?? 0,
          });
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setHighlightLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
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
        {/* Header com typewriter greeting */}
        <div className="flex items-baseline justify-between mb-6">
          <TypedGreeting name={userName} size="lg" />
          <StatusBar />
        </div>

        {/* 3-col grid — stretch natural (alinha fim dos cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_360px] gap-5 items-stretch">
          {/* ── Coluna esquerda ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {/* Portfolio estica até o fundo do grid (alinha com o card de
                Cotações à direita). DayHighlight fica com altura natural
                abaixo dele. */}
            <StaggerOnMount className="flex-1 min-h-0">
              <PortfolioCard state={portfolio} />
            </StaggerOnMount>
            <StaggerOnMount>
              <DayHighlightCard
                headline={highlight?.headline ?? null}
                source={highlight?.source ?? null}
                url={highlight?.url ?? null}
                relatedCount={highlight?.relatedCount}
                dateText={todayText}
                loading={highlightLoading}
              />
            </StaggerOnMount>
          </div>

          {/* ── Coluna central (tabela com header interno) ─────────────── */}
                <StaggerOnMount className="min-w-0">
                  <QuotationsTable
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

          {/* ── Coluna direita ─────────────────────────────────────────── */}
          <StaggerOnMount>
            <NewsFeed items={news} loading={newsLoading} maxItems={6} />
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

type NewsApiItem = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  tickers?: string[];
};

function toNewsItem(n: NewsApiItem): NewsItem {
  return {
    id: n.id,
    headline: n.headline,
    source: n.source,
    publishedAt: n.publishedAt,
    url: n.url,
    tickers: n.tickers ?? [],
  };
}
