"use client";

/**
 * /asset/[symbol]/risk — drawdown + volatility drill-down (F2-2).
 *
 * Renders the drawdown chart from the 1-year daily candles returned
 * by the asset bundle. (5y/10y drawdown would need a separate
 * candles fetch — out of scope for F2.)
 */

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { useAssetBackground } from "@/lib/use-asset-background";
import { DrawdownChart } from "@/components/drawdown-chart";

export default function RiskPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  // The bundle returns 1y daily candles. Filter out empty closes.
  const candles = (data?.candles ?? [])
    .filter((c) => c.close != null && Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  // Quick stats: total volatility (annualized stdev of daily returns) and
  // current drawdown. Volatility = stdev(dailyReturns) * sqrt(252).
  let vol: number | null = null;
  if (candles.length > 20) {
    const rets: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      rets.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    }
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const variance =
      rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
    vol = Math.sqrt(variance) * Math.sqrt(252);
  }

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
          section={{ slug: "risk", label: "Risco" }}
        />

        {/* Volatility tile */}
        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Volatilidade anualizada (1y)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <div className="grid grid-cols-3">
              <Tile
                label="Vol anual"
                value={vol != null ? `${(vol * 100).toFixed(1)}%` : "—"}
              />
              <Tile
                label="Beta"
                value={formatBeta(
                  (data?.keyStatistics as Record<string, unknown> | undefined)
                    ?.beta as number | null,
                )}
              />
              <Tile
                label="Candles"
                value={candles.length > 0 ? String(candles.length) : "—"}
              />
            </div>
          </div>
        </section>

        {/* Drawdown */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Drawdown (1y)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-4">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-[12px] text-muted-foreground/60">
                Carregando…
              </div>
            ) : (
              <DrawdownChart candles={candles} />
            )}
          </div>
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/40">
            Baseado em candles diários do bundle (1y). Drawdown desde 5y/10y não incluso.
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

function formatBeta(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(2);
}