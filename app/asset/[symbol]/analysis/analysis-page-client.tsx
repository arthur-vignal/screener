"use client";

/**
 * AnalysisPageClient — client shell de /asset/[symbol]/analysis.
 *
 * Layout (3 seções verticais, 8 gráficos total):
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ AnalysisHero                                │
 *   └─────────────────────────────────────────────┘
 *
 *   SEÇÃO 1 — Valuation contextualizada (2 cols)
 *   ┌────────────────────┬─────────────────────┐
 *   │ PESelicScatter     │ EarningsYieldVsCDI  │
 *   └────────────────────┴─────────────────────┘
 *
 *   SEÇÃO 2 — Qualidade do ativo (3 cards: 2 + 1 menor)
 *   ┌────────────────────┬───────────────┐
 *   │ MarginTrend (16Q)  │ OwnershipDonut│
 *   │                    │               │
 *   ├────────────────────┤               │
 *   │ ROICVsSelic        │               │
 *   └────────────────────┴───────────────┘
 *
 *   SEÇÃO 3 — Earnings power vs macro (2 cols)
 *   ┌────────────────────┬─────────────────────┐
 *   │ EPSVsRiskFree      │ RevenueVsPIB        │
 *   └────────────────────┴─────────────────────┘
 */

import { useMemo } from "react";
import type { JSX } from "react";
import useSWR from "swr";

import { AnalysisHero } from "@/components/analysis/analysis-hero";
import { PESelicScatter } from "@/components/analysis/pe-selic-scatter";
import { EarningsYieldVsCDI } from "@/components/analysis/earnings-yield-vs-cdi";
import { MarginTrend } from "@/components/analysis/margin-trend";
import { ROICVsSelic } from "@/components/analysis/roic-vs-selic";
import { OwnershipDonut } from "@/components/analysis/ownership-donut";
import { RevenueVsPIB } from "@/components/analysis/revenue-vs-pib";
import { EPSVsRiskFree } from "@/components/analysis/eps-vs-risk-free";
import { AssetHeader } from "@/components/asset/asset-header";
import { DashboardDock } from "@/components/foundation/dashboard-dock";
import { StaggerOnMount } from "@/components/foundation/stagger";

import { cn } from "@/lib/utils";

type AnalysisResponse = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  sector: string;
  industry: string;
  currency: string;
  logoUrl?: string | null;
  quote: {
    price: number | null;
    marketCap: number | null;
  };
  metrics: {
    trailingPE: number | null;
    enterpriseToEbitda: number | null;
    returnOnEquity: number | null;
    dividendYield: number | null;
    heldPercentInsiders: number | null;
    heldPercentInstitutions: number | null;
  };
  marginsHistory: Array<{
    endDate: string;
    grossMargins?: number | null;
    operatingMargins?: number | null;
    profitMargins?: number | null;
    returnOnEquity?: number | null;
  }>;
  incomeHistory: Array<{
    endDate: string;
    totalRevenue?: number | null;
    basicEarningsPerShare?: number | null;
    dilutedEarningsPerShare?: number | null;
  }>;
  macro: {
    selic?: Array<{ date: string; value: number }>;
    ipca12m?: Array<{ date: string; value: number }>;
    cdi?: Array<{ date: string; value: number }>;
    ibcbr?: Array<{ date: string; value: number }>;
  };
  fetchedAt: string;
};

type Peer = { symbol: string; pe: number | null };

