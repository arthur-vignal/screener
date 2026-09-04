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
import { useEffect, useState } from "react";
import type { JSX } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ExternalLink,
  LineChart,
  Plus,
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
import { AddHoldingDialog } from "@/components/portfolio/add-holding-dialog";
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

  const { data: bundle, error, isLoading, mutate: mutateBundle } = useSWR<Bundle>(
    `/api/portfolio/${slug}?range=${range}`,
    fetchJson,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );
  const [addOpen, setAddOpen] = useState(false);

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
        {/* Header — Fey style: logo + nome à esquerda, holdings + label à direita */}
        <StaggerOnMount>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 min-w-0">
              {/* "Portfolio" como h1 SEMPRE (não o nome do portfolio) —
                  alinha com o print onde "Portfolio" é o título da rota
                  e o nome do portfolio vai pro h2. Header mais limpo. */}
              <h1 className="text-[32px] font-semibold tracking-tight text-foreground leading-[1.1]">
                Portfolio
              </h1>
              {meta?.name && (
                <>
                  <span className="text-muted-foreground/30 text-[32px] font-light">/</span>
                  <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-[1.1] truncate">
                    {meta.name}
                  </h2>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground/70 shrink-0">
              {holdings.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#4dbe95]" />
                  {holdings.length} Holdings
                </span>
              )}
              {meta?.isPublic && (
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] uppercase tracking-wide text-muted-foreground/85 font-medium">
                  Watchlist
                </span>
              )}
            </div>
          </div>
        </StaggerOnMount>

        {/* Saudação + valor total + delta (mesmo padrão do /home) */}
        <StaggerOnMount>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <ValueAndDelta
                totalValue={summary?.totalValue ?? null}
                change={summary?.changeToday ?? null}
                changePercent={summary?.changeTodayPercent ?? null}
                loading={isLoading && !bundle}
              />
            </div>
            {meta?.description && (
              <p className="text-[12px] text-muted-foreground/70 max-w-md text-right leading-relaxed">
                {meta.description}
              </p>
            )}
          </div>
        </StaggerOnMount>

        {/* Grid 2-col: chart à esquerda, holdings + news empilhados à direita */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-stretch">
          {/* Coluna esquerda: chart + botão "Add items" embutido */}
          <StaggerOnMount>
            <div className="rounded-2xl border border-white/10 bg-[#101116] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Variação do portfolio
                </h3>
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
              {/* Add items — embaixo do chart, estilo Fey */}
              {meta?.isOwner && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/[0.04] border border-white/10 text-foreground text-[12px] font-medium hover:bg-white/[0.08] hover:border-white/20 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Add items to your portfolio
                </button>
              )}
            </div>
          </StaggerOnMount>

          {/* Coluna direita: holdings + news empilhados */}
          <div className="flex flex-col gap-5 min-h-0">
            <StaggerOnMount>
              <HoldingsCard
                holdings={holdings}
                loading={isLoading && !bundle}
                onAddClick={() => setAddOpen(true)}
                canEdit={meta?.isOwner ?? false}
              />
            </StaggerOnMount>
            <StaggerOnMount className="flex-1 min-h-0 flex">
              <PortfolioNewsColumn slug={slug} />
            </StaggerOnMount>
          </div>
        </div>
      </motion.main>

      <AddHoldingDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => mutateBundle()}
        portfolioSlug={slug}
        currentWeightSum={holdings.reduce((s, h) => s + h.weight, 0)}
      />

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
  holdings, loading, onAddClick, canEdit,
}: {
  holdings: Bundle["holdings"];
  loading: boolean;
  onAddClick?: () => void;
  canEdit?: boolean;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
          Stocks
        </h3>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
          {holdings.length} ativos
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-20 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : holdings.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-muted-foreground/85">
              Nenhum ativo adicionado ainda.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={onAddClick}
                className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[var(--primary)] text-[#070709] text-[12px] font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                Adicionar primeiro ativo
              </button>
            )}
          </div>
        ) : (
          <HoldingList holdings={holdings} canEdit={canEdit} onDelete={onAddClick} />
        )}
      </div>
    </div>
  );
}

/** Lista de holdings no estilo Fey (logo + nome + preço + 3m return). */
function HoldingList({
  holdings, canEdit, onDelete,
}: {
  holdings: Bundle["holdings"];
  canEdit?: boolean;
  onDelete?: () => void;
}): JSX.Element {
  return (
    <ul>
      {holdings.map((h) => (
        <HoldingRow key={h.symbol} holding={h} canEdit={canEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function HoldingRow({
  holding: h, canEdit, onDelete,
}: {
  holding: Bundle["holdings"][number];
  canEdit?: boolean;
  onDelete?: () => void;
}): JSX.Element {
  const mPos = (h.change1mPercent ?? 0) >= 0;
  return (
    <li>
      <Link
        href={`/asset/${h.symbol}`}
        className="group flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <TickerLogo symbol={h.symbol} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-foreground tracking-tight truncate">
            {h.symbol}
          </div>
          <div className="text-[11px] text-muted-foreground/70 truncate">
            {h.sector ?? `peso ${(h.weight * 100).toFixed(1)}%`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] tabular-nums text-foreground font-medium">
            {h.price != null
              ? h.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : "—"}
          </div>
          {h.change1m != null && h.change1mPercent != null ? (
            <div
              className={cn(
                "text-[11px] tabular-nums font-semibold",
                mPos ? "text-[#4dbe95]" : "text-[#d84f68]",
              )}
            >
              {mPos ? "+" : ""}
              {h.change1mPercent.toFixed(2)}%
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground/60">—</div>
          )}
        </div>
      </Link>
    </li>
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
