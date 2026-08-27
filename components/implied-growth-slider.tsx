"use client";

/**
 * ImpliedGrowthSlider — expectativas implícitas do mercado.
 *
 * Dado o preço atual e o LPA esperado, que crescimento perpétuo o
 * mercado está embutindo? Usa Gordon Growth Model:
 *
 *   Preço = LPA × (ROIC − g) / (WACC − g)   (com g < WACC)
 *
 * Resolve pra g:
 *   g = WACC − (LPA × (ROIC − WACC)) / Preço
 *
 * ...mas isso fica esquisito na prática. Versão mais limpa:
 *   Preço justo = LPA × (ROIC − g) / (WACC − g)
 *
 * O usuário move g (slider 0-10%) e vê o preço justo calculado. A
 * distância entre preço atual e preço justo = "o mercado está
 * descontando crescimento maior ou menor que g".
 *
 * Props:
 *   currentPrice: preço atual da ação
 *   lpa: lucro por ação atual ou esperado (EPS)
 *   wacc: custo de capital estimado (default 12%)
 *   roic: retorno sobre capital investido (default 15%)
 */

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMultiple } from "@/lib/format";

type Props = {
  currentPrice: number | null;
  lpa: number | null;
  wacc?: number; // fração, ex: 0.12 = 12%
  roic?: number; // fração
  loading?: boolean;
};

export function ImpliedGrowthSlider({
  currentPrice,
  lpa,
  wacc = 0.12,
  roic = 0.15,
  loading,
}: Props) {
  // Slider 0% a 10% em passos de 0.1%
  const [g, setG] = useState(0.03); // 3% default

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101116] p-5">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (currentPrice == null || lpa == null || lpa <= 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101116] p-5 text-center text-[12px] text-muted-foreground/85">
        Sem LPA ou preço pra calcular expectativas.
      </div>
    );
  }

  // Gordon Growth: Preço justo = LPA × (ROIC − g) / (WACC − g)
  // Se g >= WACC, indefinido (divisão por zero)
  const fairPrice = g < wacc ? (lpa * (roic - g)) / (wacc - g) : null;
  const upside = fairPrice != null ? ((fairPrice - currentPrice) / currentPrice) * 100 : null;

  // Crescimento implícito dado o preço atual (resolve g em P = LPA × (r-g)/(w-g))
  // g_implícito = (wacc × LPA − ROIC × LPA + wacc × P) / (LPA − P)? Não, simplifica:
  // P × (w − g) = L × (r − g)
  // P×w − P×g = L×r − L×g
  // L×g − P×g = L×r − P×w
  // g × (L − P) = L×r − P×w
  // g = (L×r − P×w) / (L − P)
  // Se L > P: denominador positivo
  // Se L < P: denominador negativo, inverte sinal
  let impliedG: number | null = null;
  if (lpa !== currentPrice) {
    impliedG = (lpa * roic - currentPrice * wacc) / (lpa - currentPrice);
    if (impliedG < -0.1 || impliedG > 0.2) impliedG = null; // sanitizar
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[12px] uppercase tracking-[0.18em] text-foreground">
          Expectativas implícitas
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/70">
          Gordon Growth · WACC {(wacc * 100).toFixed(1)}% · ROIC {(roic * 100).toFixed(1)}%
        </div>
      </div>

      {/* g implícito */}
      <div className="mb-4 px-2">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          Crescimento perpétuo implícito
        </div>
        <div className="text-[24px] font-medium tabular-nums tracking-tight">
          {impliedG != null ? `${(impliedG * 100).toFixed(2)}% a.a.` : "—"}
        </div>
        {impliedG != null && (
          <p className="text-[11px] text-foreground/85 mt-1">
            {impliedG > 0.05
              ? "Mercado embutindo crescimento alto (>5% a.a. perpétuo). Otimista."
              : impliedG > 0.02
                ? "Mercado embutindo crescimento moderado (2-5% a.a.). Realista."
                : impliedG > 0
                  ? "Mercado embutindo crescimento baixo (0-2% a.a.). Conservador."
                  : "Mercado embutindo crescimento negativo. Bearish."}
          </p>
        )}
      </div>

      {/* Slider pra preço justo */}
      <div className="border-t border-white/10 pt-4 px-2">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            g (crescimento perpétuo)
          </span>
          <span className="text-[18px] font-medium tabular-nums text-foreground">
            {(g * 100).toFixed(1)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={g * 100}
          onChange={(e) => setG(Number(e.target.value) / 100)}
          className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-foreground"
          style={{
            background: `linear-gradient(to right, var(--foreground) 0%, var(--foreground) ${g * 10}%, rgba(255,255,255,0.1) ${g * 10}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              Preço atual
            </div>
            <div className="text-[16px] font-medium tabular-nums">
              R$ {currentPrice.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              Preço justo (g = {(g * 100).toFixed(1)}%)
            </div>
            <div
              className="text-[16px] font-medium tabular-nums"
              style={{
                color:
                  fairPrice == null
                    ? "var(--negative)"
                    : upside! > 0
                      ? "var(--positive)"
                      : "var(--negative)",
              }}
            >
              {fairPrice != null ? `R$ ${fairPrice.toFixed(2)}` : "g ≥ WACC"}
            </div>
            {upside != null && (
              <div
                className="text-[11px] tabular-nums"
                style={{ color: upside > 0 ? "var(--positive)" : "var(--negative)" }}
              >
                {upside > 0 ? "+" : ""}
                {upside.toFixed(1)}% vs preço
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