type PeerBenchmarksResponse = {
  symbol: string;
  subSector: string | null;
  peerCount: number;
  peers: Peer[];
  medians: {
    pe: number | null;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

type Props = {
  symbol: string;
};

export function AnalysisPageClient({ symbol }: Props): JSX.Element {
  const { data: bundle, isLoading: bundleLoading } = useSWR<AnalysisResponse>(
    `/api/asset/${symbol}/analysis`,
    fetchJson,
    { revalidateOnFocus: false },
  );

  const { data: peerData } = useSWR<PeerBenchmarksResponse>(
    `/api/peer-benchmarks/${symbol}`,
    fetchJson,
    { revalidateOnFocus: false },
  );

  // P/L histórico vem de /api/asset/[symbol]/stats-history
  const { data: statsHistory } = useSWR<{
    history?: Array<{ endDate: string; trailingPE?: number | null }>;
  }>(`/api/asset/${symbol}/stats-history`, fetchJson, {
    revalidateOnFocus: false,
  });

  const peers: Peer[] = useMemo(
    () => peerData?.peers ?? [],
    [peerData],
  );

  const selicMacro = bundle?.macro?.selic ?? null;
  const ipca12mMacro = bundle?.macro?.ipca12m ?? null;
  const cdiMacro = bundle?.macro?.cdi ?? null;
  const ibcBrMacro = bundle?.macro?.ibcbr ?? null;

  const lastSelic =
    selicMacro && selicMacro.length > 0
      ? selicMacro[selicMacro.length - 1].value
      : null;
  const lastIBCBr =
    ibcBrMacro && ibcBrMacro.length > 0
      ? ibcBrMacro[ibcBrMacro.length - 1].value
      : null;

  // Stats history filtrada: só quarters com PE válido (mesma lógica do chart de PE).
  const statsHistoryFiltered = useMemo(() => {
    if (!statsHistory?.history) return [];
    return statsHistory.history.filter(
      (r) =>
        r.trailingPE != null &&
        r.trailingPE > 0 &&
        r.trailingPE < 100 &&
        r.endDate != null,
    );
  }, [statsHistory]);

  return (
    <div className="min-h-screen text-foreground asset-bg" style={{ background: "#070709" }}>
      <main className="w-[90%] mx-auto py-6 pb-32">
        {/* Header padrão da página de asset */}
        <StaggerOnMount>
          <AssetHeader
            symbol={symbol}
            longName={bundle?.longName ?? null}
            shortName={bundle?.shortName ?? null}
            sector={bundle?.sector ?? "—"}
          />
        </StaggerOnMount>

        {/* Hero */}
        <StaggerOnMount className="mt-6">
          {bundle ? (
            <AnalysisHero
              symbol={symbol}
              longName={bundle.longName}
              sector={bundle.sector}
              industry={bundle.industry}
              trailingPE={bundle.metrics.trailingPE}
              enterpriseToEbitda={bundle.metrics.enterpriseToEbitda}
              returnOnEquity={bundle.metrics.returnOnEquity}
              dividendYield={bundle.metrics.dividendYield}
              selic={lastSelic}
              ipca12m={
                ipca12mMacro && ipca12mMacro.length > 0
                  ? ipca12mMacro[ipca12mMacro.length - 1].value
                  : null
              }
              cdiDaily={
                cdiMacro && cdiMacro.length > 0
                  ? cdiMacro[cdiMacro.length - 1].value
                  : null
              }
              sectorPeMedian={peerData?.medians?.pe ?? null}
            />
          ) : bundleLoading ? (
            <HeroSkeleton />
          ) : (
            <ErrorCard message="Não foi possível carregar os dados desta ação." />
          )}
        </StaggerOnMount>

        {/* Seção 1 — Valuation contextualizada */}
        <StaggerOnMount className="mt-6">
          <SectionHeader
            index={1}
            title="Valuation contextualizada"
            question="Está caro ou barato em relação ao que rende a renda fixa?"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
            <PESelicScatter
              mainPe={bundle?.metrics.trailingPE ?? null}
              peers={peers}
              selic={lastSelic}
              highlightSymbol={symbol}
            />
            <EarningsYieldVsCDI
              statsHistory={statsHistoryFiltered}
              cdiDaily={cdiMacro}
            />
          </div>
        </StaggerOnMount>

        {/* Seção 2 — Qualidade do ativo */}
        <StaggerOnMount className="mt-6">
          <SectionHeader
            index={2}
            title="Qualidade do ativo"
            question="Quão lucrativo é o negócio e quem está segurando?"
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
            <div className="lg:col-span-2 flex flex-col gap-5">
              <MarginTrend
                history={bundle?.marginsHistory ?? []}
                limit={16}
              />
              <ROICVsSelic
                marginsHistory={bundle?.marginsHistory ?? []}
                selic={selicMacro}
              />
            </div>
            <OwnershipDonut
              heldPercentInsiders={
                bundle?.metrics.heldPercentInsiders ?? null
              }
              heldPercentInstitutions={
                bundle?.metrics.heldPercentInstitutions ?? null
              }
            />
          </div>
        </StaggerOnMount>

        {/* Seção 3 — Earnings power vs macro */}
        <StaggerOnMount className="mt-6">
          <SectionHeader
            index={3}
            title="Earnings power vs macro"
            question="O ativo está gerando valor acima do custo de oportunidade?"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
            <EPSVsRiskFree
              incomeHistory={bundle?.incomeHistory ?? []}
              selic={selicMacro}
            />
            <RevenueVsPIB
              incomeHistory={bundle?.incomeHistory ?? []}
              ibcBr={ibcBrMacro}
            />
          </div>
        </StaggerOnMount>

        {/* Disclaimer sobre mocks */}
        <p className="mt-8 text-[10px] text-muted-foreground/45 leading-relaxed text-center">
          Dados brapi (B3 + BCB via brapi). Sell-side target não disponível
          pra tickers BR. Price target na raiz usa mocks baseados em
          volatilidade — quando Sulfur tiver a própria engine de precificação,
          esses valores viram dados reais.
        </p>
      </main>
      <DashboardDock />
    </div>
  );
}

/* ============================================================ */

function SectionHeader({
  index,
  title,
  question,
}: {
  index: number;
  title: string;
  question: string;
}): JSX.Element {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55 font-semibold">
          Seção {index}
        </span>
      </div>
      <h2 className="text-[18px] font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-[12px] text-muted-foreground/85">
        {question}
      </p>
    </div>
  );
}

function HeroSkeleton(): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] p-6 animate-pulse">
      <div className="h-6 w-32 bg-white/[0.04] rounded mb-3" />
      <div className="h-3 w-3/4 bg-white/[0.04] rounded mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/[0.04] rounded-lg" />
        ))}
      </div>
      <div className="h-3 w-1/2 bg-white/[0.04] rounded" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--negative)]/30 bg-[var(--negative)]/5 p-6 text-center">
      <p className="text-[13px] text-[var(--negative)]">{message}</p>
    </div>
  );
}
