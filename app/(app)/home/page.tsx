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
import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";

import { DashboardDock } from "@/components/foundation/dashboard-dock";
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

// Seeds por tipo
const SEED_STOCKS = [
  "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3", "BBAS3", "WEGE3",
  "B3SA3", "BBSE3", "CMIG4", "EQTL3", "RDOR3", "PRIO3", "GGBR4",
  "RENT3", "LREN3", "SUZB3", "EMBR3", "MGLU3", "CSAN3",
  "VIVT3", "TIMS3", "SBSP3", "ENBR3", "KLBN11", "UGPA3",
  "HAPV3", "RADL3", "BPAC11", "BBDC3",
];
const SEED_FIIS = ["MXRF11", "HGLG11", "XPML11", "VISC11", "BCFF11", "IRDM11", "KNRI11", "HSML11", "HGRU11", "XPLG11"];
const SEED_ETFS = ["BOVA11", "IVVB11", "SMAL11", "DIVO11", "PIBB11"];
const SEED_BDRS = ["AAPL34", "MSFT34", "GOOG34", "AMZO34", "TSLA34"];
const SEEDS = {
  stock: SEED_STOCKS,
  fii: SEED_FIIS,
  etf: SEED_ETFS,
  bdr: SEED_BDRS,
} as const;

type AssetType = keyof typeof SEEDS;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage(): JSX.Element {
  const [userName, setUserName] = useState<string>("");

  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

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

  // ── Quotes ────────────────────────────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    setQuotesLoading(true);
    try {
      const symbols = SEEDS[assetType];
      const url = `/api/assets/quote?symbols=${symbols.join(",")}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { rows?: QuoteApiRow[] };
      const mapped = (data.rows ?? []).map(toQuoteRow);
      setRows(mapped);
    } catch {
      setRows([]);
    } finally {
      setQuotesLoading(false);
    }
  }, [assetType]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

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
            <StaggerOnMount>
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
              loading={quotesLoading}
              onRetry={fetchQuotes}
              assetType={assetType}
              onAssetTypeChange={setAssetType}
              search={search}
              onSearchChange={setSearch}
            />
          </StaggerOnMount>

          {/* ── Coluna direita ─────────────────────────────────────────── */}
          <StaggerOnMount>
            <NewsFeed items={news} loading={newsLoading} maxItems={6} />
          </StaggerOnMount>
        </div>
      </motion.main>

      <DashboardDock />
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
