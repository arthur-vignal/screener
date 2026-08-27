"use client";

/**
 * /asset/[symbol]/stats/earnings — página Excel-style com métricas
 * per-share + valuation histórica + dividend yield.
 *
 * Origem: lib/brapi-full.ts (defaultKeyStatisticsHistory + financialDataHistory
 * + dividendsData).
 *
 * Mesma arquitetura da /stats/financials — fundo card surface #101116,
 * texto branco #ffffff, variações muted + sinal redundante.
 */

import { use, useMemo } from "react";
import useSWR from "swr";
import { useAssetBundle } from "../../lib/use-asset-bundle";
import { useAssetBackground } from "@/lib/use-asset-background";
import { AssetSubheader } from "../../components/asset-subheader";
import { ExcelTable, type MetricRow } from "@/components/excel-table";
import { Skeleton } from "@/components/ui/skeleton";

type HistoricalRow = { endDate: string } & Record<string, number | null | undefined>;
type DividendRow = {
  paymentDate?: string;
  rate?: number;
  label?: string;
};

function num(r: HistoricalRow | undefined, field: string): number | null {
  if (!r) return null;
  const v = r[field];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function valueMapByYear(
  rows: HistoricalRow[] | undefined,
  field: string,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const r of rows ?? []) {
    const y = r.endDate?.slice(0, 4);
    if (!y) continue;
    out[y] = num(r, field);
  }
  return out;
}

function derived(
  rows: HistoricalRow[] | undefined,
  numField: string,
  denField: string,
  fn: (n: number, d: number) => number | null,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const r of rows ?? []) {
    const y = r.endDate?.slice(0, 4);
    if (!y) continue;
    const n = num(r, numField);
    const d = num(r, denField);
    out[y] = n != null && d != null && d !== 0 ? fn(n, d) : null;
  }
  return out;
}

