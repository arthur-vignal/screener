"use client";

/**
 * /asset/[symbol]/cashflow — cash-flow drill-down (F2-4).
 *
 * Renders the three-year waterfall of operating + investing +
 * financing cash flows plus the running cash-balance. Below the
 * chart we add a table with the latest 5 yearly rows so the user
 * can scan the absolute numbers.
 */

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { AllStatsButton } from "@/components/all-stats-button";
import { useAssetBackground } from "@/lib/use-asset-background";
import { CashFlowWaterfall } from "./cashflow-waterfall";

export default function CashflowPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  const yearly = (data?.historicals?.cashflow ?? [])
    .filter((r) => {
      const t = (r as Record<string, unknown>).type;
      return t === "yearly" || t === "annual";
    })
    .map((r) => ({
      endDate: String((r as Record<string, unknown>).endDate ?? ""),
      operatingCashFlow: num((r as Record<string, unknown>).operatingCashFlow),
      investmentCashFlow: num((r as Record<string, unknown>).investmentCashFlow),
      financingCashFlow: num((r as Record<string, unknown>).financingCashFlow),
      initialCashBalance: num((r as Record<string, unknown>).initialCashBalance),
      finalCashBalance: num((r as Record<string, unknown>).finalCashBalance),
      freeCashFlow: num((r as Record<string, unknown>).freeCashFlow),
    }))
    .filter((r) => r.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : 1));

  // Cash-conversion quality (N1 from the doc):
  // FCF / EBITDA — how much of accounting EBITDA becomes real cash.
  const ebitda = (data?.financialData?.ebitda as number | null | undefined) ?? null;
  const fcfTtm = (data?.financialData?.freeCashflow as number | null | undefined) ?? null;
  const fcfQuality =
    ebitda != null && fcfTtm != null && ebitda > 0 ? (fcfTtm / ebitda) * 100 : null;

  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);

  return (
    <div
      className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-manrope)",
        ...bgStyle,
      }}
    >
      <div className="px-1 pt-5 pb-12 max-w-screen-2xl mx-auto w-full">
        <AssetSubheader
          symbol={symbol}
          longName={data?.longName ?? null}
          logoUrl={data?.logoUrl ?? null}
          currency={data?.currency ?? "BRL"}
          price={data?.quote?.price ?? null}
          change={data?.quote?.change ?? null}
          changePercent={data?.quote?.changePercent ?? null}
          section={{ slug: "cashflow", label: "Caixa" }}
        />

        {/* Quality tiles */}
        <div className="mt-6 flex justify-end">
          <AllStatsButton href={`/asset/${symbol}/stats/financials`} label="All financials" />
        </div>

        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Qualidade do caixa (TTM)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <Tile
                label="FCF / EBITDA"
                value={fcfQuality != null ? `${fcfQuality.toFixed(0)}%` : "—"}
              />
              <Tile
                label="FCF TTM"
                value={fcfTtm != null ? compactBRL(fcfTtm) : "—"}
              />
              <Tile
                label="EBITDA TTM"
                value={ebitda != null ? compactBRL(ebitda) : "—"}
              />
              <Tile
                label="Sinal"
                value={
                  fcfQuality == null
                    ? "—"
                    : fcfQuality >= 70
                    ? "Saudável"
                    : fcfQuality >= 40
                    ? "Ok"
                    : "Atenção"
                }
              />
            </div>
          </div>
        </section>

        {/* Waterfall chart */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Cascata do caixa (anual)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-4">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-[12px] text-muted-foreground/60">
                Carregando…
              </div>
            ) : (
              <CashFlowWaterfall rows={yearly} />
            )}
          </div>
        </section>

        {/* Detail table */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Detalhe anual
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-muted-foreground/60 text-[10px] uppercase tracking-[0.14em]">
                  <th className="text-left px-4 py-2 font-normal">Ano</th>
                  <th className="text-right px-4 py-2 font-normal">Operacional</th>
                  <th className="text-right px-4 py-2 font-normal">Investimento</th>
                  <th className="text-right px-4 py-2 font-normal">Financiamento</th>
                  <th className="text-right px-4 py-2 font-normal">Caixa livre</th>
                  <th className="text-right px-4 py-2 font-normal">Caixa final</th>
                </tr>
              </thead>
              <tbody>
                {yearly
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((row) => (
                    <tr key={row.endDate} className="border-t border-border/40">
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {row.endDate.slice(0, 4)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.operatingCashFlow != null
                          ? compactBRL(row.operatingCashFlow)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.investmentCashFlow != null
                          ? compactBRL(row.investmentCashFlow)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.financingCashFlow != null
                          ? compactBRL(row.financingCashFlow)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.freeCashFlow != null ? compactBRL(row.freeCashFlow) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.finalCashBalance != null ? compactBRL(row.finalCashBalance) : "—"}
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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 sm:py-5 border-t border-border/40 sm:border-t-0 sm:border-l sm:first:border-l-0 sm:first:border-t-0 border-border/40">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] md:text-[16px] font-medium tabular-nums">
        {value}
      </p>
    </div>
  );
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function compactBRL(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}R$ ${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(1)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
}