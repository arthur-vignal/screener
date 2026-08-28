"use client";

/**
 * PERatioComparison — tabela comparativa de P/E com barra inline (estilo Fey TSLA).
 *
 * Visual: tabela com ticker + P/E value + barra horizontal que mostra
 * magnitude relativa. Barra colorida verde se P/E "razoável" (< 20)
 * e vermelho se alto (> 30).
 *
 * ⚠️ ATENÇÃO: a Brapi v2 não retorna P/E de peers automaticamente.
 * Por ora, este componente recebe `peers` via prop. Quando integrarmos
 * com /api/peer-benchmarks/[symbol], trocamos a fonte.
 */

import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type PeerRow = {
  symbol: string;
  name: string;
  pe: number | null;
};

type Props = {
  /** P/E do ativo principal (referência). */
  mainPe: number | null;
  /** P/E da média do setor (referência pra texto descritivo). */
  sectorPe?: number | null;
  /** Lista de peers (incluindo o ativo principal, se quiser). */
  peers: PeerRow[];
  /** Moeda (placeholder, futuro). */
  className?: string;
};

/** Computa a "largura máxima" da barra (top pe + 20% headroom). */
function maxScale(peers: PeerRow[]): number {
  const valid = peers
    .map((p) => p.pe)
    .filter((v): v is number => v != null && v > 0 && v < 500);
  if (valid.length === 0) return 30;
  return Math.max(...valid) * 1.1;
}

export function PERatioComparison({
  mainPe,
  sectorPe,
  peers,
  className,
}: Props): JSX.Element {
  // Texto descritivo: "X% above/below sector average"
  const diffText = (() => {
    if (mainPe == null || sectorPe == null || sectorPe === 0) return null;
    const pct = Math.round(((mainPe - sectorPe) / sectorPe) * 100);
    if (pct === 0) return null;
    const sign = pct > 0 ? "above" : "below";
    return { pct: Math.abs(pct), sign };
  })();

  const scale = maxScale(peers);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-semibold text-foreground">
          P/E ratio
        </div>
        {diffText && (
          <div
            className={cn(
              "text-[11px] font-medium",
              diffText.sign === "above"
                ? "text-[var(--negative)]"
                : "text-[var(--positive)]"
            )}
          >
            {diffText.sign === "above" ? "+" : "−"}
            {diffText.pct}% vs setor
          </div>
        )}
      </div>

      {/* Tabela de peers */}
      <div className="rounded-lg bg-[#08090c] border border-white/[0.04] overflow-hidden">
        {peers.map((peer, idx) => {
          const isMain = peer.pe === mainPe;
          const isHigh = peer.pe != null && peer.pe > 30;
          const isLow = peer.pe != null && peer.pe > 0 && peer.pe < 15;
          const widthPct =
            peer.pe != null && peer.pe > 0
              ? Math.min((peer.pe / scale) * 100, 100)
              : 0;
          const colorClass =
            peer.pe == null
              ? "bg-muted-foreground/20"
              : isHigh
                ? "bg-[var(--negative)]"
                : isLow
                  ? "bg-[var(--positive)]"
                  : "bg-foreground/40";

          return (
            <div
              key={peer.symbol}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                idx > 0 && "border-t border-white/[0.04]",
                isMain && "bg-white/[0.03]"
              )}
            >
              {/* Label */}
              <div
                className={cn(
                  "w-16 text-[12px] font-semibold tabular-nums shrink-0",
                  isMain ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {peer.symbol}
              </div>

              {/* Barra */}
              <div className="flex-1 h-3 relative overflow-hidden rounded-sm">
                <div
                  className={cn("h-full transition-all duration-500", colorClass)}
                  style={{
                    width: `${widthPct}%`,
                    opacity: peer.pe == null ? 0.3 : 0.8,
                  }}
                />
              </div>

              {/* Valor */}
              <div
                className={cn(
                  "w-16 text-[12px] tabular-nums text-right shrink-0",
                  peer.pe == null
                    ? "text-muted-foreground/40"
                    : isMain
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground/85"
                )}
              >
                {peer.pe != null
                  ? peer.pe.toLocaleString("en-US", { maximumFractionDigits: 1 })
                  : "N/A"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
