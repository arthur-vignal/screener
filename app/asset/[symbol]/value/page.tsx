"use client";

/**
 * /asset/[symbol]/value — DVA drill-down (F4-1).
 *
 * Demonstração do Valor Adicionado: how the company splits the value
 * it generated among employees, government (taxes), debt holders, and
 * shareholders. This is a Brazilian accounting statement that almost
 * no international or domestic competitor exposes \u2014 distinctive
 * content for the Sulfur brand.
 */

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { AllStatsButton } from "@/components/all-stats-button";
import { useAssetBackground } from "@/lib/use-asset-background";
import { ValueAddedDonut } from "./value-donut";

export default function ValuePage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  const yearly = ((data?.historicals?.valueAdded ?? []) as Array<Record<string, unknown>>)
    .filter((r) => r.type === "yearly" || r.type === "annual")
    .sort((a, b) => (String(a.endDate) < String(b.endDate) ? -1 : 1));

  const latest = yearly[yearly.length - 1];
  const donutData = latest
    ? {
        teamRemuneration: numOrNull(latest.teamRemuneration) ?? 0,
        taxes: numOrNull(latest.taxes) ?? 0,
        thirdPartyCapitals: numOrNull(latest.remunerationOfThirdPartyCapitals) ?? 0,
        shareholders:
          (numOrNull(latest.dividends) ?? 0) +
          (numOrNull(latest.interestOnOwnEquity) ?? 0) +
          (numOrNull(latest.retainedEarningsOrLoss) ?? 0),
      }
    : null;
  const donutYear = latest ? String(latest.endDate ?? "").slice(0, 4) : "";

  // Build a 5-year stack of DVA shares per stakeholder.
  const trend = yearly.slice(-5).map((r) => {
    const taxes = numOrNull(r.taxes) ?? 0;
    const team = numOrNull(r.teamRemuneration) ?? 0;
    const debt = numOrNull(r.remunerationOfThirdPartyCapitals) ?? 0;
    const sh =
      (numOrNull(r.dividends) ?? 0) +
      (numOrNull(r.interestOnOwnEquity) ?? 0) +
      (numOrNull(r.retainedEarningsOrLoss) ?? 0);
    const total = taxes + team + debt + sh;
    return {
      year: String(r.endDate ?? "").slice(0, 4),
      taxes,
      team,
      debt,
      sh,
      total,
      pctEmp: total ? (team / total) * 100 : 0,
      pctGov: total ? (taxes / total) * 100 : 0,
      pctFin: total ? (debt / total) * 100 : 0,
      pctSh: total ? (sh / total) * 100 : 0,
    };
  });

  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);

  return (
    <div
      className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-manrope)",
        ...bgStyle,
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
          section={{ slug: "value", label: "Valor Adicionado" }}
        />

        <div className="mt-6 flex justify-end">
          <AllStatsButton href={`/asset/${symbol}/stats/financials`} label="All financials" />
        </div>

        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3 text-center">
            Para onde vai o valor gerado
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-6">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-[12px] text-muted-foreground/60">
                Carregando…
              </div>
            ) : (
              <ValueAddedDonut data={donutData} year={donutYear} />
            )}
          </div>
          <p className="mt-3 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/40 text-center max-w-2xl mx-auto">
            Demonstração do Valor Adicionado (DVA) — distribuição entre governo, empregados,
            financiadores e acionistas. Padrão contábil brasileiro, raramente exposto por
            screeners internacionais.
          </p>
        </section>

        {/* Trend table */}
        {trend.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
              Distribuição histórica
            </h2>
            <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-muted-foreground/60 text-[10px] uppercase tracking-[0.14em]">
                    <th className="text-left px-4 py-2 font-normal">Ano</th>
                    <th className="text-right px-4 py-2 font-normal">Empregados</th>
                    <th className="text-right px-4 py-2 font-normal">Governo</th>
                    <th className="text-right px-4 py-2 font-normal">Financ.</th>
                    <th className="text-right px-4 py-2 font-normal">Acionistas</th>
                  </tr>
                </thead>
                <tbody>
                  {trend
                    .slice()
                    .reverse()
                    .map((row) => (
                      <tr key={row.year} className="border-t border-border/40">
                        <td className="px-4 py-2 tabular-nums text-muted-foreground">
                          {row.year}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-cyan-300">
                          {row.pctEmp.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-rose-300">
                          {row.pctGov.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-amber-300">
                          {row.pctFin.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-emerald-300">
                          {row.pctSh.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

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