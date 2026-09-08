"use client";

/**
 * /portfolio/[slug]/statistics — métricas agregadas do portfolio.
 *
 * Mostra:
 *   - Header com h1 "Statistics" + h2 com nome do portfolio
 *   - KPIs no topo: valor atual, custo investido, ganho/perda não-realizado
 *   - Distribuição por setor (% do portfolio + count)
 *   - Top 5 gainers / Top 5 losers (variação % desde compra)
 *   - Holding mais antiga (data + dias)
 *   - YTD return
 *
 * Dados: GET /api/portfolio/[slug]/stats
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useEffect } from "react";
import type { JSX } from "react";
import { ArrowUp, ArrowDown, ChevronLeft } from "lucide-react";

import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type StatsResponse = {
  meta: {
    name: string;
    slug: string;
    description: string;
    createdAt: number;
  };
  totals: {
    currentValue: number;
    investedValue: number;
    gainAbs: number;
    gainPct: number;
    positionCount: number;
  };
  bySector: Array<{
    sector: string;
    currentValue: number;
    weight: number;
    count: number;
  }>;
  topGainers: Array<{
    symbol: string;
    sector: string;
    qty: number;
    avgPrice: number;
    currentPrice: number | null;
    gainPct: number;
    currentValue: number;
  }>;
  topLosers: Array<{
    symbol: string;
    sector: string;
    qty: number;
    avgPrice: number;
    currentPrice: number | null;
    gainPct: number;
    currentValue: number;
  }>;
  oldestHolding: {
    symbol: string;
    purchasedAt: number;
    daysHeld: number;
    avgPrice: number;
    currentPrice: number | null;
    gainPct: number;
  } | null;
  ytdReturn: {
    pct: number;
    since: number;
    label: "ytd" | "since_invested";
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 401) {
    const err = new Error("unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

export default function PortfolioStatisticsPage({
  slug,
}: {
  slug: string;
}): JSX.Element {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<StatsResponse>(
    `/api/portfolio/${slug}/stats`,
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
      <Shell>
        <ErrorState />
      </Shell>
    );
  }

  return (
    <Shell>
      <Header slug={slug} name={data?.meta.name} loading={isLoading && !data} />

      {isLoading && !data ? (
        <LoadingState />
      ) : data ? (
        <Body data={data} />
      ) : null}
    </Shell>
  );
}

// ─── Layout shell ─────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen text-foreground">
      <main className="w-[90%] mx-auto py-6 pb-32">{children}</main>
      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────

function Header({
  slug,
  name,
  loading,
}: {
  slug: string;
  name: string | undefined;
  loading: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={`/portfolio/${slug}`}
          aria-label="Voltar para o portfolio"
          title="Voltar"
          className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-md bg-white/[0.04] border border-white/10 text-muted-foreground/85 hover:bg-white/[0.08] hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground leading-[1.1]">
          Statistics
        </h1>
        {name && (
          <>
            <span className="text-muted-foreground/30 text-[32px] font-light">/</span>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-[1.1] truncate">
              {name}
            </h2>
          </>
        )}
        {loading && !name && (
          <Skeleton className="h-7 w-32" roundedMd />
        )}
      </div>
    </div>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────

function Body({ data }: { data: StatsResponse }): JSX.Element {
  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPI
          label="Valor atual"
          value={data.totals.currentValue}
          muted={data.totals.currentValue === 0}
        />
        <KPI
          label="Custo investido"
          value={data.totals.investedValue}
          muted
        />
        <GainKPI
          gainAbs={data.totals.gainAbs}
          gainPct={data.totals.gainPct}
        />
      </div>

      {/* Distribuição por setor + Top gainers/losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <SectorDistribution sectors={data.bySector} />
        <TopMovers
          gainers={data.topGainers}
          losers={data.topLosers}
        />
      </div>

      {/* Holding mais antiga + YTD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.oldestHolding && (
          <OldestCard
            symbol={data.oldestHolding.symbol}
            purchasedAt={data.oldestHolding.purchasedAt}
            daysHeld={data.oldestHolding.daysHeld}
            avgPrice={data.oldestHolding.avgPrice}
            currentPrice={data.oldestHolding.currentPrice}
            gainPct={data.oldestHolding.gainPct}
          />
        )}
        <YTDCard
          pct={data.ytdReturn.pct}
          label={data.ytdReturn.label}
        />
      </div>
    </div>
  );
}

// ─── KPI ──────────────────────────────────────────────────────────────────

function KPI({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}): JSX.Element {
  return (
    <div className="rounded-2xl fey-card p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold mb-2">
        {label}
      </div>
      <div
        className={cn(
          "text-[26px] font-semibold tabular-nums leading-none tracking-tight",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {formatBRL(value)}
      </div>
    </div>
  );
}

function GainKPI({
  gainAbs,
  gainPct,
}: {
  gainAbs: number;
  gainPct: number;
}): JSX.Element {
  const positive = gainAbs >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  const colorClass = positive ? "text-[#4dbe95]" : "text-[#d84f68]";
  return (
    <div className="rounded-2xl fey-card p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold mb-2">
        Ganho / Perda
      </div>
      <div className={cn("text-[26px] font-semibold tabular-nums leading-none tracking-tight", colorClass)}>
        {positive ? "+" : "−"}
        {formatBRL(Math.abs(gainAbs))}
      </div>
      <div className={cn("mt-2 inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums", colorClass)}>
        <Icon className="h-3 w-3" strokeWidth={2.5} />
        {positive ? "+" : "−"}
        {Math.abs(gainPct * 100).toFixed(2)}%
      </div>
    </div>
  );
}

// ─── Distribuição por setor ───────────────────────────────────────────────

function SectorDistribution({
  sectors,
}: {
  sectors: StatsResponse["bySector"];
}): JSX.Element | null {
  if (sectors.length === 0) return null;
  return (
    <div className="rounded-2xl fey-card p-5">
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-4">
        Distribuição por setor
      </h3>
      <ul className="space-y-2.5">
        {sectors.map((s) => (
          <li key={s.sector}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">{s.sector}</span>
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                  {s.count} {s.count === 1 ? "ativo" : "ativos"}
                </span>
              </div>
              <span className="text-[12px] tabular-nums font-semibold text-foreground">
                {(s.weight * 100).toFixed(1)}%
              </span>
            </div>
            {/* Barra de progresso sutil */}
            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-[width] duration-300"
                style={{ width: `${Math.min(100, s.weight * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Top movers ──────────────────────────────────────────────────────────

function TopMovers({
  gainers,
  losers,
}: {
  gainers: StatsResponse["topGainers"];
  losers: StatsResponse["topLosers"];
}): JSX.Element {
  return (
    <div className="rounded-2xl fey-card p-5">
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-4">
        Top movers
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#4dbe95] font-semibold mb-2">
            Maiores altas
          </div>
          <ul className="space-y-1.5">
            {gainers.length === 0 ? (
              <li className="text-[12px] text-muted-foreground/70">Sem dados.</li>
            ) : (
              gainers.map((h) => (
                <MoverRow key={h.symbol} h={h} />
              ))
            )}
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#d84f68] font-semibold mb-2">
            Maiores baixas
          </div>
          <ul className="space-y-1.5">
            {losers.length === 0 ? (
              <li className="text-[12px] text-muted-foreground/70">Sem dados.</li>
            ) : (
              losers.map((h) => (
                <MoverRow key={h.symbol} h={h} />
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MoverRow({
  h,
}: {
  h: StatsResponse["topGainers"][number];
}): JSX.Element {
  const positive = h.gainPct >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  const colorClass = positive ? "text-[#4dbe95]" : "text-[#d84f68]";
  return (
    <li>
      <Link
        href={`/asset/${h.symbol}`}
        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
      >
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-foreground tracking-tight truncate">
            {h.symbol}
          </div>
          <div className="text-[10.5px] text-muted-foreground/70 truncate">
            {h.sector}
          </div>
        </div>
        <div className={cn("inline-flex items-center gap-0.5 text-[11px] tabular-nums font-semibold shrink-0", colorClass)}>
          <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
          {positive ? "+" : "−"}
          {Math.abs(h.gainPct * 100).toFixed(2)}%
        </div>
      </Link>
    </li>
  );
}

// ─── Holding mais antiga ──────────────────────────────────────────────────

function OldestCard({
  symbol,
  purchasedAt,
  daysHeld,
  avgPrice,
  currentPrice,
  gainPct,
}: {
  symbol: string;
  purchasedAt: number;
  daysHeld: number;
  avgPrice: number;
  currentPrice: number | null;
  gainPct: number;
}): JSX.Element {
  const positive = gainPct >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  const colorClass = positive ? "text-[#4dbe95]" : "text-[#d84f68]";
  return (
    <div className="rounded-2xl fey-card p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold mb-2">
        Holding mais antiga
      </div>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/asset/${symbol}`}
          className="text-[18px] font-semibold text-foreground hover:text-foreground/80 transition-colors"
        >
          {symbol}
        </Link>
        <span className="text-[12px] text-muted-foreground/70 tabular-nums">
          {daysHeld >= 365
            ? `${(daysHeld / 365).toFixed(1)} anos`
            : daysHeld >= 30
              ? `${Math.floor(daysHeld / 30)} meses`
              : `${Math.floor(daysHeld)} dias`}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground/70">
          Comprado em {new Date(purchasedAt * 1000).toLocaleDateString("pt-BR")}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <div className="text-muted-foreground/70 text-[10.5px] uppercase tracking-wide mb-0.5">
            Preço de compra
          </div>
          <div className="font-semibold tabular-nums text-foreground">
            {formatBRL(avgPrice)}
          </div>
        </div>
        {currentPrice != null && (
          <div>
            <div className="text-muted-foreground/70 text-[10.5px] uppercase tracking-wide mb-0.5">
              Variação
            </div>
            <div className={cn("inline-flex items-center gap-0.5 font-semibold tabular-nums", colorClass)}>
              <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
              {positive ? "+" : "−"}
              {Math.abs(gainPct * 100).toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── YTD ──────────────────────────────────────────────────────────────────

function YTDCard({
  pct,
  label,
}: {
  pct: number;
  label: "ytd" | "since_invested";
}): JSX.Element {
  const positive = pct >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  const colorClass = positive ? "text-[#4dbe95]" : "text-[#d84f68]";
  const labelText =
    label === "ytd" ? "Retorno YTD" : "Retorno desde criação";
  return (
    <div className="rounded-2xl fey-card p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold mb-2">
        {labelText}
      </div>
      <div className={cn("inline-flex items-baseline gap-1.5", colorClass)}>
        <Icon className="h-4 w-4" strokeWidth={2.5} />
        <span className="text-[28px] font-semibold tabular-nums leading-none tracking-tight">
          {positive ? "+" : "−"}
          {Math.abs(pct * 100).toFixed(2)}%
        </span>
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground/70 leading-relaxed">
        {label === "ytd"
          ? "Variação % do portfolio desde 1º de janeiro do ano corrente."
          : "Portfolio criado este ano — variação desde a criação."}
      </p>
    </div>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────────────

function LoadingState(): JSX.Element {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}

function ErrorState(): JSX.Element {
  return (
    <div className="mt-12 max-w-md mx-auto text-center">
      <p className="text-[14px] text-foreground">Erro ao carregar estatísticas.</p>
      <p className="mt-2 text-[12px] text-muted-foreground/70">
        Tente recarregar a página.
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}