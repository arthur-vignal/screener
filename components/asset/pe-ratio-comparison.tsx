"use client";

/**
 * PERatioComparison — tabela comparativa de P/E com barra inline (estilo Fey TSLA).
 *
 * Visual (replica o print Fey TSLA):
 *   P/E ratio
 *   PETR4 is 22% below sector average
 *
 *   F       ████  6.3   ▼ -3.2x
 *   HMC     ████  6.0   ▼ -3.5x
 *   GM      ████  7.7   ▼ -1.8x
 *   MBGYY   N/A
 *   PETR4   ██████████████████  8.4   ▲ +0.7x  ← (highlight)
 *
 * - Lista de peers (default: 4 + ativo = 5) vindo do /api/peer-benchmarks.
 * - Ativo principal destacado com background sutil + font weight maior.
 * - Barra colorida: verde se P/E < 15 (barato), vermelho se > 30 (caro),
 *   neutro entre 15-30.
 * - Setas ▲▼ mostrando desvio vs mediana do subsetor.
 *   Vermelho se pior (acima da mediana), verde se melhor.
 *
 * Dados REAIS via /api/peer-benchmarks.
 */

import { ArrowDown, ArrowUp } from "lucide-react";
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
  className?: string;
};

/** Computa a "largura máxima" da barra (top pe + 5% headroom). */
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
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[14px] font-semibold text-foreground">
          P/E ratio
        </div>
        {sectorPe != null && (
          <div className="text-[10px] text-muted-foreground/70 tabular-nums">
            Setor: {sectorPe.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Texto descritivo */}
      {diffText && (
        <p className="text-[11px] text-muted-foreground/70 mb-3">
          <span className="font-semibold text-foreground/85">
            {mainPe?.toLocaleString("en-US", { maximumFractionDigits: 1 })}x
          </span>{" "}
          is{" "}
          <span
            className={cn(
              "font-semibold",
              diffText.sign === "above"
                ? "text-[var(--negative)]"
                : "text-[var(--positive)]",
            )}
          >
            {diffText.pct}%
          </span>{" "}
          {diffText.sign} sector average
        </p>
      )}

      {/* Tabela de peers */}
      <div className="rounded-lg bg-[#08090c] border border-white/[0.04] overflow-hidden">
        {peers.slice(0, peerLimit).map((peer, idx) => {
          const isMain = peer.symbol === peer.name && peer.pe === mainPe;
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

          // Delta vs mediana do subsetor
          const delta =
            peer.pe != null && sectorPe != null && sectorPe > 0
              ? peer.pe - sectorPe
              : null;
          const deltaIsFavorable =
            delta != null && delta < 0; // P/E abaixo da mediana = melhor (barato)

          return (
            <div
              key={peer.symbol}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                idx > 0 && "border-t border-white/[0.04]",
                isMain && "bg-white/[0.03]",
              )}
            >
              {/* Label */}
              <div
                className={cn(
                  "w-16 text-[12px] font-semibold tabular-nums shrink-0",
                  isMain
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {peer.symbol}
              </div>

              {/* Barra */}
              <div className="flex-1 h-3 relative overflow-hidden rounded-sm bg-white/[0.02]">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-sm",
                    colorClass,
                  )}
                  style={{
                    width: `${widthPct}%`,
                    opacity: peer.pe == null ? 0.3 : 0.85,
                  }}
                />
              </div>

              {/* Valor P/E */}
              <div
                className={cn(
                  "w-12 text-[12px] tabular-nums text-right shrink-0",
                  peer.pe == null
                    ? "text-muted-foreground/40"
                    : isMain
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground/85",
                )}
              >
                {peer.pe != null
                  ? peer.pe.toLocaleString("en-US", { maximumFractionDigits: 1 })
                  : "N/A"}
              </div>

              {/* Delta vs setor (com seta) */}
              {delta != null && sectorPe != null ? (
                <div
                  className={cn(
                    "w-[68px] flex items-center justify-end gap-1 text-[10px] tabular-nums shrink-0",
                    delta === 0
                      ? "text-muted-foreground/60"
                      : deltaIsFavorable
                        ? "text-[var(--positive)]"
                        : "text-[var(--negative)]",
                  )}
                  title={`vs setor (${sectorPe.toFixed(1)}x)`}
                >
                  {delta >= 0 ? (
                    <ArrowUp className="h-2.5 w-2.5" strokeWidth={2.5} />
                  ) : (
                    <ArrowDown className="h-2.5 w-2.5" strokeWidth={2.5} />
                  )}
                  <span className="font-semibold">
                    {delta >= 0 ? "+" : "−"}
                    {Math.abs(delta).toFixed(1)}x
                  </span>
                </div>
              ) : (
                <div className="w-[68px] shrink-0 text-right text-[10px] text-muted-foreground/40">
                  —
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
