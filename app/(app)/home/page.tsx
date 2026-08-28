"use client";

/**
 * /home — dashboard principal (Fase 2 do redesign).
 *
 * Layout 3-colunas Fey-style:
 *   ┌──────────┬───────────────────────────────┬──────────┐
 *   │          │                               │          │
 *   │ Carteira │   Cotações oficiais           │ Notícias │
 *   │  (hero)  │   (search + filter + tabela)  │  (feed)  │
 *   │          │                               │          │
 *   ├──────────┤                               │          │
 *   │ Notícia  │                               │          │
 *   │ do dia   │                               │          │
 *   └──────────┴───────────────────────────────┴──────────┘
 *                              [dock]
 *
 * Dados:
 *   - /api/auth/me → nome do usuário + dados do portfólio
 *   - /api/portfolio/summary → valor total + variação do dia
 *   - /api/assets/quote?symbols=... → cotações
 *   - /api/news/multi → feed de notícias
 *   - /api/news/multi?highlight=1 → notícia do dia
 */

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";

import { DashboardDock } from "@/components/foundation/dashboard-dock";
import { Skeleton } from "@/components/foundation/skeleton";
import { StatusBar } from "@/components/foundation/status-bar";
import { DayHighlightCard } from "@/components/home/day-highlight-card";
import { NewsFeed, type NewsItem } from "@/components/home/news-feed";
import {
  PortfolioCard,
  type PortfolioCardState,
} from "@/components/home/portfolio-card";
import {
  QuotationsTable,
  type QuoteRow,
} from "@/components/home/quotations-table";
import { TypeFilter, type AssetType } from "@/components/home/type-filter";
import { cn } from "@/lib/utils";

// Top 30 B3 por volume (seed inicial até o usuário filtrar).
const SEED_STOCKS = [
  "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3", "BBAS3", "WEGE3",
  "B3SA3", "BBSE3", "CMIG4", "EQTL3", "RDOR3", "PRIO3", "GGBR4",
  "RENT3", "LREN3", "SUZB3", "EMBR3", "MGLU3", "CSAN3",
  "VIVT3", "TIMS3", "SBSP3", "ENBR3", "KLBN11", "UGPA3",
  "HAPV3", "RADL3", "BPAC11", "BBDC3",
];

const SEED_FIIS = [
  "MXRF11", "HGLG11", "XPML11", "VISC11", "BCFF11", "IRDM11",
  "KNRI11", "HSML11", "HGRU11", "XPLG11",
];

const SEED_ETFS = [
  "BOVA11", "IVVB11", "SMAL11", "DIVO11", "PIBB11",
];

const SEED_BDRS = [
  "AAPL34", "MSFT34", "GOOG34", "AMZO34", "TSLA34",
];

const SEEDS: Record<AssetType, string[]> = {
  stock: SEED_STOCKS,
  fii: SEED_FIIS,
  etf: SEED_ETFS,
  bdr: SEED_BDRS,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage(): JSX.Element {
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState(false);

  const [portfolio, setPortfolio] = useState<PortfolioCardState>({
    kind: "loading",
  });

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  const [highlight, setHighlight] = useState<{
    headline: string;
    source: string;
    url: string;
    relatedCount: number;
  } | null>(null);
  const [highlightLoading, setHighlightLoading] = useState(true);

  // ── Quotes ────────────────────────────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    setQuotesLoading(true);
    setQuotesError(false);
    try {
      const symbols = SEEDS[assetType];
      const url = `/api/assets/quote?symbols=${symbols.join(",")}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { rows?: QuoteApiRow[] };
      const mapped = (data.rows ?? []).map(toQuoteRow);
      setRows(mapped);
    } catch {
      setQuotesError(true);
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
    setNewsError(false);
    try {
      const r = await fetch("/api/news/multi", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { items?: NewsApiItem[] };
      const mapped = (data.items ?? []).slice(0, 30).map(toNewsItem);
      setNews(mapped);
    } catch {
      setNewsError(true);
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
        // Falha silenciosa — card mostra empty state.
      } finally {
        if (!cancelled) setHighlightLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Filter (search local) ─────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.symbol.toLowerCase().includes(q) ||
        (r.longName ?? "").toLowerCase().includes(q) ||
        r.sector.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const todayText = useMemo(
    () =>
      new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    []
  );

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: "#070709" }}
    >
      <div className="mx-auto max-w-[1600px] px-6 py-6 pb-32">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-[20px] font-semibold tracking-tight">
            Visão geral
          </h1>
          <StatusBar />
        </div>

        {/* 3-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] gap-4 items-start">
          {/* ── Coluna esquerda ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <PortfolioCard state={portfolio} />
            <DayHighlightCard
              headline={highlight?.headline ?? null}
              source={highlight?.source ?? null}
              url={highlight?.url ?? null}
              relatedCount={highlight?.relatedCount}
              dateText={todayText}
              loading={highlightLoading}
            />
          </div>

          {/* ── Coluna central ──────────────────────────────────────────── */}
          <section className="flex flex-col gap-3 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-baseline gap-3">
                <h2 className="text-[16px] font-semibold tracking-tight">
                  Cotações oficiais
                </h2>
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                  {filteredRows.length} ativos
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <TypeFilter value={assetType} onChange={setAssetType} />
                <SearchBox value={search} onChange={setSearch} />
              </div>
            </div>

            {/* Tabela */}
            <QuotationsTable
              rows={filteredRows}
              loading={quotesLoading && !quotesError}
              onRetry={fetchQuotes}
            />
          </section>

          {/* ── Coluna direita ─────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-6 h-[calc(100vh-80px)] min-h-[600px]">
            <NewsFeed
              items={news}
              loading={newsLoading}
              onRetry={newsError ? fetchNews : undefined}
            />
          </div>
        </div>
      </div>

      <DashboardDock />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <div className="relative">
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        strokeWidth={2}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar ativo, setor…"
        aria-label="Buscar"
        className={cn(
          "h-8 pl-8 pr-3 rounded-md",
          "bg-white/[0.02] border border-white/10",
          "text-[12px] text-foreground placeholder:text-muted-foreground/60",
          "focus:outline-none focus:border-white/20 focus:bg-white/[0.04]",
          "transition-colors w-[200px]"
        )}
      />
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
