"use client";

/**
 * PriceForecastSummary — card RESUMO de forecast pra raiz do ticker.
 *
 * Versão leve do PriceForecastChart: sem fan chart, sem paths, sem
 * density plot. Só os 3 números que importam pro investidor:
 *   - Preço previsto em 6m (com % esperado)
 *   - P(up) do MC GBM
 *   - Banda 90% (P10–P90)
 *
 * Visual: badge horizontal compacto com 3 colunas, igual ao estilo
 * dos outros "metric strips" da raiz.
 *
 * Se não tem forecast (ticker fora do painel), mostra empty state
 * com link pra /analysis.
 */

import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type Forecast = {
  symbol: string;
  current_price: number;
  predicted_price_6m: number;
  predicted_pct_return: number;
  direction: "up" | "down";
  monte_carlo: {
    prob_up: number;
    p10_price: number;
    p90_price: number;
  };
  disclaimer: string;
};

type Props = {
  forecast: Forecast | null;
  loading?: boolean;
  unavailable?: boolean;
  className?: string;
};

export function PriceForecastSummary({
  forecast,
  loading,
  unavailable,
  className,
}: Props): JSX.Element {
  if (loading) return <LoadingCard className={className} />;
  if (unavailable || !forecast)
    return <UnavailableCard className={className} />;

  const isUp = forecast.direction === "up";
  const pct = forecast.predicted_pct_return;
  const valueFmt = forecast.predicted_price_6m.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
  const currentFmt = forecast.current_price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
  const p10Fmt = forecast.monte_carlo.p10_price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
  const p90Fmt = forecast.monte_carlo.p90_price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
  const Icon = isUp ? TrendingUp : TrendingDown;
  const colorClass = isUp ? "text-[var(--positive)]" : "text-[var(--negative)]";

  return (
    <div
      className={cn(
        "rounded-2xl fey-card p-5",
        className
      )}
    >
      {/* Header: eyebrow + ícone de trend */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Forecast 6m
        </div>
        <Icon className={cn("h-4 w-4", colorClass)} strokeWidth={2} />
      </div>

      {/* Valor previsto (grande) */}
      <div className="flex items-baseline gap-2">
        <span className={cn("text-[24px] font-semibold tabular-nums tracking-tight leading-none", colorClass)}>
          {valueFmt}
        </span>
        <span className={cn("text-[12px] font-semibold tabular-nums", colorClass)}>
          {pct >= 0 ? "+" : "−"}
          {Math.abs(pct).toFixed(2)}%
        </span>
      </div>
      <div className="mt-1 text-[10.5px] text-muted-foreground/70 tabular-nums">
        de {currentFmt} hoje
      </div>

      {/* Stats em grid 2x2: P(up) + banda */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* P(up) */}
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
          <div className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold">
            P(alta)
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "text-[15px] font-semibold tabular-nums",
                forecast.monte_carlo.prob_up >= 0.5 ? "text-[var(--positive)]" : "text-[var(--negative)]"
              )}
            >
              {(forecast.monte_carlo.prob_up * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Banda 90% */}
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
          <div className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold">
            Banda 90%
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-foreground/85 leading-tight">
            <span className="text-muted-foreground/60">P10</span>{" "}
            <span className="font-medium">{p10Fmt}</span>
            <br />
            <span className="text-muted-foreground/60">P90</span>{" "}
            <span className="font-medium">{p90Fmt}</span>
          </div>
        </div>
      </div>

      {/* CTA pra /analysis — onde tem o fan chart geométrico completo */}
      <Link
        href={`/asset/${forecast.symbol}/analysis`}
        className={cn(
          "mt-4 inline-flex items-center justify-center gap-1.5 w-full h-9",
          "rounded-md border border-white/10 bg-white/[0.04]",
          "text-[12px] font-medium text-foreground",
          "hover:bg-white/[0.08] hover:border-white/20",
          "transition-colors cursor-pointer"
        )}
      >
        Ver análise completa
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>

      <div className="mt-3 text-[9.5px] text-muted-foreground/50 leading-tight">
        {forecast.disclaimer}
      </div>
    </div>
  );
}

// ─── Loading ────────────────────────────────────────────────────────────────

function LoadingCard({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn("rounded-2xl fey-card p-5 animate-pulse", className)}>
      <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
      <div className="h-6 w-32 bg-white/[0.06] rounded mb-2" />
      <div className="h-3 w-24 bg-white/[0.06] rounded mb-4" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-white/[0.04] rounded-lg" />
        <div className="h-14 bg-white/[0.04] rounded-lg" />
      </div>
      <div className="h-9 w-full bg-white/[0.04] rounded-md mt-4" />
    </div>
  );
}

// ─── Unavailable ───────────────────────────────────────────────────────────

function UnavailableCard({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn("rounded-2xl fey-card p-5", className)}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
        Forecast 6m
      </div>
      <div className="flex items-start gap-2 text-[12px] text-muted-foreground/70 leading-relaxed">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
        <span>
          Disponível em breve. Roadmap inclui expansão do painel de cobertura.
        </span>
      </div>
    </div>
  );
}
