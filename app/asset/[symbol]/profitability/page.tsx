"use client";

/**
 * /asset/[symbol]/profitability — profitability drill-down.
 *
 * Renders:
 *   - Subheader (logo + ticker + breadcrumb + live price)
 *   - 4-cell grid of latest-period margins (gross/op/profit/EBITDA) + ROE
 *   - Multi-year margin trend chart (gross/operacional/líquida + ROE)
 *   - Revenue + Earnings history (last 8 years, table)
 */

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { MarginTrendChart } from "./margin-trend-chart";

export default function ProfitabilityPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  const fd = (data?.financialData ?? {}) as Record<string, number | string | null | undefined>;

  // Latest-period margins (from financialData)
  const latest = {
    gross: pct(fd.grossMargins),
    op: pct(fd.operatingMargins),
    profit: pct(fd.profitMargins),
    ebitda: pct(fd.ebitdaMargins),
    roe: pct(fd.returnOnEquity),
    roa: pct(fd.returnOnAssets),
  };

  // Multi-year history (from financialDataHistory is NOT in our bundle
  // yet — we have incomeStatementHistory which has grossProfit /
  // totalRevenue derivable). The /api/asset/[symbol] route returns
  // `historicals.income` (incomeStatementHistory yearly). Use that.
  const incomeHist = (data?.historicals?.income ?? []) as Array<Record<string, unknown>>;
  const yearly = incomeHist
    .filter((row) => row.type === "yearly" || row.type === "annual")
    .map((row) => ({
      endDate: String(row.endDate ?? ""),
      totalRevenue: num(row.totalRevenue),
      costOfRevenue: num(row.costOfRevenue),
      grossProfit: num(row.grossProfit),
      operatingIncome: num(row.operatingIncome),
      netIncome: num(row.netIncome),
      // Derived margins (server data doesn't always include margins
      // directly on income statement rows).
      grossMargins: derive(num(row.grossProfit), num(row.totalRevenue)),
      operatingMargins: derive(num(row.operatingIncome), num(row.totalRevenue)),
      profitMargins: derive(num(row.netIncome), num(row.totalRevenue)),
      returnOnEquity: null, // not available per-row in income history
    }))
    .filter((r) => r.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : 1));

  return (
    <div
      className="min-h-screen text-foreground overflow-x-hidden"
      style={{
        fontFamily: "var(--font-manrope)",
        background:
          "radial-gradient(ellipse at top, #0f1014 0%, #0a0a0c 45%, #060608 100%)",
      }}
    >
      <div className="px-1 pt-5 pb-12 max-w-5xl">
        <AssetSubheader
          symbol={symbol}
          longName={data?.longName ?? null}
          logoUrl={data?.logoUrl ?? null}
          currency={data?.currency ?? "BRL"}
          price={data?.quote?.price ?? null}
          change={data?.quote?.change ?? null}
          changePercent={data?.quote?.changePercent ?? null}
          section={{ slug: "profitability", label: "Rentabilidade" }}
        />

        {/* Latest-period tile grid */}
        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Margens (TTM)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Bruta" value={latest.gross} />
              <Tile label="Operacional" value={latest.op} />
              <Tile label="Líquida" value={latest.profit} />
              <Tile label="EBITDA" value={latest.ebitda} />
              <Tile label="ROE" value={latest.roe} />
              <Tile label="ROA" value={latest.roa} />
            </div>
          </div>
        </section>

        {/* Margin trend */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Tendência (anual)
          </h2>
          {isLoading ? (
            <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
              Carregando…
            </div>
          ) : (
            <MarginTrendChart history={yearly} />
          )}
        </section>

        {/* Revenue + earnings table */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Receita e Lucro (anual)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-muted-foreground/60 text-[10px] uppercase tracking-[0.14em]">
                  <th className="text-left px-4 py-2 font-normal">Ano</th>
                  <th className="text-right px-4 py-2 font-normal">Receita</th>
                  <th className="text-right px-4 py-2 font-normal">Lucro Bruto</th>
                  <th className="text-right px-4 py-2 font-normal">Op. Líquido</th>
                  <th className="text-right px-4 py-2 font-normal">Lucro Líq.</th>
                </tr>
              </thead>
              <tbody>
                {yearly
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((row) => (
                    <tr key={row.endDate} className="border-t border-border/40">
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {row.endDate.slice(0, 4)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.totalRevenue != null
                          ? compactBRL(row.totalRevenue)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.grossProfit != null ? compactBRL(row.grossProfit) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.operatingIncome != null
                          ? compactBRL(row.operatingIncome)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.netIncome != null ? compactBRL(row.netIncome) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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

function Tile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="px-4 py-4 sm:py-5 border-t border-border/40 sm:border-t-0 sm:border-l sm:first:border-l-0 sm:first:border-t-0 border-border/40">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] md:text-[16px] font-medium tabular-nums">
        {value == null ? "—" : `${value.toFixed(2)}%`}
      </p>
    </div>
  );
}

function pct(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v * 100;
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function derive(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function compactBRL(v: number): string {
  if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}