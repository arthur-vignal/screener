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
import { AnimatePresence } from "motion/react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  LineChart,
  Plus,
  Trash2,
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
import { DeletePortfolioDialog } from "@/components/portfolio/delete-portfolio-dialog";
import { HoldingDetailPopover } from "@/components/portfolio/holding-detail-popover";
import { PortfolioCalendar } from "@/components/portfolio/portfolio-calendar";
import { PortfolioAllocationChart } from "@/components/portfolio/portfolio-allocation-chart";
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
    investedValue: number;
    gainAbs: number;
    gainPct: number;
    changeToday: number;
    changeTodayPercent: number;
  };
  holdings: Array<{
    symbol: string;
    weight: number;
    qty: number;
    avgPrice: number;
    purchasedAt: number;
    sector: string | null;
    longName: string | null;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    change1m: number | null;
    change1mPercent: number | null;
    positionValue: number;
    positionChangeToday: number;
    positionReturn: number | null;
    positionReturnPct: number | null;
    candles: Array<{ ts: number; close: number }>;
  }>;
  performance: {
    candles: Array<{ ts: number; value: number }>;
    benchmark: Array<{ ts: number; value: number }>;
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
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: bundle, error, isLoading, mutate: mutateBundle } = useSWR<Bundle>(
    `/api/portfolio/${slug}?range=${range}`,
    fetchJson,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  // Deep link ?add=1 (vem do /portfolio/new após criar): abre modal
  // automaticamente quando portfolio está vazio.
  // Lê searchParams direto do window (não useSearchParams) pra evitar
  // hydration mismatch no Next 16 — useSearchParams precisa de Suspense.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "1") {
      setAddOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("add");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const errorStatus = (error as Error & { status?: number })?.status;

  useEffect(() => {
    if (error && errorStatus === 401) {
      router.push("/login");
    }
  }, [error, errorStatus, router]);

  if (error && errorStatus !== 401) {
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
    <div className="min-h-screen text-foreground">
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-4 pb-[96px] flex flex-col"
        style={{ height: "100vh" }}
      >
        {/* Header — seta de voltar à esquerda, Portfolio / {name} no centro, holdings à direita */}
        <StaggerOnMount>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/portfolio"
                aria-label="Voltar para Portfolios"
                title="Voltar para Portfolios"
                className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-md bg-white/[0.04] border border-white/10 text-muted-foreground/85 hover:bg-white/[0.08] hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </Link>
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
              <Link
                href={`/portfolio/${slug}/statistics`}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white/[0.04] border border-white/10 text-muted-foreground/85 hover:bg-white/[0.08] hover:text-foreground transition-colors"
              >
                Statistics
              </Link>
              {meta?.isOwner && (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  aria-label="Deletar portfolio"
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-muted-foreground/85 transition-colors"
                  style={{
                    backgroundColor: "rgba(216,79,104,0.06)",
                    borderColor: "rgba(216,79,104,0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(216,79,104,0.14)";
                    e.currentTarget.style.color = "#d84f68";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(216,79,104,0.06)";
                    e.currentTarget.style.color = "";
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  Delete
                </button>
              )}
              {holdings.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#4dbe95]" />
                  {holdings.length} Holdings
                </span>
              )}
            </div>
          </div>
        </StaggerOnMount>

        {/* Valor total + delta (mesmo padrão do /home) */}
        <StaggerOnMount>
          <div className="mb-3">
            <ValueAndDelta
              totalValue={summary?.totalValue ?? null}
              investedValue={summary?.investedValue ?? null}
              gainAbs={summary?.gainAbs ?? null}
              gainPct={summary?.gainPct ?? null}
              change={summary?.changeToday ?? null}
              changePercent={summary?.changeTodayPercent ?? null}
              loading={isLoading && !bundle}
            />
            {meta?.description && (
              <p className="mt-2 text-[12px] text-muted-foreground/70 max-w-2xl leading-relaxed">
                {meta.description}
              </p>
            )}
          </div>
        </StaggerOnMount>

        <div className="grid flex-1 min-h-0 grid-cols-1 gap-5 overflow-hidden rounded-2xl fey-card lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:grid-rows-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="min-h-0 overflow-hidden border-b border-white/[0.08] p-5 lg:border-b-0 lg:border-r">
            <StaggerOnMount className="h-full flex flex-col">
              <div className="flex flex-col flex-1 min-h-0">
                <div className="mb-1 flex items-center justify-between gap-3 shrink-0">
                  <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Portfolio performance</h2>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">{bundle?.performance.candles.length ?? 0} pontos</span>
                </div>
                <PortfolioValueChart
                  points={bundle?.performance.candles ?? []}
                  benchmark={bundle?.performance.benchmark ?? []}
                  range={range}
                  onRangeChange={setRange}
                  loading={isLoading && !bundle}
                />
              </div>
            </StaggerOnMount>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden border-b border-white/[0.08] p-5 lg:border-b-0">
            <StaggerOnMount className="h-full flex flex-col">
              <HoldingsCard
                holdings={holdings}
                loading={isLoading && !bundle}
                onAddClick={() => setAddOpen(true)}
                canEdit={true}
                expanded
                flush
              />
            </StaggerOnMount>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden border-t-0 p-5 lg:border-r lg:border-white/[0.08]">
            <StaggerOnMount className="h-full flex flex-col">
              <PortfolioAllocationChart holdings={holdings} loading={isLoading && !bundle} flush />
            </StaggerOnMount>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden p-5">
            <StaggerOnMount className="h-full flex flex-col">
              <PortfolioCalendar symbols={holdings.map((h) => h.symbol)} flush />
            </StaggerOnMount>
          </div>
        </div>
      </motion.main>

      <AddHoldingDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => mutateBundle()}
        portfolioSlug={slug}
        isFirstHolding={holdings.length === 0}
      />

      <DeletePortfolioDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        portfolioName={meta?.name ?? ""}
        holdingsCount={holdings.length}
        onConfirm={async () => {
          const res = await fetch(`/api/portfolio/${slug}`, {
            method: "DELETE",
            cache: "no-store",
          });
          if (!res.ok && res.status !== 204) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error ?? `HTTP ${res.status}`);
          }
          router.push("/portfolio");
        }}
      />

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Value & delta ────────────────────────────────────────────────────────

