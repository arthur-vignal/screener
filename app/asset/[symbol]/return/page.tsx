"use client";

/**
 * /asset/[symbol]/return — DuPont decomposition + waterfall de margem.
 *
 * Two complementary visualizations of where ROE / net margin come
 * from:
 *  - DuPont tree (F3-1): margin \u00d7 turnover \u00d7 leverage over time
 *  - Margin waterfall (F3-2): Receita \u2192 ... \u2192 Lucro L\u00edquido cascade
 *
 * Both fall under "retorno" because that's what the user ultimately
 * wants to understand \u2014 not just how much, but how it's built.
 */

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { AllStatsButton } from "@/components/all-stats-button";
import { useAssetBackground } from "@/lib/use-asset-background";
import { DuPontChart, type DupontYear } from "./dupont-chart";
import { MarginWaterfall } from "./margin-waterfall";

export default function ReturnPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  // Build year index for matching income vs balance.
  const incomeByYear = new Map<string, { revenue: number | null; netIncome: number | null }>();
  for (const row of data?.historicals?.income ?? []) {
    const r = row as Record<string, unknown>;
    const year = String(r.endDate ?? "").slice(0, 4);
    if (!year) continue;
    incomeByYear.set(year, {
      revenue: typeof r.totalRevenue === "number" ? r.totalRevenue : null,
      netIncome: typeof r.netIncome === "number" ? r.netIncome : null,
    });
  }
  const balanceByYear = new Map<string, { assets: number | null; equity: number | null }>();
  for (const row of data?.historicals?.balance ?? []) {
    const r = row as Record<string, unknown>;
    const year = String(r.endDate ?? "").slice(0, 4);
    if (!year) continue;
    balanceByYear.set(year, {
      assets: typeof r.totalAssets === "number" ? r.totalAssets : null,
      equity: typeof r.totalStockholderEquity === "number"
        ? r.totalStockholderEquity
        : typeof r.shareholdersEquity === "number"
        ? r.shareholdersEquity
        : null,
    });
  }

  const allYears = new Set<string>([
    ...incomeByYear.keys(),
    ...balanceByYear.keys(),
  ]);
  const years = Array.from(allYears).sort();
  const dupont: DupontYear[] = years
    .map((year) => {
      const inc = incomeByYear.get(year);
      const bal = balanceByYear.get(year);
      if (!inc || !bal) return null;
      const netMargin =
        inc.revenue && inc.netIncome ? (inc.netIncome / inc.revenue) * 100 : null;
      const assetTurnover =
        inc.revenue && bal.assets ? inc.revenue / bal.assets : null;
      const equityMult =
        bal.assets && bal.equity ? bal.assets / bal.equity : null;
      const roe =
        netMargin != null && assetTurnover != null && equityMult != null
          ? (netMargin * assetTurnover * equityMult)
          : null;
      return { year, netMargin, assetTurnover, equityMultiplier: equityMult, roe };
    })
    .filter((d): d is DupontYear => d != null)
    .slice(-12); // last 12 years

  // Latest year for waterfall
  const latestIncome = ((data?.historicals?.income ?? []) as Array<Record<string, unknown>>)
    .filter((r) => r.type === "yearly" || r.type === "annual")
    .sort((a, b) => (String(a.endDate) < String(b.endDate) ? -1 : 1))
    .pop();
  const waterfallRow = latestIncome
    ? {
        year: String(latestIncome.endDate ?? "").slice(0, 4),
        totalRevenue: numOrNull(latestIncome.totalRevenue),
        costOfRevenue: numOrNull(latestIncome.costOfRevenue),
        grossProfit: numOrNull(latestIncome.grossProfit),
        operatingIncome: numOrNull(latestIncome.operatingIncome),
        incomeTaxExpense: numOrNull(latestIncome.incomeTaxExpense),
        netIncome: numOrNull(latestIncome.netIncome),
      }
    : null;

  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);

  return (
    <div
      className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-manrope)",
        ...bgStyle,
      }}
    >
      <div className="px-6 pt-5 pb-12 w-full">
        <AssetSubheader
          symbol={symbol}
          longName={data?.longName ?? null}
          logoUrl={data?.logoUrl ?? null}
          currency={data?.currency ?? "BRL"}
          price={data?.quote?.price ?? null}
          change={data?.quote?.change ?? null}
          changePercent={data?.quote?.changePercent ?? null}
          section={{ slug: "return", label: "Retorno" }}
        />

        {/* F3-1: DuPont */}
        <div className="mt-6 flex justify-end">
          <AllStatsButton href={`/asset/${symbol}/stats/earnings`} label="All earnings" />
        </div>

        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Decomposição do ROE (DuPont)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-5">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-[12px] text-muted-foreground/60">
                Carregando…
              </div>
            ) : (
              <DuPontChart data={dupont} />
            )}
          </div>
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/40">
            ROE = Margem líquida × Giro do ativo × Alavancagem. Cada driver puxado da DRE + Balanço.
          </p>
        </section>

        {/* F3-2: Margin Waterfall */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Cascata da DRE ({waterfallRow?.year ?? ""})
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-4">
            <MarginWaterfall row={waterfallRow} />
          </div>
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/40">
            Receita → (–Custo) → Lucro Bruto → (–Despesas Op.) → EBIT → (–Impostos) → Lucro Líquido.
          </p>
        </section>

        <Link
          href={`/asset/${symbol}`}
          className="inline-flex items-center gap-1.5 mt-8 text-[12px] tracking-[0.18em] uppercase text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar para o gráfico
        </Link>
      </div>
    </div>
  );
}

function numOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}