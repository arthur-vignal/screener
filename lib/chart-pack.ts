/**
 * chart-pack.ts — Bridge entre os packs de design e os charts.
 *
 * Por que existe: chart-pack-references e typography-pack-references (skills)
 * definem PALETTE VIVA (13 cores WCAG AA) + TIPOGRAFIA (Calibre/Inter por
 * use case). Esse arquivo expõe helpers prontos pra **todos os charts do
 * projeto puxarem dos packs automaticamente** — sem ter que lembrar qual
 * hex, qual weight, qual font.
 *
 * Regra de uso:
 *   import { pack } from "@/lib/chart-pack";
 *   <Line stroke={pack.asset} strokeWidth={pack.stroke.line} />
 *   <XAxis tick={pack.tick} />
 *
 * Combina com:
 *   - lib/chart-palette.ts  (paleta hex — onde estão os 13 cores)
 *   - lib/chart-theme.ts    (tokens semânticos do design system)
 *   - skills: chart-pack-references, typography-pack-references
 *
 * Histórico:
 *   2026-09-03 — criado pra sessão que arrumou os 4 charts do /analysis
 *   (yield-comparison, equity-risk-premium, earnings-yield-vs-risk-free,
 *   revenue-vs-pib). Padrão inspirado no pedido do Arthur: "bota função
 *   pra sempre usar os packs quando for trabalhar em UI".
 */

import { CHART_PALETTE, colorForSeries, colorForSeriesWithOpacity } from "./chart-palette";

// ─────────────────────────────────────────────────────────────────────────────
// Cores semânticas — bridge entre chart-palette (hex) e o nome de domínio.
// Cada chave aqui representa um CONCEITO de chart (não uma cor visual),
// então o chart não precisa saber "verde é #4dbe95", só "asset é verde".
// ─────────────────────────────────────────────────────────────────────────────

