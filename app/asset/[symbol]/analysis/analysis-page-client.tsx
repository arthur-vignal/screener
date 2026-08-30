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
 *   │ MarginTrend (16Q)  │ (livre — era OwnershipDonut, A5)        │
 *   │                   │ LeverageChart (B2)                       │
 *   │                    │               │
 *   ├────────────────────┤               │
 *   │ ROICVsSelic        │               │
 *   └────────────────────┴───────────────┘
 *
 *   SEÇÃO 3 — Earnings power vs macro (2 cols)
 *   ┌────────────────────┬─────────────────────┐
 *   │ EarningsYieldVsRiskFree │ RevenueVsPIB    │
 *   └────────────────────┴─────────────────────┘
 */

import { useMemo } from "react";
import type { JSX } from "react";
import useSWR from "swr";

import { AnalysisHero } from "@/components/analysis/analysis-hero";
import { ValuationBands } from "@/components/analysis/valuation-bands";
import { PeerScatter } from "@/components/analysis/peer-scatter";
import type {
  BandStats,
  MultiplesBands,
} from "@/lib/analytics/valuation-bands";

import { ROICVsWACC } from "@/components/analysis/roic-vs-wacc";
import { LeverageChart } from "@/components/analysis/leverage-chart";
import { YieldComparison } from "@/components/analysis/yield-comparison";
import { EquityRiskPremium } from "@/components/analysis/equity-risk-premium";
import type {
  ROICWACCPoint,
  ROICWACCSummary,
} from "@/lib/analytics/roic-wacc";
import type {
  LeveragePoint,
  LeverageSummary,
} from "@/lib/analytics/leverage";
import type {
  YieldPoint,
  YieldSummary,
} from "@/lib/analytics/yield-comparison";
import type {
  EquityRiskPremiumPoint,
  EquityRiskPremiumSummary,
} from "@/lib/analytics/equity-risk-premium";

const emptyBands: MultiplesBands = {
  pe: { current: null, mean: null, std: null, sigma1Low: null, sigma1High: null, sigma2Low: null, sigma2High: null, percentile: null, series: [], rawSeries: [], count: 0, insufficient: true },
  evebitda: { current: null, mean: null, std: null, sigma1Low: null, sigma1High: null, sigma2Low: null, sigma2High: null, percentile: null, series: [], rawSeries: [], count: 0, insufficient: true },
  pbv: { current: null, mean: null, std: null, sigma1Low: null, sigma1High: null, sigma2Low: null, sigma2High: null, percentile: null, series: [], rawSeries: [], count: 0, insufficient: true },
  peMean5a: null,
  windowYears: 5,
};
import { EarningsYieldVsRiskFree } from "@/components/analysis/earnings-yield-vs-risk-free";
import { MarginTrend } from "@/components/analysis/margin-trend";
import { RevenueVsPIB } from "@/components/analysis/revenue-vs-pib";

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
  earningsYieldHistory: Array<{
    endDate: string;
    epsLtm: number | null;
    price: number | null;
    trailingPE: number | null;
    earningsYield: number | null;
  }>;
  valuationBands: MultiplesBands;
  roicWacc: { series: ROICWACCPoint[]; summary: ROICWACCSummary };
  leverage: { series: LeveragePoint[]; summary: LeverageSummary };
  yieldComparison: { series: YieldPoint[]; summary: YieldSummary };
  equityRiskPremium: { series: EquityRiskPremiumPoint[]; summary: EquityRiskPremiumSummary };
  macro: {
    selic?: Array<{ date: string; value: number }>;
    ipca12m?: Array<{ date: string; value: number }>;
    cdi?: Array<{ date: string; value: number }>;
    ibcbr?: Array<{ date: string; value: number }>;
  };
  fetchedAt: string;
};

type Peer = {
  symbol: string;
  name: string;
  evEbitda: number | null;
  roe: number | null;
  pe: number | null;
};

