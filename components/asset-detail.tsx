"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, Newspaper, Calendar } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import { AssetScores } from "@/components/asset-scores";
import { EtfHoldings } from "@/components/etf-holdings";
import { cn, formatCompact } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AssetData = {
  ticker: string;
  quote: {
    // Yahoo shape (preferred)
    price?: number;
    change?: number;
    changePercent?: number;
    currency?: string;
    dayHigh?: number;
    dayLow?: number;
    dayOpen?: number;
    prevClose?: number;
    volume?: number;
    marketCap?: number;
    // Finnhub shape (fallback)
    c?: number;
    d?: number;
    dp?: number;
    h?: number;
    l?: number;
    o?: number;
    pc?: number;
  };
  profile: {
    name: string;
    finnhubIndustry: string;
    exchange: string;
    currency: string;
    marketCapitalization: number;
  };
  metrics: Record<string, number | null>;
};

type Tab = "statistics" | "news" | "events";

export function AssetDetail({ ticker }: { ticker: string }) {
  const [tab, setTab] = useState<Tab>("statistics");

  const { data, error, isLoading } = useSWR<AssetData>(
    `/api/asset/${ticker}`,
    fetcher,
  );

  if (error) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-negative">{String(error)}</p>
        <Link
          href="/assets"
          className="text-sm text-accent hover:underline mt-2 inline-block"
        >
          ← Voltar para Assets
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="px-8 py-8 space-y-4">
        <div className="h-8 w-48 shimmer rounded" />
        <div className="h-96 shimmer rounded-lg" />
        <div className="h-32 shimmer rounded-lg" />
      </div>
    );
  }

  // Normaliza quote (Yahoo usa price/currency, Finnhub usa c)
  const quote = data.quote;
  const price = quote?.price ?? quote?.c ?? 0;
  const change = quote?.change ?? quote?.d ?? 0;
  const changePercent = quote?.changePercent ?? quote?.dp ?? 0;
  const profile = data.profile;

  const formatPrice = (n: number) => {
    if (n === 0) return "—";
    if (n < 0.01) return `$${n.toFixed(6)}`;
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="px-8 py-6 max-w-7xl">
      <Link
        href="/assets"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </Link>

      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight font-mono">
          {data.ticker}
        </h1>
        <span className="text-text-secondary">{profile?.name ?? ticker}</span>
      </div>

      {/* Layout 2/3 esquerda + 1/3 direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Coluna esquerda (2/3): gráfico */}
        <div className="lg:col-span-2">
          <PriceChart ticker={data.ticker} />
        </div>

        {/* Coluna direita (1/3): info rápida */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="text-3xl font-semibold tabular-nums tracking-tight">
              {formatPrice(price)}
            </div>
            <div
              className={cn(
                "text-sm font-mono tabular-nums mt-1",
                changePercent >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {changePercent >= 0 ? "+" : ""}
              {change.toFixed(2)} ({changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%)
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface divide-y divide-border-subtle">
            <StatRow label="Volume 24h" value={`$${formatCompact(quote?.volume ?? 0)}`} />
            <StatRow label="Variação 24h" value={`$${change.toFixed(2)}`} />
            <StatRow label="Máxima 24h" value={formatPrice(quote?.dayHigh ?? quote?.h ?? 0)} />
            <StatRow label="Mínima 24h" value={formatPrice(quote?.dayLow ?? quote?.l ?? 0)} />
            <StatRow label="Abertura" value={formatPrice(quote?.dayOpen ?? quote?.o ?? 0)} />
            <StatRow label="Fechamento anterior" value={formatPrice(quote?.prevClose ?? quote?.pc ?? 0)} />
            <StatRow
              label="Market cap"
              value={profile?.marketCapitalization ? `$${formatCompact(profile.marketCapitalization * 1e6)}` : "—"}
            />
            <StatRow label="Setor" value={profile?.finnhubIndustry ?? "—"} />
            <StatRow label="Exchange" value={profile?.exchange ?? "—"} />
            <StatRow label="Moeda" value={profile?.currency ?? quote?.currency ?? "USD"} />
          </div>
        </div>
      </div>

      {/* ETF holdings */}
      {profile?.finnhubIndustry === "ETF" && (
        <div className="mb-6">
          <EtfHoldings ticker={data.ticker} />
        </div>
      )}

      {/* Tabs: Estatísticas / Notícias / Eventos */}
      <div className="border-b border-border mb-6">
        <div className="flex items-center gap-1">
          <TabButton active={tab === "statistics"} onClick={() => setTab("statistics")}>
            Estatísticas
          </TabButton>
          <TabButton active={tab === "news"} onClick={() => setTab("news")}>
            <Newspaper className="w-3.5 h-3.5" />
            Notícias
          </TabButton>
          <TabButton active={tab === "events"} onClick={() => setTab("events")}>
            <Calendar className="w-3.5 h-3.5" />
            Eventos
          </TabButton>
        </div>
      </div>

      {tab === "statistics" && (
        <div className="space-y-6">
          <AssetScores ticker={data.ticker} />
          <StatisticsGroup title="Valuation" metrics={[
            { label: "P/E", key: "peRatio", suffix: "" },
            { label: "P/VP", key: "priceToBook", suffix: "" },
            { label: "PEG", key: "pegRatio", suffix: "" },
            { label: "EV/EBITDA", key: "evEbitda", suffix: "" },
            { label: "EV/Receita", key: "evRevenue", suffix: "" },
          ]} m={data.metrics} />
          <StatisticsGroup title="Rentabilidade" metrics={[
            { label: "ROE", key: "roe", suffix: "%", isPercent: true },
            { label: "ROA", key: "roa", suffix: "%", isPercent: true },
            { label: "ROIC", key: "roic", suffix: "%", isPercent: true },
            { label: "Margem bruta", key: "grossMargin", suffix: "%", isPercent: true },
            { label: "Margem operacional", key: "operatingMargin", suffix: "%", isPercent: true },
            { label: "Margem líquida", key: "profitMargin", suffix: "%", isPercent: true },
            { label: "FCF Yield", key: "freeCashFlowYield", suffix: "%", isPercent: true },
          ]} m={data.metrics} />
          <StatisticsGroup title="Crescimento & Dividendos" metrics={[
            { label: "EPS", key: "eps", prefix: "$" },
            { label: "Receita / ação", key: "revenuePerShare", prefix: "$" },
            { label: "Book value / ação", key: "bookValuePerShare", prefix: "$" },
            { label: "Dividend yield", key: "dividendYield", suffix: "%", isPercent: true },
            { label: "Payout ratio", key: "payoutRatio", suffix: "%", isPercent: true },
          ]} m={data.metrics} />
          <StatisticsGroup title="Risco & Volatilidade" metrics={[
            { label: "Beta", key: "beta", suffix: "" },
            { label: "52w high", key: "yearHigh", prefix: "$" },
            { label: "52w low", key: "yearLow", prefix: "$" },
            { label: "Debt / Equity", key: "debtEquity", suffix: "" },
            { label: "Current ratio", key: "currentRatio", suffix: "" },
          ]} m={data.metrics} />
        </div>
      )}

      {tab === "news" && <NewsTab ticker={data.ticker} />}
      {tab === "events" && <EventsTab ticker={data.ticker} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-text-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      <span className="font-mono tabular-nums text-sm">{value}</span>
    </div>
  );
}

function StatisticsGroup({
  title,
  metrics,
  m,
}: {
  title: string;
  metrics: { label: string; key: string; prefix?: string; suffix?: string; isPercent?: boolean }[];
  m: Record<string, number | null>;
}) {
  const present = metrics.filter((x) => m[x.key] != null);
  if (present.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-2.5">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {present.map((x) => {
          const v = m[x.key]!;
          const display = x.isPercent
            ? `${v.toFixed(2)}%`
            : `${x.prefix ?? ""}${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}${x.suffix ?? ""}`;
          return (
            <div key={x.key} className="rounded-md bg-surface-elevated/40 p-3">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                {x.label}
              </div>
              <div className="text-sm font-mono tabular-nums">{display}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  relatedTickers?: string[];
};

function NewsTab({ ticker }: { ticker: string }) {
  const { data, isLoading } = useSWR<{ news: NewsItem[] }>(
    `/api/news/multi/${ticker}`,
    fetcher,
  );
  const [openArticle, setOpenArticle] = useState<NewsItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-md shimmer" />
        ))}
      </div>
    );
  }

  const news = data?.news ?? [];

  if (news.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <Newspaper className="w-8 h-8 text-text-muted mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-text-secondary text-sm">
          Sem notícias recentes pra esse ticker.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {news.slice(0, 30).map((n) => (
        <button
          key={n.id}
          onClick={() => setOpenArticle(n)}
          className="w-full text-left block rounded-lg border border-border bg-surface p-4 hover:bg-surface-elevated transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={cn(
                    "text-xs font-medium",
                    (n.source || "").toLowerCase().includes("reuters") ||
                    (n.source || "").toLowerCase().includes("bloomberg") ||
                    (n.source || "").toLowerCase().includes("wsj")
                      ? "text-amber-300"
                      : "text-text-muted",
                  )}
                >
                  {n.source}
                </span>
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
        </button>
      ))}

      {/* Modal inline */}
      {openArticle && <NewsModal article={openArticle} onClose={() => setOpenArticle(null)} />}
    </div>
  );
}

