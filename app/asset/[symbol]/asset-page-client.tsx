"use client";

/**
 * AssetPageClient — client shell de /asset/[symbol] (estilo Fey TSLA).
 *
 * Layout:
 *   <AssetHeader />              ← voltar + logo + ticker + sector + 3 ícones
 *   <PriceHero />                ← preço + delta inline + "BRL · B3"
 *   <PriceChart />               ← 2/3 width, 8 tabs (1D | 1W | ...)
 *   <NewsSummaryCard />          ← 1/3 width, tabs News | KPIs | About
 *   <MetricStrip />              ← 10 colunas, 1 linha
 *   <AnalystEstimates />         ← card com "All estimates" + tabs
 *
 * Dados:
 *   - GET /api/asset/[symbol]           → bundle (quote + metrics + candles)
 *   - GET /api/asset/[symbol]/candles   → range dinâmico
 *   - GET /api/news/multi?tickers=SYM   → news summary
 */

import { motion } from "motion/react";
import useSWR from "swr";
import { useMemo, useState } from "react";
import type { JSX } from "react";

import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import {
  StaggerOnMount,
  staggerParentVariants,
} from "@/components/foundation/stagger";
import { useAssetBackground } from "@/lib/use-asset-background";
import {
  AnalystRatingsRadar,
  deriveRatings,
} from "@/components/asset/analyst-ratings-radar";
import { AssetHeader } from "@/components/asset/asset-header";
import type { AssetBundle } from "@/components/asset/asset-bundle";
import { EPSQuarterlyChart, type QuarterPoint } from "@/components/asset/eps-quarterly-chart";
import { MetricStrip, type MetricCell } from "@/components/asset/metric-strip";
import { PEHistoryChart, type PEHistoryRow, type PESectorStats } from "@/components/asset/pe-history-chart";
import { PERatioComparison, type PeerRow } from "@/components/asset/pe-ratio-comparison";
import { PriceChart, type RangeKey } from "@/components/asset/price-chart";
import { PriceHero } from "@/components/asset/price-hero";
import { FairValueChart } from "@/components/asset/fair-value-chart";
import { CorrelatedStocksTable } from "@/components/asset/correlated-stocks-table";
import {
  QuarterResults,
  type QuarterResult,
} from "@/components/asset/quarter-results";
import { cn } from "@/lib/utils";