type PeerBenchmarksResponse = {
  symbol: string;
  subSector: string | null;
  peerCount: number;
  peers: Peer[];
  medians: {
    evEbitda: number | null;
    roe: number | null;
    pe: number | null;
  };
  asset: { evEbitda: number | null; roe: number | null; pe: number | null };
  sectorFallback: boolean;
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

  // Macro histórico (10 anos SELIC/CDI, 20 anos IBC-Br) via BCB SGS.
  // brapi limita SELIC/CDI a ~1.5 anos, então usamos BCB pra ter
  // histórico comparável ao do ativo (que vai de 2016+).
  type BcbResponse = {
    series: {
      selic?: Array<{ date: string; value: number }>;
      cdi?: Array<{ date: string; value: number }>;
      ibcbr?: Array<{ date: string; value: number }>;
    };
  };
  const { data: bcbData } = useSWR<BcbResponse>(
    `/api/macro/bcb?series=selic,cdi,ibcbr`,
    fetchJson,
    { revalidateOnFocus: false },
  );

  const peers: Peer[] = useMemo(
    () => peerData?.peers ?? [],
    [peerData],
  );

  // Preferência: BCB (longo) > bundle.macro (brapi, curto).
  const selicMacro = bcbData?.series?.selic ?? bundle?.macro?.selic ?? null;
  const ibcBrMacro = bcbData?.series?.ibcbr ?? bundle?.macro?.ibcbr ?? null;
  const cdiMacro = bcbData?.series?.cdi ?? bundle?.macro?.cdi ?? null;
  const ipca12mMacro = bundle?.macro?.ipca12m ?? null;

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
            {/* B1 (spec 2026-08-29): ValuationBands substitui PESelicScatter
                na seção 1. Mostra o múltiplo histórico (P/L | EV/EBITDA |
                P/VP) com bandas ±1σ/±2σ, percentil atual e sub-gráfico
                de preço vs fair value (B1.b). */}
            <ValuationBands
              valuationBands={bundle?.valuationBands ?? emptyBands}
              earningsYieldHistory={bundle?.earningsYieldHistory ?? []}
            />
            {/* B4 (spec 2026-08-29): PeerScatter (ROE × EV/EBITDA com
                reta OLS). Mostra o ativo vs peers do subsetor. Reta OLS
                só é plotada com ≥5 peers. */}
            <PeerScatter
              peers={peers as unknown as Peer[]}
              asset={peerData?.asset ?? {
                evEbitda: null,
                roe: null,
                pe: null,
              }}
              subSector={peerData?.subSector ?? null}
              medians={peerData?.medians ?? {
                evEbitda: null,
                roe: null,
                pe: null,
              }}
              sectorFallback={peerData?.sectorFallback ?? false}
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
              <ROICVsWACC
                series={bundle?.roicWacc.series ?? []}
                summary={bundle?.roicWacc.summary ?? {
                  roic: null,
                  wacc: null,
                  spread: null,
                  beta: null,
                  settings: { erp: 5.5, riskFreeRate: 13.5, marginalTaxRate: 34 },
                  isFinancial: false,
                }}
              />
            </div>
            <div>
              {/* B2 (spec 2026-08-29): substitui o slot do antigo
                  OwnershipDonut (A5). Alavancagem + cobertura de juros
                  com bandas de risco. Empty state pra Financial Services. */}
              <LeverageChart
                series={bundle?.leverage.series ?? []}
                summary={bundle?.leverage.summary ?? {
                  leverage: null,
                  coverage: null,
                  netCash: false,
                  isFinancial: false,
                }}
              />
            </div>
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
            <EarningsYieldVsRiskFree
              earningsYieldHistory={bundle?.earningsYieldHistory ?? []}
              selic={selicMacro}
            />
            <RevenueVsPIB
              incomeHistory={bundle?.incomeHistory ?? []}
              ibcBr={ibcBrMacro}
            />
          </div>
        </StaggerOnMount>

        {/* Seção 4 — Quanto você espera ganhar (B3 + B5) */}
        <StaggerOnMount className="mt-6">
          <SectionHeader
            index={4}
            title="Quanto você espera ganhar"
            question="A ação paga mais que a renda fixa?"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
            <YieldComparison
              series={bundle?.yieldComparison.series ?? []}
              summary={bundle?.yieldComparison.summary ?? {
                earningsYield: null,
                fcfYield: null,
                dividendYield: null,
                earningsFcfGapAvg: null,
              }}
            />
            <EquityRiskPremium
              series={bundle?.equityRiskPremium.series ?? []}
              summary={bundle?.equityRiskPremium.summary ?? {
                premium: null,
                earningsYield: null,
                ntnbRate: null,
                ntnbSymbol: "tesouro-ipca-15052045",
              }}
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