function ValueAndDelta({
  totalValue, investedValue, gainAbs, gainPct, change, changePercent, loading,
}: {
  totalValue: number | null;
  investedValue: number | null;
  gainAbs: number | null;
  gainPct: number | null;
  change: number | null;
  changePercent: number | null;
  loading: boolean;
}): JSX.Element {
  if (loading) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-end gap-3">
          <Skeleton className="h-9 w-56" roundedMd />
          <Skeleton className="h-5 w-24" roundedMd />
        </div>
        <Skeleton className="h-4 w-72" roundedMd />
      </div>
    );
  }
  if (totalValue == null) {
    return <p className="mt-2 text-[14px] text-muted-foreground/70">—</p>;
  }
  const positive = (change ?? 0) >= 0;
  const ChangeIcon = positive ? ArrowUp : ArrowDown;
  const colorClass = positive ? "text-[#4dbe95]" : "text-[#d84f68]";
  const showGain = investedValue != null && gainAbs != null && gainPct != null && investedValue > 0;
  const gainPositive = (gainAbs ?? 0) >= 0;
  const GainIcon = gainPositive ? ArrowUp : ArrowDown;
  const gainColorClass = gainPositive ? "text-[#4dbe95]" : "text-[#d84f68]";
  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 2,
  });
  const fmtPct = (v: number) => Math.abs(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return (
    <div className="mt-3">
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="text-[36px] font-semibold tabular-nums text-foreground leading-none tracking-tight">
          {fmtBRL(totalValue)}
        </div>
        {change != null && changePercent != null && (
          <div className={cn("flex items-center gap-1 text-[14px] font-medium tabular-nums", colorClass)}>
            <ChangeIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span>
              {change >= 0 ? "+" : "−"}{fmtBRL(Math.abs(change))}
            </span>
            <span className="opacity-90">
              ({positive ? "+" : "−"}{fmtPct(changePercent)}%)
            </span>
          </div>
        )}
      </div>
      {showGain && (
        <div className="mt-2 flex items-center gap-2 text-[12px] tabular-nums text-muted-foreground/70">
          <span>
            Custo investido <span className="text-foreground">{fmtBRL(investedValue!)}</span>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="flex items-center gap-1">
            <span>desde a compra</span>
            <span className={cn("flex items-center gap-0.5 font-medium", gainColorClass)}>
              <GainIcon className="h-3 w-3" strokeWidth={2.25} />
              {gainPositive ? "+" : "−"}{fmtBRL(Math.abs(gainAbs!))}
              <span className="opacity-90">({gainPositive ? "+" : "−"}{fmtPct(gainPct!)}%)</span>
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Holdings ─────────────────────────────────────────────────────────────

function HoldingsCard({
  holdings, loading, onAddClick, canEdit, expanded, flush,
}: {
  holdings: Bundle["holdings"];
  loading: boolean;
  onAddClick?: () => void;
  canEdit?: boolean;
  expanded?: boolean;
  flush?: boolean;
}): JSX.Element {
  return (
    <div className={cn("rounded-2xl fey-card overflow-hidden", expanded && "h-full flex flex-col", flush && "fey-card--flat rounded-none border-0 bg-transparent")}>
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
          Holdings
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
            {holdings.length} ativos
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={onAddClick}
              aria-label="Adicionar ativo"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-white/[0.04] border border-white/10 text-muted-foreground/85 hover:bg-white/[0.08] hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
      <div className={cn("divide-y divide-white/[0.04]", expanded && "flex-1 overflow-y-auto")}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-20 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : holdings.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-muted-foreground/85">Nenhum ativo adicionado ainda.</p>
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
  const [open, setOpen] = useState(false);
  const mPos = (h.change1mPercent ?? 0) >= 0;
  const qtyLabel =
    h.qty >= 1 && Number.isInteger(h.qty)
      ? h.qty.toLocaleString("pt-BR")
      : h.qty.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  return (
    <li>
      <div className="group flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors">
        {/* Logo + nome do ativo: clica → vai pra página do ativo */}
        <Link
          href={`/asset/${h.symbol}`}
          className="flex items-center gap-3 min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <TickerLogo symbol={h.symbol} size="md" />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-foreground tracking-tight truncate">
              {h.symbol}
            </div>
            <div className="text-[11px] text-muted-foreground/70 truncate">
              {qtyLabel} × R$ {h.avgPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {" · "}
              <span className="truncate" title={h.longName ?? h.symbol}>
                {h.longName ?? h.sector ?? "Ativo"}
              </span>
            </div>
          </div>
        </Link>

        {/* Preço + variação: clica → abre/fecha popover de detalhes */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={`holding-popover-${h.symbol}`}
          className="flex items-center gap-2 text-right rounded-md px-2 py-1 -mx-2 hover:bg-white/[0.04] transition-colors"
        >
          <div>
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
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-muted-foreground/60"
            aria-hidden="true"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </motion.span>
        </button>
      </div>

      {/* Popover expandido abaixo do card */}
      <AnimatePresence initial={false}>
        {open && (
          <div id={`holding-popover-${h.symbol}`}>
            <HoldingDetailPopover holding={h} />
          </div>
        )}
      </AnimatePresence>
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
      className="rounded-2xl fey-card overflow-hidden w-full flex flex-col"
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
    <div className="min-h-screen text-foreground flex items-center justify-center">
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