type Props = {
  symbol: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

export default function AssetPageClient({ symbol }: Props): JSX.Element {
  const [range, setRange] = useState<RangeKey>("1Y");

  // Glow da cor da marca (estilo Fey TSLA) — aplica variáveis CSS
  // --asset-glow-color e --asset-glow-opacity no container raiz.
  const { style: assetStyle, className: assetClassName } =
    useAssetBackground(symbol);

  // Bundle principal
  const { data: bundle, isLoading } = useSWR<AssetBundle>(
    `/api/asset/${symbol}`,
    fetchJson,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  // Candles do range selecionado
  // Mapeia RangeKey (UI) → range string esperado pelo endpoint /api/asset/[symbol]/candles
  const RANGE_TO_API: Record<RangeKey, string> = {
    "1D": "24h",
    "1W": "7d",
    "1M": "3m",
    "3M": "3m",
    "YTD": "ytd",
    "1Y": "1y",
    "5Y": "5y",
    All: "max",
  };
  const apiRange = RANGE_TO_API[range];
  const candlesUrl = `/api/asset/${symbol}/candles?range=${apiRange}`;
  const { data: candlesData } = useSWR<{ candles?: AssetBundle["candles"] }>(
    candlesUrl,
    fetchJson,
    { keepPreviousData: true }
  );
  const candles = candlesData?.candles ?? bundle?.candles ?? [];

  // ── Peer benchmarks (subsetor) ──────────────────────────────────────
  // O endpoint retorna lista de peers do subsetor do ativo, mais as
  // medianas e os stats do próprio ticker.
  const { data: peerData } = useSWR<{
    symbol: string;
    subSector: string | null;
    peerCount: number;
    peers?: Array<{
      symbol: string;
      name: string;
      evEbitda: number | null;
      roic: number | null;
      pe: number | null;
    }>;
    medians: {
      evEbitda: number | null;
      roic: number | null;
      pe: number | null;
    };
    asset: {
      evEbitda: number | null;
      roic: number | null;
      pe: number | null;
    };
  }>(`/api/peer-benchmarks/${symbol}`, fetchJson, {
    revalidateOnFocus: false,
  });

  // ── P/E histórico (bandas) ───────────────────────────────────────────
  // brapi /api/v2/stocks/statistics?symbols=X&mode=history&period=quarterly
  // (wrapper Sulfur: /api/asset/[symbol]/stats-history)
  const { data: peStatsData } = useSWR<{
    history?: PEHistoryRow[];
  }>(`/api/asset/${symbol}/stats-history`, fetchJson, {
    revalidateOnFocus: false,
  });
  const peHistory: PEHistoryRow[] = useMemo(() => {
    const raw = peStatsData?.history ?? [];
    return raw
      .map((r) => ({
        endDate: r.endDate,
        trailingPE:
          r.trailingPE != null && Number.isFinite(r.trailingPE)
            ? r.trailingPE
            : r.priceEarnings != null && Number.isFinite(r.priceEarnings)
              ? r.priceEarnings
              : null,
        priceEarnings:
          r.priceEarnings != null && Number.isFinite(r.priceEarnings)
            ? r.priceEarnings
            : null,
      }))
      .filter((r) => r.endDate && r.trailingPE != null);
  }, [peStatsData]);

  // ── EPS trimestral ───────────────────────────────────────────────────
  // brapi /api/v2/stocks/income-statement?symbols=X&period=quarterly
  // (wrapper Sulfur: /api/asset/[symbol]/income-quarterly)
  type IncomeQuarterlyRow = {
    endDate: string;
    basicEarningsPerShare?: number | null;
    dilutedEarningsPerShare?: number | null;
    earningsPerShare?: number | null;
    totalRevenue?: number | null;
  };
  const { data: incomeData } = useSWR<{ income?: IncomeQuarterlyRow[] }>(
    `/api/asset/${symbol}/income-quarterly`,
    fetchJson,
    { revalidateOnFocus: false },
  );
  const peerSymbols = useMemo(
    () =>
      (peerData?.peers ?? [])
        .map((p) => p.symbol)
        .filter(Boolean)
        .slice(0, 6),
    [peerData]
  );
  const peerNameBySymbol = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of peerData?.peers ?? []) {
      m.set(p.symbol, p.name);
    }
    return m;
  }, [peerData]);

  // P/E do ativo: prioriza trailingPE do bundle; se null, calcula
  // price/eps a partir de dados reais (fallback honesto).
  const mainPe = useMemo(() => {
    if (bundle?.metrics.trailingPE != null) return bundle.metrics.trailingPE;
    const price = bundle?.quote.price;
    const eps = bundle?.metrics.eps;
    if (price != null && eps != null && eps > 0) {
      return price / eps;
    }
    return null;
  }, [bundle]);

  // peerRows: peers do subsetor (do /api/peer-benchmarks).
  // O ativo principal tem `pe = mainPe`; peers reais usam `peerData.peers[].pe`.
  // Mantém o ativo principal como a última linha (Fey TSLA faz assim).
  //
  // Filtro de outliers: P/E <= 0 (empresa com prejuízo) ou P/E > 100
  // (geralmente EPS ~0 ou erro de amostra) quebram a escala do gráfico
  // e tornam a mediana inútil. Mantém só peers com P/E razoável.
  const peerRows = useMemo<PeerRow[]>(() => {
    const realPeers: PeerRow[] = (peerData?.peers ?? [])
      .filter((p) => p.symbol !== symbol)
      .map((p) => {
        const pe =
          p.pe != null && Number.isFinite(p.pe) && p.pe > 0 && p.pe < 100
            ? p.pe
            : null;
        return { symbol: p.symbol, name: p.name, pe };
      })
      // ordena por P/E asc pra deixar layout mais legível
      .sort((a, b) => (a.pe ?? 9999) - (b.pe ?? 9999));
    return [
      ...realPeers,
      { symbol, name: symbol, pe: mainPe },
    ];
  }, [peerData, symbol, mainPe]);

  // P/E médio do setor (mediano dos peers, excluindo o próprio ativo)
  const sectorPeMedian = useMemo(() => {
    const values = peerRows
      .filter((r) => r.symbol !== symbol && r.pe != null)
      .map((r) => r.pe as number);
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }, [peerRows, symbol]);

  // Quartis do subsetor (mediana + P25 + P75). Usado pelo PEHistoryChart
  // pra contextualizar o ticker vs peers.
  const sectorStats = useMemo<PESectorStats | null>(() => {
    const values = peerRows
      .filter((r) => r.symbol !== symbol && r.pe != null && Number.isFinite(r.pe))
      .map((r) => r.pe as number);
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const q = (p: number) => {
      const pos = (sorted.length - 1) * p;
      const base = Math.floor(pos);
      const rest = pos - base;
      const upper = sorted[base + 1] ?? sorted[base];
      return sorted[base] + rest * (upper - sorted[base]);
    };
    return {
      median: q(0.5),
      p25: q(0.25),
      p75: q(0.75),
      count: sorted.length,
    };
  }, [peerRows, symbol]);

  // ── Earnings data (real, do /api/asset/[symbol]/income-quarterly) ───
  const earningsData = useMemo(() => {
    const incomeQ = (incomeData?.income ?? []) as Array<Record<string, unknown>>;

    // Mapeia rows brapi → QuarterPoint (filtra nulos, ordena asc).
    // IMPORTANTE: filtra por `endDate` apenas (não por epsBasic) — o
    // QuarterResults precisa de TODOS os quarters com revenue válida,
    // mesmo quando brapi omite EPS (que é usado só no EPSQuarterlyChart).
    // Antes: `.filter((q) => q.endDate && q.epsBasic != null)` descartava
    // quarters com revenue boa mas EPS null (ex: 2025-Q4), fazendo Q4
    // aparecer como "—" no chart de revenue.
    const quarters: QuarterPoint[] = incomeQ
      .map((r) => ({
        endDate: String(r.endDate ?? ""),
        epsBasic:
          r.basicEarningsPerShare != null
            ? Number(r.basicEarningsPerShare)
            : r.dilutedEarningsPerShare != null
              ? Number(r.dilutedEarningsPerShare)
              : r.earningsPerShare != null
                ? Number(r.earningsPerShare)
                : null,
        revenue: r.totalRevenue != null ? Number(r.totalRevenue) : null,
      }))
      .filter((q) => q.endDate && q.revenue != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    // Fallback: se a brapi não retornou incomeQuarterly, mas tem eps
    // (TTM) + revenue, criamos 1 ponto "TTM" agregado (NÃO é histórico
    // real — é o agregado dos últimos 12 meses mostrado como ponto
    // único pra preencher o gráfico com honestidade).
    if (quarters.length === 0) {
      const ttmEps = bundle?.metrics?.eps ?? bundle?.metrics?.forwardEps;
      if (ttmEps != null) {
        // endDate fictício só pro eixo X — label real é "TTM"
        quarters.push({
          endDate: "TTM",
          epsBasic: ttmEps,
          revenue: bundle?.metrics?.revenue ?? null,
        });
      }
    }

    // QuarterResults: 5 últimos quarters reais + 1 projected (estilo Fey TSLA).
    // Só considera quarters com EPS válido pra evitar buracos na série.
    const last5 = quarters.filter(
      (q): q is QuarterPoint & { epsBasic: number } => q.epsBasic != null,
    ).slice(-5);

    /** Helper: status heurístico baseado em variação vs Q anterior. */
    const trendOf = (
      current: number,
      prev: number | null,
    ): "missed" | "beat" | "flat" => {
      if (prev == null || prev === 0) return "flat";
      const change = ((current - prev) / Math.abs(prev)) * 100;
      if (change < -5) return "missed";
      if (change > 5) return "beat";
      return "flat";
    };

    /** Helper: yoy % vs quarter 4 antes (na série filtrada). */
    const yoyOf = (
      idx: number,
      all: Array<QuarterPoint & { epsBasic: number }>,
      current: number,
    ): number | null => {
      const prevYearIdx = idx - 4;
      if (prevYearIdx < 0) return null;
      const prevYear = all[prevYearIdx];
      if (!prevYear || prevYear.epsBasic === 0) return null;
      return ((current - prevYear.epsBasic) / Math.abs(prevYear.epsBasic)) * 100;
    };

    const results: QuarterResult[] = last5.map((q, idx) => {
      const prevQ = idx > 0 ? last5[idx - 1] : null;
      const trend = trendOf(q.epsBasic, prevQ ? prevQ.epsBasic : null);
      return {
        label: formatQuarterLabel(q.endDate),
        status: "actual",
        headline: trend === "beat" ? "Beat" : trend === "missed" ? "Miss" : "Flat",
        trend,
        eps: q.epsBasic,
        revenue: q.revenue,
        yoyChangePct: yoyOf(idx, last5, q.epsBasic),
      };
    });

    // Próximo quarter projected = baseado em forwardEps/4
    const forwardEps = bundle?.metrics?.forwardEps;
    if (forwardEps != null && quarters.length > 0) {
      const lastQ = quarters[quarters.length - 1];
      const lastDate = new Date(lastQ.endDate + "T00:00:00Z");
      const nextDate = new Date(lastDate);
      nextDate.setUTCMonth(nextDate.getUTCMonth() + 3);
      const nextLabel = formatQuarterLabel(
        nextDate.toISOString().slice(0, 10),
      );
      // Estimated revenue = média dos 4 últimos × (1 + earnings growth)
      const recentRevenue =
        last5
          .map((q) => q.revenue ?? 0)
          .filter((v) => v > 0)
          .reduce((s, v, _, arr) => s + v / arr.length, 0);
      const earningsGrowth = forwardEps
        ? (forwardEps / (last5[last5.length - 1]?.epsBasic ?? 1) - 1)
        : 0;
      results.push({
        label: `Projected Q1 date`,
        status: "projected",
        headline: nextDate.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        }),
        trend: "flat",
        eps: forwardEps,
        revenue:
          recentRevenue > 0 ? recentRevenue * (1 + earningsGrowth) : null,
        yoyChangePct: null,
      });
    }

    return { quarters, results };
  }, [incomeData, bundle]);

  // Metric strip (10 widgets estilo Fey TSLA)
  const metricCells = useMemo<MetricCell[]>(() => {
    if (!bundle) return [];
    const m = bundle.metrics;
    const q = bundle.quote;
    const currency = (bundle.currency as "BRL" | "USD") ?? "BRL";

    const fmtCompact = (v: number | null) =>
      v == null ? "—" : v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
    const fmtCurrencyCompact = (v: number | null) =>
      v == null
        ? "—"
        : v.toLocaleString("en-US", {
          style: "currency",
          currency,
          notation: "compact",
          maximumFractionDigits: 2,
        });
    const fmtPercent = (v: number | null) =>
      v == null ? "—" : `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    const fmtMultiple = (v: number | null) =>
      v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 2 });

    // grossMargin e profitMargin vêm em decimal (0-1) da brapi — converte pra %
    const fmtMarginPercent = (v: number | null) => {
      if (v == null) return "—";
      const pct = v <= 1 ? v * 100 : v; // se vier 0.16 vira 16; se vier 16 fica 16
      return `${pct.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    };

    return [
      { label: "Mkt cap", value: fmtCurrencyCompact(m.marketCap) },
      { label: "EV/Sales", value: fmtMultiple(m.evToSales) },
      { label: "P/E ratio", value: fmtMultiple(m.trailingPE) },
      { label: "FY Revenue", value: fmtCurrencyCompact(m.revenue) },
      { label: "EPS", value: m.eps != null ? fmtCurrencyCompact(m.eps) : "—" },
      { label: "Gross Margin", value: fmtMarginPercent(m.grossMargin) },
      { label: "Profit Margin", value: fmtMarginPercent(m.profitMargin) },
      { label: "Beta", value: fmtMultiple(m.beta) },
      { label: "Div yield", value: fmtPercent(m.dividendYield) },
      { label: "Sector", value: m.sector ?? "—" },
    ];
  }, [bundle]);

  return (
    <div
      className={cn(
        "min-h-screen text-foreground asset-bg",
        assetClassName
      )}
      style={{ background: "#070709", ...assetStyle }}
    >
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-6 pb-32 relative z-10"
      >
        <StaggerOnMount>
          <AssetHeader
            symbol={symbol}
            longName={bundle?.longName ?? null}
            shortName={bundle?.shortName ?? null}
            sector={bundle?.sector ?? "—"}
          />
        </StaggerOnMount>

        <StaggerOnMount>
          <PriceHero
            price={bundle?.quote.price ?? null}
            currency={(bundle?.currency as "BRL" | "USD") ?? "BRL"}
            change={bundle?.quote.change ?? null}
            changePercent={bundle?.quote.changePercent ?? null}
            location="B3"
            loading={isLoading && !bundle}
          />
        </StaggerOnMount>

        {/* Grid 2-col: gráfico (full-width agora; NewsSummary removido — news é feature da /home) */}
                <StaggerOnMount>
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr] gap-5">
                    <PriceChart
                      candles={candles}
                      range={range}
                      onRangeChange={setRange}
                      prevClose={bundle?.quote.prevClose ?? null}
                      loading={isLoading && candles.length === 0}
                    />
                  </div>
                </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          <MetricStrip cells={metricCells} />
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          {/* Card container estilo Fey: Analyst estimates */}
          <div className="rounded-2xl border border-white/10 bg-[#101116] p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
                  Analyst estimates
                </h2>
                <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-semibold text-muted-foreground/70">
                  A
                </span>
              </div>
              <a
                href={`/asset/${symbol}/analysis`}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md cursor-pointer bg-white/[0.04] border border-white/10 text-foreground text-[12px] font-medium hover:bg-white/[0.08] hover:border-white/20 transition-colors"
              >
                Full analysis
              </a>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Analyst ratings breakdown */}
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
                <AnalystRatingsRadar
                  ratings={deriveRatings(
                    bundle?.metrics.recommendationMean ?? null,
                    bundle?.metrics.numberOfAnalystOpinions ?? null
                  )}
                  mean={bundle?.metrics.recommendationMean ?? null}
                  total={bundle?.metrics.numberOfAnalystOpinions ?? null}
                />
              </div>

              {/* A7 fix (spec 2026-08-29): substituir PriceTargetChart (que
                  mockava target sell-side — brapi não tem pra BR) por
                  FairValueChart que plota preço vs fair value implícito
                  (= EPS LTM × P/L médio 5a). Só dado real. */}
              <FairValueChart
                earningsYieldHistory={bundle?.earningsYieldHistory ?? []}
              />
            </div>
          </div>
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          {/* Card Earnings expandido (estilo Fey TSLA) — 100% dado real */}
          <div className="rounded-2xl border border-white/10 bg-[#101116] p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
                  Earnings
                </h2>
                <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-semibold text-muted-foreground/70">
                  E
                </span>
              </div>
              <a
                href={`/asset/${symbol}/analysis`}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md cursor-pointer bg-white/[0.04] border border-white/10 text-foreground text-[12px] font-medium hover:bg-white/[0.08] hover:border-white/20 transition-colors"
              >
                Full analysis
              </a>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-5">
              {/* P/E: histórico (bandas) + comparação com peers */}
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5 flex flex-col gap-4">
                <PEHistoryChart
                  history={peHistory}
                  currentPe={mainPe}
                  sectorStats={sectorStats}
                />
                <div className="border-t border-white/[0.06] pt-4">
                  <PERatioComparison
                    mainPe={mainPe}
                    sectorPe={sectorPeMedian}
                    peers={peerRows}
                    peerLimit={4}
                  />
                </div>
              </div>

              {/* EPS quarterly chart */}
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
                <EPSQuarterlyChart
                  quarters={earningsData.quarters}
                  currency={(bundle?.currency as "BRL" | "USD") ?? "BRL"}
                  limit={5}
                  forwardEps={bundle?.metrics?.forwardEps ?? null}
                />
              </div>
            </div>

            {/* QuarterResults grid (revenue chart por ano) — ocupa metade,
              deixando a metade direita livre pra futura adição */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
                <QuarterResults
                  results={earningsData.results}
                  quarters={earningsData.quarters}
                  currency={(bundle?.currency as "BRL" | "USD") ?? "BRL"}
                />
              </div>
              {/* Slot direito livre — Ações correlatas do subsetor */}
              <CorrelatedStocksTable symbol={symbol} />
            </div>
          </div>
        </StaggerOnMount>
      </motion.main>

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type NewsApiItem = {
  id: string;
  headline: string;
  summary?: string;
  source: string;
  /** Unix timestamp (segundos). */
  datetime?: number;
  /** Tickers mencionados — vem do tagger server-side em /api/news/multi. */
  tickers?: string[];
};

// Helper: formata endDate (ISO "YYYY-MM-DD") pra "Q1 2024".
// Se endDate for "TTM" (fallback), retorna como está.
function formatQuarterLabel(endDate: string): string {
  if (endDate === "TTM") return "TTM";
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}