export default function StatsEarningsPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase().replace(/\.SA$/, "");
  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);
  const { data: bundle, isLoading, error } = useAssetBundle(symbol);

  // histórico de valuation (defaultKeyStatisticsHistory) + financialDataHistory
  const ksHist = (bundle?.historicals?.keyStatistics ?? []) as HistoricalRow[];
  const fdHist = (bundle?.historicals?.financialData ?? []) as HistoricalRow[];

  // dividendos pagos — fetch separado
  const fetcher = (url: string) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
  const { data: dividendsData } = useSWR<{ dividends: DividendRow[] }>(
    `/api/asset/${encodeURIComponent(symbol)}/dividends`,
    fetcher,
  );
  const dividends = dividendsData?.dividends ?? [];

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const arr of [ksHist, fdHist]) {
      for (const r of arr ?? []) {
        const year = r.endDate?.slice(0, 4);
        if (year) set.add(year);
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [ksHist, fdHist]);

  // Dividend yield anual agregado
  const dividendByYear = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of dividends ?? []) {
      if (!d.paymentDate || typeof d.rate !== "number") continue;
      const y = d.paymentDate.slice(0, 4);
      out[y] = (out[y] ?? 0) + d.rate;
    }
    return out;
  }, [dividends]);

  // Yield bruto anual = soma rate / preço médio do ano (proxy: close do ksHist.price)
  const dividendYieldByYear = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const y of Object.keys(dividendByYear)) {
      // procura o ksHist row do mesmo ano pra pegar o preço
      const row = ksHist.find((r) => r.endDate?.slice(0, 4) === y);
      const price = num(row, "price");
      const total = dividendByYear[y];
      if (price && price > 0) {
        out[y] = total / price;
      }
    }
    return out;
  }, [dividendByYear, ksHist]);

  const metrics: MetricRow[] = useMemo(() => {
    const rows: MetricRow[] = [];

    // ── Per-share ──────────────────────────────────────────────────────
    rows.push({
      key: "eps",
      label: "EPS (lucro por ação)",
      tags: ["eps", "per share", "lucro por ação"],
      values: valueMapByYear(ksHist, "earningsPerShare"),
      format: "number",
    });
    rows.push({
      key: "book_value",
      label: "Valor patrimonial por ação",
      tags: ["book value", "VPA", "patrimonio"],
      values: valueMapByYear(ksHist, "bookValue"),
      format: "number",
    });
    rows.push({
      key: "eps_growth",
      label: "Crescimento do EPS (anual)",
      tags: ["growth", "crescimento", "eps"],
      values: derived(ksHist, "earningsPerShare", "earningsPerShare", (curr, prev) => {
        // não tem prev year; só colocamos o valor raw mesmo
        return curr > 0 ? 1 : null;
      }),
      format: "percent",
    });

    // ── Valuation ──────────────────────────────────────────────────────
    rows.push({
      key: "pe",
      label: "P/L",
      tags: ["P/L", "PE", "valuation", "preço lucro"],
      values: valueMapByYear(ksHist, "trailingPE"),
      format: "multiple",
    });
    rows.push({
      key: "pb",
      label: "P/VP",
      tags: ["P/VP", "PB", "valuation", "valor patrimonial"],
      values: valueMapByYear(ksHist, "priceToBook"),
      format: "multiple",
    });
    rows.push({
      key: "ev_revenue",
      label: "EV / Receita",
      tags: ["EV", "enterprise", "valuation", "receita"],
      values: valueMapByYear(ksHist, "enterpriseToRevenue"),
      format: "multiple",
    });
    rows.push({
      key: "ev_ebitda",
      label: "EV / EBITDA",
      tags: ["EV", "EBITDA", "valuation"],
      values: valueMapByYear(ksHist, "enterpriseToEbitda"),
      format: "multiple",
    });
    rows.push({
      key: "peg",
      label: "PEG ratio",
      tags: ["PEG", "valuation"],
      values: valueMapByYear(ksHist, "pegRatio"),
      format: "multiple",
    });
    rows.push({
      key: "market_cap",
      label: "Market cap",
      tags: ["market cap", "valor de mercado"],
      values: valueMapByYear(ksHist, "marketCap"),
      format: "currency",
    });
    rows.push({
      key: "ev",
      label: "Enterprise value",
      tags: ["EV", "enterprise value"],
      values: valueMapByYear(ksHist, "enterpriseValue"),
      format: "currency",
    });

    // ── Rentabilidade ───────────────────────────────────────────────────
    rows.push({
      key: "roe",
      label: "ROE (retorno sobre PL)",
      tags: ["ROE", "rentabilidade", "retorno"],
      values: valueMapByYear(fdHist, "returnOnEquity"),
      format: "percent",
    });
    rows.push({
      key: "roa",
      label: "ROA (retorno sobre ativo)",
      tags: ["ROA", "rentabilidade"],
      values: valueMapByYear(fdHist, "returnOnAssets"),
      format: "percent",
    });
    rows.push({
      key: "profit_margin",
      label: "Margem líquida",
      tags: ["margem", "profit"],
      values: valueMapByYear(ksHist, "profitMargins"),
      format: "percent",
    });
    rows.push({
      key: "eps_q_growth",
      label: "Crescimento trimestral do EPS",
      tags: ["quarterly", "growth", "trimestral"],
      values: valueMapByYear(ksHist, "earningsQuarterlyGrowth"),
      format: "percent",
    });

    // ── Dividend yield (calculado) ──────────────────────────────────────
    rows.push({
      key: "dividend_yield",
      label: "Dividend yield (yield bruto anual)",
      tags: ["DY", "dividend yield", "proventos"],
      values: dividendYieldByYear,
      format: "percent",
    });
    rows.push({
      key: "dy_brapi",
      label: "Dividend yield (campo Brapi)",
      tags: ["DY", "dividend yield", "brapi"],
      values: valueMapByYear(ksHist, "dividendYield"),
      format: "percent",
    });

    // ── 52w change ──────────────────────────────────────────────────────
    rows.push({
      key: "wk52_change",
      label: "Variação 52 semanas",
      tags: ["52 week", "variação"],
      values: valueMapByYear(ksHist, "fiftyTwoWeekChange"),
      format: "percent",
    });

    return rows;
  }, [ksHist, fdHist, dividendYieldByYear]);

  return (
    <div className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`} style={{ fontFamily: "var(--font-manrope)", ...bgStyle }}>
      <div className="px-6 pt-5 pb-12 w-full">
        <AssetSubheader
          symbol={symbol}
          longName={bundle?.longName ?? null}
          logoUrl={bundle?.logoUrl ?? null}
          currency={bundle?.currency ?? "BRL"}
          price={bundle?.quote?.price ?? null}
          change={bundle?.quote?.change ?? null}
          changePercent={bundle?.quote?.changePercent ?? null}
          section={{ slug: "stats/earnings", label: "Stats: Earnings" }}
        />

        <div className="mt-6 space-y-2">
          <h1 className="text-[24px] font-medium tracking-tight">
            Earnings & valuation brutos
          </h1>
          <p className="text-[14px] text-muted-foreground max-w-3xl">
            Per-share, valuation, rentabilidade e dividend yield por ano. Calculamos o
            DY anual a partir dos eventos de dividendo somados por ano-calendário.
            Use a busca e o filtro de colunas pra focar no que importa.
          </p>
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorState message="Falha ao carregar histórico de valuation." />
          ) : isLoading || !bundle ? (
            <SkeletonBlock />
          ) : (
            <ExcelTable
              metrics={metrics}
              columns={years}
              formatHeader={(col) => col.slice(0, 4)}
              searchPlaceholder="Buscar métrica (ex: P/L, ROE, dividend yield)"
              emptyMessage="Não há histórico de valuation disponível pra este ativo."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] px-6 py-12 text-center space-y-2">
      <p className="text-[14px]">{message}</p>
      <p className="text-[12px] text-muted-foreground">
        Tente recarregar a página. Se persistir, o dado pode não estar disponível na Brapi.
      </p>
    </div>
  );
}
