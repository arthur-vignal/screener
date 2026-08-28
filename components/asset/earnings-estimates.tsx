"use client";

/**
 * EarningsEstimates — P/E ratio + Earnings per share (estilo Fey TSLA).
 *
 * Visual: 2 cards lado a lado com
 *   - Label + valor grande
 *   - Texto comparativo abaixo ("X% above/below sector average" ou
 *     "EPS forecast up/down X%")
 *
 * Dados REAIS quando disponíveis:
 *   - P/E ratio: bundle.metrics.trailingPE
 *   - EPS: bundle.metrics.eps
 *   - Setor: bundle.sector (pra texto genérico)
 *
 * ⚠️ ATENÇÃO: comparativo com setor médio é ESTIMADO via heurística.
 *    Quando integrarmos com peer benchmarks (já existe endpoint
 *    /api/peer-benchmarks/[symbol]), trocamos.
 */

import type { JSX } from "react";

import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  /** P/L trailing. */
  peRatio: number | null;
  /** Lucro por ação. */
  eps: number | null;
  /** Setor (para texto genérico). */
  sector: string | null;
  /** Moeda. */
  currency: "BRL" | "USD";
  /** Variação % do EPS (estimada ou vinda de forecast). */
  epsChangePercent: number | null;
  className?: string;
};

export function EarningsEstimates({
  peRatio,
  eps,
  sector,
  currency,
  epsChangePercent,
  className,
}: Props): JSX.Element {
  // Texto do P/E: "X% above sector average" ou "X% below"
  // Heurística simples: P/L > 20 → acima; < 10 → abaixo; senão "in line"
  const peVsSector = (() => {
    if (peRatio == null) return null;
    if (peRatio > 20) {
      const pct = Math.round(((peRatio - 15) / 15) * 100);
      return { sign: "above", pct };
    }
    if (peRatio < 10 && peRatio > 0) {
      const pct = Math.round(((15 - peRatio) / 15) * 100);
      return { sign: "below", pct };
    }
    return { sign: "in line", pct: 0 };
  })();

  const fmtCurrency = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
            Earnings
          </h2>
          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-white/[0.04] border border-white/10 text-[10px] font-semibold text-muted-foreground/70">
            E
          </span>
        </div>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md cursor-pointer",
            "bg-white/[0.04] border border-white/10 text-foreground",
            "text-[12px] font-medium",
            "hover:bg-white/[0.08] hover:border-white/20",
            "transition-colors"
          )}
        >
          All earnings
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* P/E ratio */}
        <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
          <div className="text-[12px] text-muted-foreground/70 uppercase tracking-[0.14em] mb-2">
            P/E ratio
          </div>
          <div className="text-[28px] font-semibold tabular-nums text-foreground leading-none">
            {peRatio != null
              ? peRatio.toLocaleString("en-US", { maximumFractionDigits: 2 })
              : "—"}
          </div>
          {peVsSector && (
            <p className="mt-3 text-[12px] text-muted-foreground/70 leading-relaxed">
              {sector ?? "Este ativo"} está{" "}
              <span className="text-foreground/85 font-medium">
                {peVsSector.pct}% {peVsSector.sign === "above" ? "acima" : peVsSector.sign === "below" ? "abaixo" : "em linha"}
              </span>{" "}
              da média do setor.
            </p>
          )}
        </div>

        {/* EPS */}
        <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5">
          <div className="text-[12px] text-muted-foreground/70 uppercase tracking-[0.14em] mb-2">
            Earnings per share
          </div>
          <div className="text-[28px] font-semibold tabular-nums text-foreground leading-none">
            {eps != null ? fmtCurrency(eps) : "—"}
          </div>
          {epsChangePercent != null && (
            <p
              className={cn(
                "mt-3 text-[12px] leading-relaxed inline-flex items-center gap-1.5",
                epsChangePercent >= 0
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]"
              )}
            >
              {epsChangePercent >= 0 ? (
                <ArrowUp className="h-3 w-3" strokeWidth={2.25} />
              ) : (
                <ArrowDown className="h-3 w-3" strokeWidth={2.25} />
              )}
              <span>
                EPS forecast{" "}
                {epsChangePercent >= 0 ? "up" : "down"}{" "}
                <span className="font-medium tabular-nums">
                  {Math.abs(epsChangePercent).toFixed(2)}%
                </span>
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
