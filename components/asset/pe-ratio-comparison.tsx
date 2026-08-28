"use client";

/**
 * PERatioComparison — tabela comparativa de P/E com barra inline (estilo Fey TSLA).
 *
 * Visual (replica o print Fey TSLA):
 *   P/E ratio
 *   TSLA is 594% above sector average
 *
 *   F       ████  6.3
 *   HMC     ████  6
 *   GM      ████  7.7
 *   MBGYY   N/A
 *   TSLA    ██████████████████  149
 *
 * - Lista de peers (default: 5) vindo do /api/peer-benchmarks.
 * - Ativo principal destacado (font weight maior).
 * - Barra colorida: verde se P/E "razoável" (< 20), vermelho se alto (> 30).
 * - Setor (mediano dos peers) calculado client-side.
 * - "X% above/below sector average" = (mainPe - sectorPe) / sectorPe.
 *
 * Dados REAIS via /api/peer-benchmarks e /api/assets/quote.
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
  /** Setor (P/E médio). Opcional — calculado se ausente. */
  sectorPe?: number | null;
  /** Lista de peers (incluindo o principal, se quiser). */
  peers: PeerRow[];
  /** Quantos peers mostrar (default: 4 + ativo = 5). */
  peerLimit?: number;
  /** Moeda pra formatação (atualmente não usado, P/E é adimensional). */
  className?: string;
};

/** Computa a "largura máxima" da barra (top pe + 20% headroom). */
function maxScale(peers: PeerRow[]): number {
  const valid = peers
    .map((p) => p.pe)
    .filter((v): v is number => v != null && v > 0 && v < 500);
  if (valid.length === 0) return 30;
  return Math.max(...valid) * 1.05;
}

export function PERatioComparison({
  mainPe,
  sectorPe,
  peers,
  peerLimit = 4,
  className,
}: Props): JSX.Element {
  // Texto descritivo: "X% above/below sector average"
  const diffText = (() => {
    if (mainPe == null || sectorPe == null || sectorPe === 0) return null;
    const pct = Math.round(((mainPe - sectorPe) / sectorPe) * 100);
    if (pct === 0) return null;
    return { pct: Math.abs(pct), sign: pct > 0 ? "above" : "below" };
  })();

  const scale = maxScale(peers);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[14px] font-semibold text-foreground">
          P/E ratio
        </div>
      </div>

      {/* Texto descritivo */}
      {diffText && (
        <p className="text-[11px] text-muted-foreground/70 mb-3">
          {mainPe?.toLocaleString("en-US", { maximumFractionDigits: 0 })}%{" "}
          {diffText.sign} sector average
        </p>
      )}

      {/* Tabela de peers */}
      <div className="rounded-lg bg-[#08090c] border border-white/[0.04] overflow-hidden">
        {peers.slice(0, peerLimit).map((peer, idx) => {
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
                  className={cn(
                    "h-full transition-all duration-500",
                    colorClass
                  )}
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
