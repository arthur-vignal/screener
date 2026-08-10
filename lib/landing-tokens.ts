/**
 * landing-tokens.ts — visual primitives for the new landing page.
 *
 * Pure visual layer: tokens + helper functions. No data fetching,
 * no business logic. The landing page is the only consumer.
 *
 * Color tokens follow the Fey-style dark aesthetic:
 *   - bg-base: #0a0a0c (never pure black)
 *   - bg-elevated: #131316 (cards)
 *   - bg-elevated-2: #1a1a1e (nested)
 *   - hairline: rgba(255, 255, 255, 0.07) — almost invisible
 *   - text-primary: #f5f5f7
 *   - text-secondary: #9a9ba3
 *   - text-tertiary: #65666e
 *   - positive: #34d399 (mint green)
 *   - negative: #f2555f (coral red)
 *   - chart-1..4: desaturated tones
 */

export const FEY_TOKENS = {
  bg: {
    base: "#0a0a0c",
    elevated: "#131316",
    elevated2: "#1a1a1e",
    strong: "#222226",
  },
  hairline: "rgba(255, 255, 255, 0.07)",
  hairlineStrong: "rgba(255, 255, 255, 0.14)",
  text: {
    primary: "#f5f5f7",
    secondary: "#9a9ba3",
    tertiary: "#65666e",
    faint: "#3f4047",
  },
  semantic: {
    positive: "#34d399",
    positiveSoft: "rgba(52, 211, 153, 0.13)",
    positiveBorder: "rgba(52, 211, 153, 0.26)",
    negative: "#f2555f",
    negativeSoft: "rgba(242, 85, 95, 0.13)",
    negativeBorder: "rgba(242, 85, 95, 0.26)",
    warning: "#fbbf24",
  },
  chart: {
    c1: "#e8935b", // orange
    c2: "#a78bfa", // purple
    c3: "#3fbfb0", // teal
    c4: "#c9c46a", // olive
  },
} as const;

/** Glass surface used on floating overlays (modals, tooltips). */
export const GLASS_BG = "rgba(16, 16, 19, 0.68)";
export const GLASS_BORDER = "1px solid rgba(255, 255, 255, 0.09)";
export const GLASS_BLUR = "blur(22px) saturate(140%)";

/** 16 features showcased on the landing 4x4 grid. */
export type LandingFeature = {
  title: string;
  description: string;
  accent: "orange" | "purple" | "teal" | "olive" | "mint" | "coral";
};

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "Cotação em tempo real",
    description:
      "Ações BR/US, ETFs, FIIs, BDRs — preço, variação 24h, market cap e volume via Brapi Pro.",
    accent: "teal",
  },
  {
    title: "Painel Macro BR",
    description:
      "Selic, CDI, IPCA, IGP-M, IBC-Br, PIB e Desemprego num único dashboard.",
    accent: "purple",
  },
  {
    title: "Copom Watch",
    description:
      "Curva de juros prefixada implícita e forward rates entre vértices — visualize o que o mercado precifica de Selic por reunião.",
    accent: "mint",
  },
  {
    title: "Breakeven de IPCA",
    description:
      "Inflação implícita na curva prefixada vs IPCA 12m realizado — leitura hawkish/dovish do mercado.",
    accent: "orange",
  },
  {
    title: "Opções + Gregas",
    description:
      "Simulador de payoff para long call, long put, straddle, covered call e collar. Black-Scholes + gregas agregadas.",
    accent: "purple",
  },
  {
    title: "Tesouro Direto",
    description:
      "Acompanhe pré-fixado, IPCA+ (NTN-B) e Selic — yields reais vs IPCA esperado.",
    accent: "olive",
  },
  {
    title: "Screener Fundamentalista",
    description:
      "Filtros por P/L, ROE, dividend yield, margem. Magic Formula, Graham e Bazin pré-construídos.",
    accent: "teal",
  },
  {
    title: "Raio-X de FIIs",
    description:
      "Classe do imóvel, dividend yield anual, consistência mensal dos pagamentos. Comparação entre fundos.",
    accent: "mint",
  },
  {
    title: "Calendário de Proventos",
    description:
      "Dividendos, JCPs e rendimentos de FIIs. Yield on cost forward baseado nos últimos 12 meses.",
    accent: "coral",
  },
  {
    title: "Correlação Cross-Asset",
    description:
      "Matriz de Pearson entre ações, ETFs, FIIs e macro — útil pra construção de portfólio diversificado.",
    accent: "orange",
  },
  {
    title: "Comps Setoriais",
    description:
      "Comparação lado-a-lado dos principais pares em cada setor: P/L, ROE, Dividend Yield. Radar chart.",
    accent: "purple",
  },
  {
    title: "Auto-populate de Modelo",
    description:
      "Snapshot dos fundamentais + template CSV pronto pra colar no Excel. DRE/BP/DFC em segundos.",
    accent: "olive",
  },
  {
    title: "Índices B3 Oficiais",
    description:
      "IBOV, IBrX-100, SMLL e IDIV com constituents + alocação teórica + chart de variação em pontos.",
    accent: "teal",
  },
  {
    title: "Fear & Greed BR + US",
    description:
      "Índice de sentimento para os dois mercados. BR: IBOV momentum + Selic real + breadth.",
    accent: "coral",
  },
  {
    title: "Notícias inline por ticker",
    description:
      "Modal full-screen pra cada notícia. Sem sair da página, sem perder contexto.",
    accent: "mint",
  },
  {
    title: "Portfólios",
    description:
      "Crie, acompanhe e compare. Performance histórica, sector exposure, top movers.",
    accent: "orange",
  },
];

export const LANDING_STATS = [
  { label: "Ativos BR", value: "1.184" },
  { label: "S&P 500", value: "503" },
  { label: "Índices B3", value: "4 oficiais" },
  { label: "FIIs mapeados", value: "560+" },
  { label: "Foco de preço", value: "0$ / mês" },
];
