"use client";

/**
 * /portfolio/[slug] — drilldown do portfolio (estilo Fey watchlist).
 *
 * Layout (1 col principal + 1 col lateral):
 *   ┌─────────────────────────────────────────┬────────────────────────┐
 *   │  ◀ Portfolio (header)                    │                        │
 *   │  Olá, {name}.                            │                        │
 *   │  R$ 12.500,00  +1.2% (3,2% no mês)      │                        │
 *   │                                          │                        │
 *   │  ┌─ Portfolio value (chart) ─────────┐  │  ┌─ Holdings ──────┐  │
 *   │  │  line chart 1D/1W/1M/...           │  │  │  ativo preço...  │  │
 *   │  │  tabs embaixo                      │  │  │  ...              │  │
 *   │  └─────────────────────────────────────┘  │  └──────────────────┘  │
 *   │                                          │  ┌─ News ───────────┐  │
 *   │                                          │  │  filtradas        │  │
 *   │                                          │  │  pelos tickers    │  │
 *   │                                          │  └──────────────────┘  │
 *   └─────────────────────────────────────────┴────────────────────────┘
 *
 * 1D = "último pregão" (candles do dia útil mais recente com dados),
 * não literalmente now-24h. Fix no /api/asset/[symbol]/candles.
 *
 * Dados:
 *   - GET /api/portfolio/[slug]?range=1M  → bundle completo
 *   - GET /api/portfolio/[slug]/news      → news filtradas
 *
 * Auth: redirect /login se 401.
 */

import { motion } from "motion/react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ExternalLink,
  LineChart,
} from "lucide-react";

import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import {
  StaggerOnMount,
  staggerParentVariants,
} from "@/components/foundation/stagger";
import { Skeleton } from "@/components/foundation/skeleton";
import {
  PortfolioValueChart,
  type RangeKey,
} from "@/components/portfolio/portfolio-value-chart";
import { TickerLogo } from "@/components/foundation/ticker-logo";
import type { NewsItem } from "@/components/home/news-feed";
import { cn } from "@/lib/utils";

