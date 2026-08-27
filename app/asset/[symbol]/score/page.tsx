"use client";

/**
 * /asset/[symbol]/score — Sulfur Score radar (F3-3).
 *
 * Computes a 5-axis score from the asset bundle and renders it as
 * a pentagonal radar. Each axis is normalized 0..100; the overall
 * score is the unweighted mean.
 */

import Link from "next/link";
import { useMemo } from "react";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { useAssetBackground } from "@/lib/use-asset-background";
import { ScoreRadar } from "./score-radar";

export default function ScorePage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  const scores = useMemo(() => {
    const ks = (data?.keyStatistics ?? {}) as Record<string, unknown>;
    const fd = (data?.financialData ?? {}) as Record<string, unknown>;
    const metrics = (data?.metrics ?? {}) as Record<string, unknown>;

    // Quality: average of ROE (% → 0..100), EBITDA margin (% → 0..100),
    // currentRatio (× 50 → 0..100).
    const roe = pct(ks.returnOnEquity ?? fd.returnOnEquity) ?? 0;
    const ebitdaM = pct(fd.ebitdaMargins) ?? 0;
    const cr = num(fd.currentRatio);
    const quality =
      (clamp(roe, 0, 100) + clamp(ebitdaM, 0, 100) + clamp((cr ?? 0) * 50, 0, 100)) / 3;

    // Cash: FCF / EBITDA * 100.
    const fcf = num(fd.freeCashflow);
    const ebitda = num(fd.ebitda);
    const cash =
      ebitda != null && ebitda > 0 && fcf != null ? clamp((fcf / ebitda) * 100, 0, 100) : 50;

    // Valuation: percentile of trailingPE vs history (inverted:
    // lower P/E → higher score). Falls back to P/E absolute value
    // (lower P/E → higher score) when history is missing.
    const pe = num(metrics.trailingPE ?? ks.trailingPE);
    const peHistory = ((data?.historicals?.keyStatistics ?? []) as Array<{
      trailingPE?: number | null;
    }>)
      .map((r) => r.trailingPE ?? null)
      .filter((v): v is number => v != null && v > 0);
    let valuation: number;
    if (pe != null && peHistory.length >= 3) {
      const sorted = peHistory.slice().sort((a, b) => a - b);
      const rank = sorted.filter((v) => v <= pe).length / sorted.length;
      valuation = clamp((1 - rank) * 100, 0, 100);
    } else if (pe != null && pe > 0) {
      // Fallback: inverse of P/E (target ~15x = 100, ≥30 = 0)
      valuation = clamp(100 - (pe - 15) * (100 / 30), 0, 100);
    } else {
      valuation = 50;
    }

    // Income: dividend yield * 100 (cap 100).
    const dy = pct(metrics.dividendYield ?? ks.trailingAnnualDividendYield);
    const income = dy != null ? clamp(dy, 0, 100) : 0;

    // Momentum: 52w change (%) clamped to 0..100.
    const mom = pct(ks["52WeekChange"] ?? null);
    const momentum = mom != null ? clamp(mom, 0, 100) : 50;

    return {
      Qualidade: Math.round(quality),
      Caixa: Math.round(cash),
      Valuation: Math.round(valuation),
      Renda: Math.round(income),
      Momentum: Math.round(momentum),
    };
  }, [data]);

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
          section={{ slug: "score", label: "Score Sulfur" }}
        />

        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3 text-center">
            Impressão digital do ativo
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-6">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-[12px] text-muted-foreground/60">
                Carregando…
              </div>
            ) : (
              <ScoreRadar scores={scores} />
            )}
          </div>
          <p className="mt-3 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/40 text-center max-w-2xl mx-auto">
            Score proprietário Sulfur — combinação normalizada de qualidade fundamentalista,
            conversão de caixa, valuation histórico, renda e momentum. Cada eixo 0–100.
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

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pct(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v * 100;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}