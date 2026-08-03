/**
 * Seed portfolios and indices — data the platform showcases before any user content.
 * These are passed through the same performance computation as user-created entries.
 */

export type SeedHolding = { symbol: string; weight: number };

export type SeedPortfolio = {
  slug: string;
  name: string;
  description: string;
  criterion: string;
  riskLevel: "conservative" | "moderate" | "aggressive";
  author: string;
  ytdReturn: number;
  initialValue: number;
  createdAt: number;
  constituents: SeedHolding[];
};

export type SeedIndex = {
  slug: string;
  name: string;
  description: string;
  methodology: string;
  author: string;
  createdAt: number;
  constituents: string[];
};

export const SEED_PORTFOLIOS: SeedPortfolio[] = [
  {
    slug: "growth-tech",
    name: "Growth Tech Leaders",
    description: "Top 10 empresas de tecnologia com maior crescimento de receita.",
    criterion: "Setor Tech + Comm Services, market cap > $100B.",
    riskLevel: "aggressive",
    author: "platform",
    ytdReturn: 28.7,
    initialValue: 10000,
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
    constituents: [
      { symbol: "NVDA", weight: 0.11 },
      { symbol: "AAPL", weight: 0.10 },
      { symbol: "MSFT", weight: 0.10 },
      { symbol: "META", weight: 0.10 },
      { symbol: "GOOGL", weight: 0.10 },
    ],
  },
  {
    slug: "balanced-60-40",
    name: "Balanced 60/40",
    description: "Alocação clássica: 60% ações S&P 500 + 40% bonds.",
    criterion: "60% SPY + 40% BND. Rebalanceamento trimestral.",
    riskLevel: "moderate",
    author: "platform",
    ytdReturn: 9.4,
    initialValue: 10000,
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
    constituents: [
      { symbol: "SPY", weight: 0.60 },
      { symbol: "BND", weight: 0.40 },
    ],
  },
  {
    slug: "income-yield",
    name: "Income & Yield",
    description: "Foco em renda passiva com ações dividend + bonds.",
    criterion: "Dividend yield > 3%, payout < 70%.",
    riskLevel: "conservative",
    author: "platform",
    ytdReturn: 4.2,
    initialValue: 10000,
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
    constituents: [
      { symbol: "JNJ", weight: 0.15 },
      { symbol: "KO", weight: 0.10 },
      { symbol: "PEP", weight: 0.10 },
      { symbol: "O", weight: 0.10 },
      { symbol: "TLT", weight: 0.20 },
      { symbol: "BND", weight: 0.20 },
      { symbol: "AGNC", weight: 0.15 },
    ],
  },
  {
    slug: "deep-value",
    name: "Deep Value (Piotroski)",
    description: "Ações descontadas (P/VP < 1.5) com qualidade financeira alta (Piotroski >= 7).",
    criterion: "P/VP < 1.5, P/L < 12, P/FCF > 8, Piotroski >= 7.",
    riskLevel: "moderate",
    author: "platform",
    ytdReturn: 12.1,
    initialValue: 10000,
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
    constituents: [
      { symbol: "BRK.B", weight: 0.15 },
      { symbol: "JPM", weight: 0.10 },
      { symbol: "WFC", weight: 0.08 },
      { symbol: "XOM", weight: 0.10 },
      { symbol: "CVX", weight: 0.08 },
      { symbol: "PFE", weight: 0.07 },
      { symbol: "MO", weight: 0.06 },
      { symbol: "VZ", weight: 0.06 },
      { symbol: "T", weight: 0.05 },
      { symbol: "BMY", weight: 0.05 },
    ],
  },
  {
    slug: "small-cap-quality",
    name: "Small-Cap Quality",
    description: "Small caps com ROIC alto e baixo endividamento.",
    criterion: "Market cap $2-15B, ROIC > 12%, Dívida/EBITDA < 2x, ROE > 15%.",
    riskLevel: "aggressive",
    author: "platform",
    ytdReturn: 18.3,
    initialValue: 10000,
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
    constituents: [
      { symbol: "WSC", weight: 0.10 },
      { symbol: "ITT", weight: 0.10 },
      { symbol: "VSTO", weight: 0.08 },
      { symbol: "LNN", weight: 0.08 },
      { symbol: "EXPO", weight: 0.08 },
      { symbol: "UFPI", weight: 0.07 },
      { symbol: "ASO", weight: 0.07 },
      { symbol: "THR", weight: 0.06 },
    ],
  },
];

export const SEED_INDICES: SeedIndex[] = [
  {
    slug: "sp500-momentum",
    name: "S&P 500 Momentum Score",
    description: "Top 50 ações do S&P 500 rankeadas por momentum 12-1.",
    methodology:
      "Universo: S&P 500. Critério: retorno 12 meses excluindo último mês. Top 50. Equal-weighted. Rebalanceamento mensal.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["NVDA", "MSFT", "AAPL", "AMZN", "META", "GOOGL", "AVGO", "TSLA", "BRK.B", "LLY"],
  },
  {
    slug: "quality-value",
    name: "Quality-Value Composite",
    description: "Ações com ROE > 15% e P/E < 20.",
    methodology: "Universo: S&P 500. ROE > 15%, P/E < 20. Top 30.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["JNJ", "PG", "KO", "PEP", "WMT", "HD", "AXP", "BLK", "MA", "V"],
  },
  {
    slug: "low-vol-defensive",
    name: "Low-Volatility Defensive",
    description: "Ações com baixa volatilidade histórica.",
    methodology: "Top 30 com menor volatilidade anualizada.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["JNJ", "PG", "KO", "PEP", "WMT", "VZ", "T", "XOM", "CVX", "NEE"],
  },
  {
    slug: "global-momentum",
    name: "Global Momentum",
    description: "ETFs globais com momentum positivo em 6 meses.",
    methodology: "Mix de ETFs globais. Rebalanceamento mensal.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["SPY", "QQQ", "VEA", "VWO", "EFA", "IEMG"],
  },
];

export const SEED_INDEX_PERFORMANCE: Record<string, { change24h: number }> = {
  "sp500-momentum": { change24h: 0.42 },
  "quality-value": { change24h: 0.18 },
  "low-vol-defensive": { change24h: -0.08 },
  "global-momentum": { change24h: 0.85 },
};

export function getSeedPortfolio(slug: string): SeedPortfolio | undefined {
  return SEED_PORTFOLIOS.find((p) => p.slug === slug);
}

export function getSeedIndex(slug: string): SeedIndex | undefined {
  return SEED_INDICES.find((i) => i.slug === slug);
}