export const PACK = {
  // Semântica de chart
  /** Cor do ATIVO em chart "X vs Y". Padrão verde muted. */
  asset: CHART_PALETTE.positive,
  /** Cor da MACRO de referência (SELIC, IBC-Br, NTN-B). Padrão azul. */
  macro: CHART_PALETTE.primary,
  /** Cor de fair value / mediana / OLS. */
  reference: CHART_PALETTE.purple,
  /** Cor de peer primário (subsetor). */
  peer: CHART_PALETTE.amber,
  /** Cor de FCF / EV/EBITDA. */
  fcf: CHART_PALETTE.cyan,
  /** Cor de alerta / dividend trap. */
  alert: CHART_PALETTE.pink,
  /** Cor de dividend yield (sempre discreta, é yield secundário). */
  dividend: CHART_PALETTE.muted,

  // Estados
  positive: CHART_PALETTE.positive,
  negative: CHART_PALETTE.negative,
  muted: CHART_PALETTE.muted,

  // Tokens de chart (do chart-theme.ts, replicados aqui pra um único import)
  tick: "rgba(200, 210, 230, 0.55)",
  axisLine: "rgba(255, 255, 255, 0.06)",
  gridLine: "rgba(255, 255, 255, 0.05)",
  refLine: "rgba(255, 255, 255, 0.20)",
  tooltipBg: "#0d0d11",
  tooltipBorder: "rgba(255, 255, 255, 0.15)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Stroke widths — espessuras padronizadas pra chart (do chart-theme.ts).
// ─────────────────────────────────────────────────────────────────────────────

export const PACK_STROKE = {
  /** Linha de série padrão (verde EY, azul SELIC). */
  line: 2,
  /** Linha mais discreta (yield secundário, peer secundário). */
  lineMuted: 1.5,
  /** Linha com fill embaixo (ROIC, EY decomposto). */
  area: 2,
  /** Eixo X/Y e gridlines. */
  axis: 1,
  /** Reference line tracejada. */
  refLine: 1,
  /** Dots ativos no hover. */
  activeDot: 4,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tipografia — Calibre (display/headings) + Inter (body/UI).
// Escala por use case (não hierarquia decorativa) — vindo de
// typography-pack-references/02-tipografia-uso-case.
// ─────────────────────────────────────────────────────────────────────────────

export const PACK_TYPE = {
  // Display (Calibre) — só pra hero number / page title
  displayHero: { family: "var(--font-manrope), system-ui, sans-serif", size: 32, weight: 600 },
  displayH1: { family: "var(--font-manrope), system-ui, sans-serif", size: 24, weight: 600 },
  displayH2: { family: "var(--font-manrope), system-ui, sans-serif", size: 20, weight: 600 },

  // UI (Inter) — uso geral
  title: { family: "var(--font-manrope), system-ui, sans-serif", size: 13, weight: 600 },
  body: { family: "var(--font-manrope), system-ui, sans-serif", size: 12, weight: 400 },
  bodyMedium: { family: "var(--font-manrope), system-ui, sans-serif", size: 12, weight: 500 },
  caption: { family: "var(--font-manrope), system-ui, sans-serif", size: 11, weight: 400 },
  micro: { family: "var(--font-manrope), system-ui, sans-serif", size: 10, weight: 400 },
  microMedium: { family: "var(--font-manrope), system-ui, sans-serif", size: 10, weight: 500 },

  // Chart axis ticks (sempre pequenos e legíveis)
  tickAxis: { family: "var(--font-manrope), system-ui, sans-serif", size: 9, weight: 400 },
  tickAxisMedium: { family: "var(--font-manrope), system-ui, sans-serif", size: 10, weight: 500 },

  // Mono tabular pra números em tabela/chart
  number: {
    family: "var(--font-manrope), system-ui, sans-serif",
    size: 11,
    weight: 500,
    tabular: true,
  },
  numberSmall: {
    family: "var(--font-manrope), system-ui, sans-serif",
    size: 10,
    weight: 500,
    tabular: true,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Props prontas pra colar no Recharts.
// ─────────────────────────────────────────────────────────────────────────────

/** Props padrão de YAxis pra chart do /analysis (lado direito, % formatação). */
export function packYAxisProps(formatter: (v: number) => string = (v) => v.toFixed(0)) {
  return {
    tick: {
      fill: PACK.tick,
      fontSize: PACK_TYPE.tickAxis.size,
      fontFamily: PACK_TYPE.tickAxis.family,
    },
    axisLine: false,
    tickLine: false,
    width: 40,
    tickCount: 5,
    tickFormatter: formatter,
  } as const;
}

/** Props padrão de YAxis pra chart em fração (0..1 → %). */
export function packYAxisPercentProps(decimals = 0) {
  return packYAxisProps((v) => `${v.toFixed(decimals)}%`);
}

/** Props padrão de ReferenceLine tracejada (zero, média, banda). */
export const packRefLineZero = {
  y: 0,
  stroke: PACK.refLine,
  strokeWidth: PACK_STROKE.refLine,
  strokeDasharray: "2 4",
} as const;

/** Props padrão de CartesianGrid. */
export const packGrid = {
  stroke: PACK.gridLine,
  strokeWidth: PACK_STROKE.axis,
  vertical: false,
} as const;

/** Props padrão de cursor pro Tooltip. */
export const packCursor = {
  stroke: "rgba(255, 255, 255, 0.15)",
  strokeWidth: 1,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de série — combinam cor + stroke + dot pra <Line />.
// ─────────────────────────────────────────────────────────────────────────────

export type PackLineOpts = {
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  dashed?: boolean;
};

export function packLineProps({
  stroke = PACK.asset,
  strokeWidth = PACK_STROKE.line,
  strokeOpacity = 1,
  dashed = false,
}: PackLineOpts = {}) {
  return {
    type: "monotone" as const,
    stroke,
    strokeWidth,
    strokeOpacity,
    strokeDasharray: dashed ? "5 3" : undefined,
    dot: false,
    activeDot: { r: PACK_STROKE.activeDot, fill: stroke },
    isAnimationActive: true,
    animationDuration: 1200,
    connectNulls: false,
  };
}

/** Helper pra N-ésima cor de série (wrap 7 cores). */
export function packColor(idx: number): string {
  return colorForSeries(idx);
}

/** Helper pra N-ésima cor com opacity (áreas, dots). */
export function packColorOpacity(idx: number, opacity = 0.85): string {
  return colorForSeriesWithOpacity(idx, opacity);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip — props prontas pro wrapper style.
// ─────────────────────────────────────────────────────────────────────────────

export const packTooltipStyle = {
  outline: "none",
} as const;

/** Box padrão de tooltip customizado (dark, glass). */
export function packTooltipBox(children: React.ReactNode) {
  return {
    className:
      "rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl",
    children,
  };
}
