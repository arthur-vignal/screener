/**
 * use-asset-background.ts — gera o radial gradient sutil no fundo da
 * página do ativo baseado na cor dominante da marca.
 *
 * Aplicado em /asset/[symbol]/* (todas as drill-down pages). O efeito
 * é um glow bem suave e espalhado lateralmente, com falloff longo
 * antes de sumir — mais discreto do que glows centralizados.
 *
 * Implementação: usa CSS variables no style do <main> pra ficar
 * isolado por página (não vaza pro body ou pro topbar).
 *
 * Calibração visual (revisão 2026-08-27, pós-feedback do Arthur):
 *  - Opacidade baixa: 0.06 (cor clara) → 0.12 (cor escura).
 *    Antes era 0.10/0.22, ficou "barriga" forte no topo.
 *  - Ellipse ampla: 130% × 70%, antes 90% × 60% — espalha lateralmente.
 *  - Falloff curto: 55%, antes 70% — gradiente desce mais antes de sumir,
 *    então a cor "respira" pela página em vez de concentrar no topo.
 */

import { useMemo } from "react";
import { getBrandColor } from "@/lib/brand-colors";

/**
 * Converte um hex em componentes r,g,b (0-255, inteiros).
 * Aceita "#RGB", "#RRGGBB".
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  if (h.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/**
 * Converte um hex em hex+alpha (RGBA-equivalente).
 *   "#008542" + 0.24 → "#0085423d"  (alpha 0.24 * 255 = 61 = 0x3d)
 * Aceita "#RGB", "#RRGGBB".
 */
function hexWithAlpha(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${h}${alphaHex}`;
}

/**
 * Calcula a luminância percebida (0-1). Cores escuras precisam de glow
 * mais opaco pra serem visíveis; cores claras precisam de menos.
 */
function perceivedLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [R, G, B] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Opacidade calibrada: cor escura → glow forte (até 0.26),
 * cor clara → glow fraco (até 0.16).
 */
function glowOpacityForLuminance(lum: number): number {
  // 0.0 (preto) → 0.26; 0.5 (cinza médio) → 0.21; 1.0 (branco) → 0.16
  const min = 0.16;
  const max = 0.26;
  return max - (max - min) * lum;
}

/**
 * Retorna style + className pra aplicar no container raiz da página
 * do ativo. O style inclui TUDO (background-color base + radial
 * gradient do glow com alpha pré-calculado) — sem CSS vars, sem
 * color-mix, sem pseudo-elemento ::before. Funciona em qualquer
 * browser 2017+.
 */
export function useAssetBackground(symbol: string): {
  style: React.CSSProperties;
  className: string;
} {
  const style = useMemo<React.CSSProperties>(() => {
    const hex = getBrandColor(symbol);
    const lum = perceivedLuminance(hex);
    const opacity = glowOpacityForLuminance(lum);
    const glowColor = hexWithAlpha(hex, opacity);
    return {
      backgroundColor: "#151619",
      backgroundImage: `radial-gradient(ellipse 150% 85% at 50% 0%, ${glowColor} 0%, transparent 75%)`,
    };
  }, [symbol]);

  return { style, className: "asset-bg" };
}
