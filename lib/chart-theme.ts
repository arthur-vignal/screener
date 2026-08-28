/**
 * chart-theme.ts — Sulfur chart theme (Fey-style, do zero).
 *
 * Tokens compartilhados por todos os charts do projeto.
 * NÃO usar hex inline em componentes — sempre importar daqui.
 *
 * Princípios (vindos dos prints de referência do Fey UI Kit):
 *  - dark monocromático
 *  - gridlines sutis (rgba 0.05)
 *  - tipografia tabular em duas escalas (label micro uppercase + número bold)
 *  - zero enfeite — contraste alto vem da composição, não de efeito
 *
 * Identidade Sulfur ≠ Fey:
 *  - linha primária off-white (#eeeff1), Fey usa branco puro
 *  - accent azul (#489ffa), Fey usa laranja
 *  - sem hex inline, sempre var(--positive) etc.
 */

import type { CSSProperties } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Cores — alinhadas com os tokens CSS do globals.css (.dark).
// Manter em sync com sulfur-ui-rules §1.1.
// ─────────────────────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  // Eixos
  axisTick: "rgba(200, 210, 230, 0.55)",
  axisLine: "rgba(255, 255, 255, 0.06)",
  gridLine: "rgba(255, 255, 255, 0.05)",
  gridLineStrong: "rgba(255, 255, 255, 0.08)",

  // Séries
  seriesPrimary: "#eeeff1",   // branco off — linha de preço principal
  seriesAccent: "#489ffa",    // azul — destaque
  seriesPositive: "#4dbe95",  // verde muted
  seriesNegative: "#d84f68",  // vermelho muted
  seriesNeutral: "#9ba1a8",   // cinza claro

  // Linha de média / atual
  meanLine: "rgba(200, 210, 230, 0.7)",
  currentLine: "#ffffff",

  // Tooltip
  tooltipBg: "rgba(21, 21, 26, 0.95)",
  tooltipText: "#eeeff1",
  tooltipMuted: "#9ba1a8",
  tooltipBorder: "rgba(255, 255, 255, 0.10)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tipografia — escala fechada.
// ─────────────────────────────────────────────────────────────────────────────

export const CHART_FONT = {
  family: "var(--font-manrope), system-ui, sans-serif",
  axisTick: 10,
  axisTickMedium: 11,
  tooltip: 11,
  tooltipSmall: 10,
  legend: 11,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Espessuras.
// ─────────────────────────────────────────────────────────────────────────────

export const CHART_STROKE = {
  axisLine: 1,
  gridLine: 1,
  seriesLine: 1.5,        // linha normal
  seriesFilled: 1.25,     // linha com área preenchida (price line)
  meanLine: 1.25,
  currentLine: 1.5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Categorias de séries.
// ─────────────────────────────────────────────────────────────────────────────

export type SeriesKind =
  | "primary"
  | "positive"
  | "negative"
  | "neutral"
  | "accent"
  | "filled";

export function colorFor(kind: SeriesKind): string {
  switch (kind) {
    case "primary":
      return CHART_COLORS.seriesPrimary;
    case "positive":
      return CHART_COLORS.seriesPositive;
    case "negative":
      return CHART_COLORS.seriesNegative;
    case "neutral":
      return CHART_COLORS.seriesNeutral;
    case "accent":
      return CHART_COLORS.seriesAccent;
    case "filled":
      return CHART_COLORS.seriesPrimary;
  }
}

export function strokeWidthFor(kind: SeriesKind): number {
  switch (kind) {
    case "filled":
      return CHART_STROKE.seriesFilled;
    case "primary":
    case "positive":
    case "negative":
    case "neutral":
    case "accent":
      return CHART_STROKE.seriesLine;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Props prontas pra colar no Recharts.
// ─────────────────────────────────────────────────────────────────────────────

export const cartesianGridProps = {
  vertical: false,
  stroke: CHART_COLORS.gridLine,
  strokeDasharray: "0",
} as const;

export const axisProps = {
  tick: {
    fill: CHART_COLORS.axisTick,
    fontSize: CHART_FONT.axisTick,
    fontFamily: CHART_FONT.family,
  },
  axisLine: {
    stroke: CHART_COLORS.axisLine,
    strokeWidth: CHART_STROKE.axisLine,
  },
  tickLine: false,
} as const;

export const yAxisProps = {
  ...axisProps,
  orientation: "right" as const,
  width: 48,
};

export const xAxisProps = {
  ...axisProps,
  height: 24,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip wrapper style — base compartilhada por todos os custom tooltips.
// ─────────────────────────────────────────────────────────────────────────────

export const tooltipWrapperStyle: CSSProperties = {
  background: CHART_COLORS.tooltipBg,
  backdropFilter: "blur(8px)",
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: 6,
  padding: "8px 10px",
  fontFamily: CHART_FONT.family,
  fontSize: CHART_FONT.tooltip,
  color: CHART_COLORS.tooltipText,
  minWidth: 120,
};

// ─────────────────────────────────────────────────────────────────────────────
// Cursor — overlay do hover sobre o chart.
// ─────────────────────────────────────────────────────────────────────────────

export const cursorProps = {
  stroke: "rgba(255, 255, 255, 0.15)",
  strokeWidth: 1,
};
