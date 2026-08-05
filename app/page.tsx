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
import { PageHeader, SectionHeader } from "@/components/page-header";
import { LiveDot } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectorHeatmap } from "@/components/sector-heatmap";
import { MacroPanel } from "@/components/macro-panel";
import { FearGreedGauge } from "@/components/fear-greed";
import { Sparkline } from "@/components/sparkline";

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

  // Load top movers (single batch request)
  useEffect(() => {
    fetch(`/api/assets/quote?symbols=${encodeURIComponent(FEED_TICKERS.join(","))}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.rows ?? []) as AssetRow[];
        // Top movers by absolute change
        rows.sort((a, b) => Math.abs(b.quote?.changePercent ?? 0) - Math.abs(a.quote?.changePercent ?? 0));
        setTopAssets(rows.slice(0, 8));
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-7xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Dashboard
            <LiveDot />
          </span>
        }
        description="Hub central. Acompanhe mercados, índices, portfolios e notícias em um só lugar."
      />

      {/* Quick search */}
      <form onSubmit={handleQuickSearch} className="relative mb-6 group">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-brand-bright transition-colors duration-150"
          strokeWidth={2}
        />
        <input
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          placeholder="Buscar ação, ETF ou cripto (ex: AAPL, Apple, Microsoft)"
          className="w-full bg-surface border border-hairline pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-faint input-glow"
        />
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Heatmap setorial (full width) */}
        <div className="lg:col-span-3">
          <SectorHeatmap />
        </div>

        {/* Macro panel + Fear & Greed */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <MacroPanel />
          </div>
          <div>
            <FearGreedGauge />
          </div>
        </div>

        {/* Top movers — lista direta (sem panel) */}
        <section>
          <SectionHeader
            icon={TrendingUp}
            title="Top movers"
            action={
              <Link
                href="/assets"
                className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 link-underline"
              >
                Ver todos
                <ArrowRight className="w-3 h-3 icon-rotate-hover" />
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="border-t border-hairline">
              {topAssets.map((r, i) => (
                <Link
                  key={`${r.symbol}-${r.type}`}
                  href={`/asset/${encodeURIComponent(r.symbol)}`}
                  className="flex items-center justify-between px-3 py-2 hover-row press group border-b border-hairline animate-fade-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-semibold text-sm w-20 text-ink">
                      {r.symbol}
                    </span>
                    <span className="text-xs text-muted truncate w-32 hidden sm:block">
                      {r.sector}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-tabular shrink-0">
                    {r.quote ? (
                      <>
                        <span className="text-ink">${r.quote.price.toFixed(2)}</span>
                        <span
                          className={cn(
                            "min-w-[64px] text-right font-medium",
                            r.quote.changePercent >= 0 ? "text-positive" : "text-negative",
                          )}
                        >
                          {formatPercent(r.quote.changePercent)}
                        </span>
                        <Sparkline
                          symbol={r.symbol}
                          width={56}
                          height={20}
                          positive={r.quote.changePercent >= 0}
                        />
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* News — lista direta (sem panel) */}
        <section>
          <SectionHeader
            icon={Newspaper}
            title="Últimas notícias"
            action={
              <Link
                href="/news"
                className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 link-underline"
              >
                Ver tudo
                <ArrowRight className="w-3 h-3 icon-rotate-hover" />
              </Link>
            }
          />
          {news.length === 0 ? (
            <p className="text-sm text-muted">Sem notícias disponíveis agora.</p>
          ) : (
            <div className="border-t border-hairline">
              {news.map((n, i) => (
                <a
                  key={`${n.id}-${n.url}`}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 hover-row group border-b border-hairline animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="text-sm text-ink group-hover:text-brand-bright transition-colors duration-150 leading-relaxed">
                    {n.headline}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
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

        {/* Indices — lista direta horizontal */}
        <section>
          <SectionHeader
            icon={PieChart}
            title="Índices"
            action={
              <Link
                href="/indices"
                className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 link-underline"
              >
                Ver todos
                <ArrowRight className="w-3 h-3 icon-rotate-hover" />
              </Link>
            }
          />
          <div className="border-t border-hairline grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {indices.map((idx, i) => (
              <Link
                key={idx.id}
                href={idx.href}
                className="px-3 py-3 hover-row group border-b border-hairline border-r last:border-r-0 animate-fade-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="text-xs text-muted mb-0.5 truncate group-hover:text-body transition-colors">
                  {idx.name}
                </div>
                <div
                  className={cn(
                    "text-lg font-tabular font-semibold",
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

        {/* Portfolios — lista direta */}
        <section>
          <SectionHeader
            icon={Briefcase}
            title="Portfolios"
            action={
              <Link
                href="/portfolios"
                className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 link-underline"
              >
                Ver todos
                <ArrowRight className="w-3 h-3 icon-rotate-hover" />
              </Link>
            }
          />
          <div className="border-t border-hairline">
            {portfolios.map((p, i) => (
              <Link
                key={p.id}
                href={p.href}
                className="flex items-center justify-between px-3 py-2 hover-row press border-b border-hairline animate-fade-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className="text-sm text-ink">{p.name}</span>
                <span
                  className={cn(
                    "text-sm font-tabular font-semibold",
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

      {/* Quick navigation — inline links */}
      <section className="mt-8">
        <h2 className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">
          Acesso rápido
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <NavLink href="/assets" icon={TrendingUp} label="Assets" />
          <NavLink href="/analysis" icon={Activity} label="Analysis" />
          <NavLink href="/indices" icon={PieChart} label="Index" />
          <NavLink href="/news" icon={Newspaper} label="News" />
          <NavLink href="/portfolios" icon={Briefcase} label="Portfolios" />
        </div>
      </section>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof TrendingUp;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors duration-150 press"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}
