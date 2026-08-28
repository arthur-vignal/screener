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

import { DashboardDock } from "@/components/foundation/dashboard-dock";
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
import {
  NewsSummaryCard,
  type NewsSummaryItem,
} from "@/components/asset/news-summary-card";
import { PERatioComparison, type PeerRow } from "@/components/asset/pe-ratio-comparison";
import { PriceChart, type RangeKey } from "@/components/asset/price-chart";
import { PriceHero } from "@/components/asset/price-hero";
import { PriceTargetChart } from "@/components/asset/price-target-chart";
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

  // News summary (pega primeira notícia relevante do ticker)
  const { data: newsData, isLoading: newsLoading } = useSWR<{ news?: NewsApiItem[] }>(
    `/api/news/multi?tickers=${symbol}`,
    fetchJson
  );
  const newsItems = useMemo<NewsSummaryItem[]>(() => {
    const items = newsData?.news ?? [];
    return items.slice(0, 1).map((n) => ({
      id: n.id,
      title: n.headline,
      summary: stripHtml(n.summary ?? ""),
      source: n.source,
      publishedAt: toIso(n.datetime),
    }));
  }, [newsData]);

  // ── Peer benchmarks (subsetor) ──────────────────────────────────────
  // O endpoint retorna lista de peers do subsetor do ativo.
  const { data: peerData } = useSWR<{
    peers?: Array<{ symbol: string; shortName?: string; longName?: string }>;
  }>(`/api/peer-benchmarks/${symbol}`, fetchJson, {
    revalidateOnFocus: false,
  });
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
      m.set(
        p.symbol,
        p.shortName ?? p.longName ?? p.symbol
      );
    }
    return m;
  }, [peerData]);

  // ── Batch quote pra P/E dos peers (priceEarnings) ──────────────────
  // Inclui o ativo principal + peers.
  const batchSymbols = useMemo(() => {
    const set = new Set<string>([symbol, ...peerSymbols]);
    return Array.from(set);
  }, [symbol, peerSymbols]);
  const { data: batchData } = useSWR<{
    rows?: Array<{
      symbol: string;
      quote?: { priceEarnings?: number | null };
    }>;
  }>(
    batchSymbols.length > 0
      ? `/api/assets/quote?symbols=${batchSymbols.join(",")}`
      : null,
    fetchJson,
    { revalidateOnFocus: false }
  );

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

  const peerRows = useMemo<PeerRow[]>(() => {
    const rows: PeerRow[] = [];
    for (const sym of batchSymbols) {
      let pe: number | null = null;
      if (sym === symbol) {
        // Ativo principal: usa mainPe (que tem fallback price/eps).
        pe = mainPe;
      } else {
        // Peer: usa o priceEarnings do batch.
        const batchPe = batchData?.rows?.find((r) => r.symbol === sym)
          ?.quote?.priceEarnings;
        pe =
          batchPe == null || !Number.isFinite(batchPe) ? null : batchPe;
      }
      rows.push({
        symbol: sym,
        name: peerNameBySymbol.get(sym) ?? sym,
        pe,
      });
    }
    return rows;
  }, [batchSymbols, batchData, peerNameBySymbol, symbol, mainPe]);

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

  // ── Earnings data (real, do bundle.historicals.incomeQuarterly) ────
  const earningsData = useMemo(() => {
    const incomeQ = (bundle?.historicals?.incomeQuarterly ?? []) as Array<
      Record<string, unknown>
    >;

    // Mapeia rows brapi → QuarterPoint (filtra nulos, ordena asc)
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
      .filter((q) => q.endDate && q.epsBasic != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    // Fallback: se a brapi não retornou incomeQuarterly, mas tem eps
    // (TTM) + revenue, derivamos 1 ponto "TTM" baseado no dado TTM
    // (NÃO é histórico real — é o agregado TTM mostrado como ponto
    // único pra preencher o gráfico com honestidade).
    if (quarters.length === 0) {
      const ttmEps = bundle?.metrics?.eps ?? bundle?.metrics?.forwardEps;
      if (ttmEps != null) {
        const lastDate = new Date();
        // TTM = ano atual; usa o endDate do último annual
        const yearEnd = `${lastDate.getUTCFullYear()}-12-31`;
        quarters.push({
          endDate: yearEnd,
          epsBasic: ttmEps,
          revenue: bundle?.metrics?.revenue ?? null,
        });
      }
    }

    // QuarterResults: pega últimos 4 + 1 projected (próximo)
    const lastN = quarters.slice(-4); // 4 últimos quarters reais

    const results: QuarterResult[] = lastN.map((q, idx) => {
      // Variação % vs quarter anterior
      const prev = idx > 0 ? lastN[idx - 1] : null;
      const revenueChangePct =
        prev && q.revenue != null && prev.revenue != null && prev.revenue > 0
          ? ((q.revenue - prev.revenue) / prev.revenue) * 100
          : null;
      // Próximo quarter = projected (só pro mais recente, se forwardEps existir)
      const isProjected = false;
      return {
        label: formatQuarterLabel(q.endDate),
        status: isProjected ? "projected" : "actual",
        eps: q.epsBasic,
        revenue: q.revenue,
        revenueChangePct,
      } as QuarterResult;
    });

    // Próximo quarter projected = baseado em forwardEps/4
    const forwardEps = bundle?.metrics?.forwardEps;
    if (forwardEps != null && quarters.length > 0) {
      const lastQ = quarters[quarters.length - 1];
      const lastDate = new Date(lastQ.endDate + "T00:00:00Z");
      const nextDate = new Date(lastDate);
      nextDate.setUTCMonth(nextDate.getUTCMonth() + 3);
      const nextLabel = formatQuarterLabel(nextDate.toISOString().slice(0, 10));
      // Estimated revenue = média dos 4 últimos × (1 + earnings growth)
      const recentRevenue =
        lastN
          .map((q) => q.revenue ?? 0)
          .filter((v) => v > 0)
          .reduce((s, v, _, arr) => s + v / arr.length, 0);
      const earningsGrowth = bundle?.metrics?.forwardEps
        ? (forwardEps / (lastN[lastN.length - 1]?.epsBasic ?? 1) - 1)
        : 0;
      results.push({
        label: nextLabel,
        status: "projected",
        eps: forwardEps,
        revenue: recentRevenue > 0 ? recentRevenue * (1 + earningsGrowth) : null,
        revenueChangePct: null,
      });
    }

    return { quarters, results };
  }, [bundle]);

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

        {/* Grid 2-col: gráfico (2/3) + news (1/3) */}
        <StaggerOnMount>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            <PriceChart
              candles={candles}
              range={range}
              onRangeChange={setRange}
              prevClose={bundle?.quote.prevClose ?? null}
              loading={isLoading && candles.length === 0}
            />
            <NewsSummaryCard items={newsItems} loading={newsLoading && newsItems.length === 0} />
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
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md cursor-pointer bg-white/[0.04] border border-white/10 text-foreground text-[12px] font-medium hover:bg-white/[0.08] hover:border-white/20 transition-colors"
              >
                All estimates
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Analyst ratings radar */}
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
                <AnalystRatingsRadar
                  ratings={deriveRatings(
                    bundle?.metrics.recommendationMean ?? null,
                    bundle?.metrics.numberOfAnalystOpinions ?? null
                  )}
                />
              </div>

              {/* Price target chart */}
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
                <PriceTargetChart
                  candles={candles}
                  current={bundle?.quote.price ?? null}
                  high52w={bundle?.quote.fiftyTwoWeekHigh ?? null}
                  low52w={bundle?.quote.fiftyTwoWeekLow ?? null}
                  targetHigh={bundle?.metrics.targetHighPrice ?? null}
                  targetLow={bundle?.metrics.targetLowPrice ?? null}
                  targetMedian={bundle?.metrics.targetMedianPrice ?? null}
                  targetMean={bundle?.metrics.targetMeanPrice ?? null}
                  currency={(bundle?.currency as "BRL" | "USD") ?? "BRL"}
                />
              </div>
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
                href={`/asset/${symbol}/earnings`}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md cursor-pointer bg-white/[0.04] border border-white/10 text-foreground text-[12px] font-medium hover:bg-white/[0.08] hover:border-white/20 transition-colors"
              >
                All earnings
              </a>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-5">
              {/* P/E comparison */}
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
                <PERatioComparison
                  mainPe={mainPe}
                  sectorPe={sectorPeMedian}
                  peers={peerRows}
                />
              </div>

              {/* EPS quarterly chart */}
              <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
                <EPSQuarterlyChart
                  quarters={earningsData.quarters}
                  currency={(bundle?.currency as "BRL" | "USD") ?? "BRL"}
                  limit={5}
                />
              </div>
            </div>

            {/* Quarter results grid */}
            <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
              <QuarterResults
                results={earningsData.results}
                currency={(bundle?.currency as "BRL" | "USD") ?? "BRL"}
              />
            </div>
          </div>
        </StaggerOnMount>
      </motion.main>

      <DashboardDock />
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
};

// Helper: strip HTML tags da summary (endpoint retorna HTML-encoded).
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

// Helper: converte datetime (segundos) → ISO string.
function toIso(seconds: number | undefined): string {
  if (!seconds) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

// Helper: formata endDate (ISO "YYYY-MM-DD") pra "Q1 2024"
function formatQuarterLabel(endDate: string): string {
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}