type Bundle = {
  meta: {
    name: string;
    slug: string;
    description: string;
    initialValue: number;
    createdAt: number;
    isPublic: boolean;
    isOwner: boolean;
  };
  summary: {
    totalValue: number;
    changeToday: number;
    changeTodayPercent: number;
  };
  holdings: Array<{
    symbol: string;
    weight: number;
    sector: string | null;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    change1m: number | null;
    change1mPercent: number | null;
    positionValue: number;
    positionChangeToday: number;
  }>;
  performance: {
    candles: Array<{ ts: number; value: number }>;
    range: RangeKey;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 401) {
    const err = new Error("unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

export default function PortfolioDetailPage({
  slug,
}: { slug: string }): JSX.Element {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>("1M");

  const { data: bundle, error, isLoading } = useSWR<Bundle>(
    `/api/portfolio/${slug}?range=${range}`,
    fetchJson,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  useEffect(() => {
    if (error && (error as Error & { status?: number }).status === 401) {
      router.push("/login");
    }
  }, [error, router]);

  if (error && (error as Error & { status?: number }).status !== 401) {
    return (
      <ErrorShell>
        <p>Erro ao carregar o portfolio.</p>
      </ErrorShell>
    );
  }

  const holdings = bundle?.holdings ?? [];
  const summary = bundle?.summary;
  const meta = bundle?.meta;

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
        <StaggerOnMount>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground/70 mb-3">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              Voltar pros portfolios
            </Link>
          </div>
        </StaggerOnMount>

        {/* Saudação + valor total + delta (mesmo padrão do /home) */}
        <StaggerOnMount>
          <div className="mb-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">
              Portfolio
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">
              {meta?.name ?? "—"}
            </h1>
            <ValueAndDelta
              totalValue={summary?.totalValue ?? null}
              change={summary?.changeToday ?? null}
              changePercent={summary?.changeTodayPercent ?? null}
              loading={isLoading && !bundle}
            />
            {meta?.description && (
              <p className="mt-2 text-[13px] text-muted-foreground/70 max-w-2xl leading-relaxed">
                {meta.description}
              </p>
            )}
          </div>
        </StaggerOnMount>

        {/* Grid 2-col: chart + holdings+news */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-stretch">
          {/* Coluna esquerda: chart */}
          <StaggerOnMount>
            <div className="rounded-2xl border border-white/10 bg-[#101116] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Variação do portfolio
                </h2>
                <div className="text-[11px] text-muted-foreground/70">
                  {bundle?.performance.candles.length ?? 0} pontos
                </div>
              </div>
              <PortfolioValueChart
                points={bundle?.performance.candles ?? []}
                range={range}
                onRangeChange={setRange}
                loading={isLoading && !bundle}
              />
            </div>
          </StaggerOnMount>

          {/* Coluna direita: holdings + news */}
          <div className="flex flex-col gap-5 min-h-0">
            <StaggerOnMount>
              <HoldingsCard
                holdings={holdings}
                loading={isLoading && !bundle}
              />
            </StaggerOnMount>
            <StaggerOnMount className="flex-1 min-h-0 flex">
              <PortfolioNewsColumn slug={slug} />
            </StaggerOnMount>
          </div>
        </div>
      </motion.main>

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Value & delta ────────────────────────────────────────────────────────

function ValueAndDelta({
  totalValue, change, changePercent, loading,
}: {
  totalValue: number | null;
  change: number | null;
  changePercent: number | null;
  loading: boolean;
}): JSX.Element {
  if (loading) {
    return (
      <div className="mt-3 flex items-end gap-3">
        <Skeleton className="h-9 w-56" roundedMd />
        <Skeleton className="h-5 w-24" roundedMd />
      </div>
    );
  }
  if (totalValue == null) {
    return <p className="mt-2 text-[14px] text-muted-foreground/70">—</p>;
  }
  const positive = (change ?? 0) >= 0;
  const ChangeIcon = positive ? ArrowUp : ArrowDown;
  const colorClass = positive ? "text-[#4dbe95]" : "text-[#d84f68]";
  return (
    <div className="mt-3 flex items-baseline gap-3 flex-wrap">
      <div className="text-[36px] font-semibold tabular-nums text-foreground leading-none tracking-tight">
        {totalValue.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 2,
        })}
      </div>
      {change != null && changePercent != null && (
        <div className={cn("flex items-center gap-1 text-[14px] font-medium tabular-nums", colorClass)}>
          <ChangeIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span>
            {change >= 0 ? "+" : "−"}
            {Math.abs(change).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="opacity-90">
            ({positive ? "+" : "−"}
            {Math.abs(changePercent).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}%)
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Holdings ─────────────────────────────────────────────────────────────

function HoldingsCard({
  holdings, loading,
}: {
  holdings: Bundle["holdings"];
  loading: boolean;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Holdings
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground/70">
            {holdings.length} ativos
          </p>
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))
        ) : holdings.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-muted-foreground/85">
            Nenhum ativo adicionado ainda.
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-2 border-b border-white/[0.04] text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
              <span>Ativo</span>
              <span className="text-right">Preço</span>
              <span className="text-right w-20">Hoje</span>
              <span className="text-right w-20">1m</span>
            </div>
            {holdings.map((h) => (
              <HoldingRow key={h.symbol} holding={h} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function HoldingRow({ holding: h }: { holding: Bundle["holdings"][number] }): JSX.Element {
  const dayPos = (h.changePercent ?? 0) >= 0;
  const mPos = (h.change1mPercent ?? 0) >= 0;
  return (
    <Link
      href={`/asset/${h.symbol}`}
      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-foreground tracking-tight truncate">
          {h.symbol}
        </div>
        <div className="text-[11px] text-muted-foreground/70 tabular-nums">
          {h.weight > 0 ? (h.weight * 100).toFixed(1) : "0.0"}%
        </div>
      </div>
      <div className="text-right text-[13px] tabular-nums text-foreground">
        {h.price != null
          ? h.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "—"}
      </div>
      <div className="text-right w-20">
        {h.changePercent != null ? (
          <span
            className={cn(
              "inline-flex items-center w-fit px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums",
              dayPos
                ? "bg-[#4dbe95]/15 text-[#4dbe95]"
                : "bg-[#d84f68]/15 text-[#d84f68]",
            )}
          >
            {dayPos ? "+" : ""}
            {h.changePercent.toFixed(2)}%
          </span>
        ) : (
          "—"
        )}
      </div>
      <div className="text-right w-20">
        {h.change1m != null && h.change1mPercent != null ? (
          <div className="flex flex-col items-end leading-tight">
            <span
              className={cn(
                "text-[12px] tabular-nums font-medium",
                mPos ? "text-[#4dbe95]" : "text-[#d84f68]",
              )}
            >
              {h.change1m >= 0 ? "+" : "−"}
              {Math.abs(h.change1m).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 2,
              })}
            </span>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                mPos ? "text-[#4dbe95]/80" : "text-[#d84f68]/80",
              )}
            >
              {mPos ? "+" : ""}
              {h.change1mPercent.toFixed(2)}%
            </span>
          </div>
        ) : (
          "—"
        )}
      </div>
    </Link>
  );
}

// ─── News ─────────────────────────────────────────────────────────────────

function PortfolioNewsColumn({ slug }: { slug: string }): JSX.Element {
  const { data, isLoading } = useSWR<{ news: NewsItem[] }>(
    `/api/portfolio/${slug}/news`,
    fetchJson,
    { revalidateOnFocus: false, refreshInterval: 120_000 },
  );
  const news = data?.news ?? [];

  return (
    <aside
      className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden w-full flex flex-col"
      aria-label="Notícias do portfolio"
    >
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          News
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground/70">
          Mencionando ativos do portfolio
        </p>
      </div>
      <div className="flex-1 p-2 overflow-y-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
        {isLoading ? (
          <LoadingList />
        ) : news.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <LineChart className="h-6 w-6 text-muted-foreground/40 mx-auto" strokeWidth={1.5} />
            <p className="mt-2 text-[13px] text-muted-foreground/85">
              Sem notícias hoje sobre seus ativos.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {news.map((item) => (
              <li key={item.id}>
                <PortfolioNewsItem item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function LoadingList(): JSX.Element {
  return (
    <ul className="space-y-2 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="px-4 py-3 flex gap-3">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </li>
      ))}
    </ul>
  );
}

function PortfolioNewsItem({ item }: { item: NewsItem }): JSX.Element {
  const ticker = item.ticker;
  const time = formatRelative(item.publishedAt);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg p-3 transition-colors",
        "hover:bg-white/[0.02]",
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {ticker ? (
          <Link
            href={`/asset/${ticker}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5"
          >
            <TickerLogo symbol={ticker} size="sm" />
            <span className="text-[11px] font-semibold tracking-tight text-foreground">
              {ticker}
            </span>
          </Link>
        ) : (
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
            {item.source}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground/60 ml-auto tabular-nums">
          {time}
        </span>
      </div>
      <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
        {item.title}
      </p>
    </a>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ─── Error ────────────────────────────────────────────────────────────────

function ErrorShell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen text-foreground flex items-center justify-center" style={{ background: "#070709" }}>
      <div className="text-center">
        <p className="text-[14px] text-foreground">{children}</p>
        <Link
          href="/portfolio"
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Voltar pros portfolios
        </Link>
      </div>
    </div>
  );
}

// Re-exports for any consumer that needs NewsItem
export type { NewsItem };
// keep external link icon referenced (used by some NewsItem consumers)
void ExternalLink;