function NewsModal({ article, onClose }: { article: NewsItem; onClose: () => void }) {
  const [content, setContent] = useState<{ text: string | null; status: "loading" | "ready" | "unavailable" }>(
    { text: null, status: "loading" },
  );

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setContent({ text: null, status: "loading" });
    fetch(`/api/news/article?url=${encodeURIComponent(article.url)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.content) setContent({ text: d.content, status: "ready" });
        else setContent({ text: null, status: "unavailable" });
      })
      .catch(() => { if (!cancelled) setContent({ text: null, status: "unavailable" }); });
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => { cancelled = true; };
  }, [article.url]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-lg max-w-3xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-border-subtle">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap text-xs text-text-muted">
              <span>{article.source}</span>
              <span>·</span>
              <span>{new Date(article.datetime * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
            <h2 className="text-xl font-semibold leading-tight">{article.headline}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-elevated rounded-md shrink-0">✕</button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {content.status === "loading" && (
            <div className="flex items-center justify-center py-12 text-text-muted text-sm">Carregando conteúdo...</div>
          )}
          {content.status === "unavailable" && (
            <div className="text-center py-8">
              <p className="text-text-secondary text-sm mb-4">Não conseguimos extrair o conteúdo completo desta notícia.</p>
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">Abrir no portal original</a>
            </div>
          )}
          {content.status === "ready" && content.text && (
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {article.summary && <p className="text-base text-foreground font-medium mb-4">{article.summary}</p>}
              {content.text}
            </div>
          )}
        </div>
        <div className="border-t border-border-subtle p-4 text-right">
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs">Abrir original</a>
        </div>
      </div>
    </div>
  );
}

function EventsTab({ ticker }: { ticker: string }) {
  const { data, isLoading } = useSWR<{ events: Array<{ date: string; type: string; description: string }> }>(
    `/api/events/${ticker}`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md shimmer" />
        ))}
      </div>
    );
  }

  const events = data?.events ?? [];

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <Calendar className="w-8 h-8 text-text-muted mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-text-secondary text-sm">
          Sem eventos próximos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface divide-y divide-border-subtle">
      {events.map((e, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-4">
          <div className="text-xs uppercase tracking-wider text-text-muted font-mono w-24 shrink-0">
            {e.date}
          </div>
          <div className="text-xs font-medium text-text-secondary uppercase tracking-wider w-24 shrink-0">
            {e.type}
          </div>
          <div className="flex-1 text-sm text-foreground">{e.description}</div>
        </div>
      ))}
    </div>
  );
}
