/**
 * Paleta estendida pra charts do Sulfur.
 *
 * Por que existe: a paleta base (verde/azul/cinza/vermelho/roxo-FCFY)
 * chega em 1-2 séries, mas quando precisa plotar 3+ (múltiplos múltiplos,
 * peers do subsetor, decomposições), vira tudo verde-azul-cinza e o
 * usuário não distingue nada.
 *
 * Princípio Fey-style: muted/saturado, não gritante. Todos os hex abaixo
 * foram calibrados pra contraste WCAG AA (≥4.5) sobre `#101116` (cards)
 * e `#070709` (canvas). Font scale 9-11px nos eixos — em <11px a
 * luminância mínima é ~70%.
 *
 * Como usar:
 *   import { CHART_PALETTE, colorForSeries } from "@/lib/chart-palette";
 *   <Line stroke={colorForSeries(0)} />     // "positive"
 *   <Cell fill={CHART_PALETTE.amber} />     // direta
 *
 * Ordem (consistente em todos os charts do /analysis):
 *   0 — verde (ativo)
 *   1 — azul  (macro)
 *   2 — roxo  (referência, fair value, mediana)
 *   3 — âmbar (proventos, peer secundário)
 *   4 — ciano (FCF, EV/EBITDA)
 *   5 — rosa  (alerta, dividend trap)
 *   6 — lima  (P/VP, quality score)
 */

export const CHART_PALETTE = {
  // Séries principais
  positive: "#4dbe95",  // verde — ativo / lucro / ROIC
  primary: "#489ffa",   // azul  — macro (SELIC, IBC-Br, NTN-B)
  purple: "#a78bfa",    // roxo  — fair value, mediana, OLS, referência
  amber: "#f5a623",     // âmbar — proventos, peer primário
  cyan: "#22d3ee",      // ciano — FCF, EV/EBITDA, OLS alternativo
  pink: "#f472b6",      // rosa  — alerta (dividend trap, outliers)
  lime: "#a3e635",      // lima  — P/VP, quality score, peer secundário
  // Estados
  negative: "#d84f68",  // vermelho (já existia como var(--negative))
  muted: "#9ba1a8",     // cinza (já existia como var(--muted))
} as const;

export type SeriesIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const SERIES_COLORS: ReadonlyArray<string> = [
  CHART_PALETTE.positive,
  CHART_PALETTE.primary,
  CHART_PALETTE.purple,
  CHART_PALETTE.amber,
  CHART_PALETTE.cyan,
  CHART_PALETTE.pink,
  CHART_PALETTE.lime,
];

/**
 * Retorna a cor da série pelo índice (0-based). Usar quando tem 3+ séries
 * no mesmo chart e precisa distinguir visualmente sem repetir hex.
 */
export function colorForSeries(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/**
 * Variante com opacidade pra fills (áreas, dots).
 * 0.85 default — Fey-style muted sem ficar invisível.
 */
export function colorForSeriesWithOpacity(index: number, opacity = 0.85): string {
  const hex = colorForSeries(index);
  // Converte hex → rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
