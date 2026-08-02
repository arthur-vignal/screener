"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  PieChart,
  Newspaper,
  Briefcase,
  Activity,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";


type AssetType = "stock" | "etf" | "crypto";
type AssetRow = {
  symbol: string;
  type: AssetType;
  sector: string;
  quote: { price: number; changePercent: number; volume: number } | null;
};

type NewsItem = {
  id: number;
  headline: string;
  source: string;
  datetime: number;
  url: string;
};

const FEED_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "BTC-USD", "ETH-USD", "SPY", "QQQ",
];

export default function DashboardPage() {
  const [topAssets, setTopAssets] = useState<AssetRow[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [indices] = useState([
    { id: "sp500-momentum", name: "S&P 500 Momentum", change: 0.42, href: "/index/sp500-momentum" },
    { id: "quality-value", name: "Quality-Value", change: 0.18, href: "/index/quality-value" },
    { id: "low-vol-defensive", name: "Low-Vol Defensive", change: -0.08, href: "/index/low-vol-defensive" },
    { id: "global-momentum", name: "Global Momentum", change: 0.85, href: "/index/global-momentum" },
    { id: "crypto-top10", name: "Crypto Top 10", change: 1.32, href: "/index/crypto-top10" },
  ]);
  const [portfolios] = useState([
    { id: "growth-tech", name: "Growth Tech", ytd: 28.7, href: "/portfolios/growth-tech" },
    { id: "balanced-60-40", name: "Balanced 60/40", ytd: 9.4, href: "/portfolios/balanced-60-40" },
    { id: "global-diversified", name: "Global Diversified", ytd: 12.1, href: "/portfolios/global-diversified" },
    { id: "income-yield", name: "Income & Yield", ytd: 4.2, href: "/portfolios/income-yield" },
  ]);
  const [loading, setLoading] = useState(true);
  const [quickSearch, setQuickSearch] = useState("");

  // Load top assets (highest priced movers)
  useEffect(() => {
    Promise.all(
      FEED_TICKERS.map((t) =>
        fetch(`/api/assets/quote?symbols=${encodeURIComponent(t)}`)
          .then((r) => r.json())
          .then((d) => ({ rows: (d.rows ?? []) as AssetRow[] }))
          .catch(() => ({ rows: [] as AssetRow[] })),
      ),
    ).then((results) => {
      const all = results.flatMap((r) => r.rows);
      // Top movers by absolute change
      all.sort((a, b) => Math.abs(b.quote?.changePercent ?? 0) - Math.abs(a.quote?.changePercent ?? 0));
      setTopAssets(all.slice(0, 8));
      setLoading(false);
    });
  }, []);

  // Load news
  useEffect(() => {
    Promise.all(
      ["AAPL", "NVDA", "TSLA", "BTC-USD"].map((t) =>
        fetch(`/api/news/${encodeURIComponent(t)}`)
          .then((r) => r.json())
          .then((d) => ((d.news ?? []) as NewsItem[]).slice(0, 3))
          .catch(() => [] as NewsItem[]),
      ),
    ).then((lists) => {
      const all = lists.flat().sort((a, b) => b.datetime - a.datetime).slice(0, 5);
      setNews(all);
    });
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      window.location.href = `/assets?q=${encodeURIComponent(quickSearch.trim())}`;
    }
  };

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Dashboard</h1>
        <p className="text-text-secondary">
          Hub central. Acompanhe mercados, índices, portfolios e notícias em um só lugar.
        </p>
      </div>

      {/* Quick search */}
      <form onSubmit={handleQuickSearch} className="relative mb-8">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          strokeWidth={2}
        />
        <input
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          placeholder="Buscar ação, ETF ou cripto (ex: AAPL, Apple, Microsoft)"
          className="w-full bg-surface border border-border rounded-md pl-10 pr-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
        />
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top movers */}
        <section className="lg:col-span-2 rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-medium text-foreground">
              <TrendingUp className="w-4 h-4" />
              Top movers
            </h2>
            <Link
              href="/assets"
              className="text-xs text-text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded shimmer" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {topAssets.map((r) => (
                <Link
                  key={`${r.symbol}-${r.type}`}
                  href={`/asset/${encodeURIComponent(r.symbol)}`}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-sm w-20">
                      {r.symbol}
                    </span>
                    <span className="text-xs text-text-muted truncate w-32 hidden sm:block">
                      {r.sector}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-mono tabular-nums">
                    {r.quote ? (
                      <>
                        <span>${r.quote.price.toFixed(2)}</span>
                        <span
                          className={cn(
                            "min-w-[60px] text-right",
                            r.quote.changePercent >= 0 ? "text-positive" : "text-negative",
                          )}
                        >
                          {formatPercent(r.quote.changePercent)}
                        </span>
                      </>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* News */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-medium text-foreground">
              <Newspaper className="w-4 h-4" />
              Últimas notícias
            </h2>
            <Link
              href="/news"
              className="text-xs text-text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              Ver tudo
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {news.length === 0 ? (
            <p className="text-sm text-text-muted">Sem notícias disponíveis agora.</p>
          ) : (
            <div className="space-y-3">
              {news.map((n) => (
                <a
                  key={`${n.id}-${n.url}`}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="text-sm text-foreground group-hover:text-accent transition-colors line-clamp-2">
                    {n.headline}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {n.source} ·{" "}
                    {new Date(n.datetime * 1000).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Indices */}
        <section className="lg:col-span-2 rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-medium text-foreground">
              <PieChart className="w-4 h-4" />
              Índices
            </h2>
            <Link
              href="/index"
              className="text-xs text-text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {indices.map((idx) => (
              <Link
                key={idx.id}
                href={idx.href}
                className="rounded-md border border-border-subtle bg-surface-elevated/30 px-3 py-3 hover:border-foreground/30 transition-colors"
              >
                <div className="text-xs text-text-muted mb-1 truncate">
                  {idx.name}
                </div>
                <div
                  className={cn(
                    "text-lg font-mono font-semibold tabular-nums",
                    idx.change >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {idx.change >= 0 ? "+" : ""}
                  {idx.change.toFixed(2)}%
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Portfolios */}
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-medium text-foreground">
              <Briefcase className="w-4 h-4" />
              Portfolios
            </h2>
            <Link
              href="/portfolios"
              className="text-xs text-text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {portfolios.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-elevated transition-colors"
              >
                <span className="text-sm">{p.name}</span>
                <span
                  className={cn(
                    "text-sm font-mono font-semibold tabular-nums",
                    p.ytd >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {p.ytd >= 0 ? "+" : ""}
                  {p.ytd.toFixed(1)}%
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Quick navigation cards */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground mb-3 uppercase tracking-wider">
          Acesso rápido
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <NavCard
            href="/assets"
            icon={TrendingUp}
            title="Assets"
            description="Buscar ações, ETFs e cripto"
          />
          <NavCard
            href="/analysis"
            icon={Activity}
            title="Analysis"
            description="Indicadores técnicos profundos"
          />
          <NavCard
            href="/index"
            icon={PieChart}
            title="Index"
            description="Índices customizados"
          />
          <NavCard
            href="/news"
            icon={Newspaper}
            title="News"
            description="Feed consolidado"
          />
          <NavCard
            href="/portfolios"
            icon={Briefcase}
            title="Portfolios"
            description="Portfolios pré-definidos"
          />
        </div>
      </section>
    </div>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof TrendingUp;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-surface p-4 hover:border-foreground/30 hover:bg-surface-elevated transition-all group"
    >
      <Icon className="w-5 h-5 text-text-secondary group-hover:text-foreground mb-2 transition-colors" />
      <div className="font-medium text-foreground mb-1">{title}</div>
      <div className="text-xs text-text-muted line-clamp-2">{description}</div>
    </Link>
  );
}
