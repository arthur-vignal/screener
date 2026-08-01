"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type RiskLevel = "conservative" | "moderate" | "aggressive";

type PortfolioEntry = {
  id: string;
  name: string;
  description: string;
  criterion: string;
  riskLevel: RiskLevel;
  author: string;
  ytdReturn: number;
  constituents: { symbol: string; weight: number }[];
};

const PORTFOLIOS: PortfolioEntry[] = [
  {
    id: "income-yield",
    name: "Income & Yield",
    description:
      "Foco em renda passiva. Ações com dividend yield consistente + REITs + bonds investment grade.",
    criterion:
      "Dividend yield > 3%, payout ratio < 70%, market cap > $10B. Mix de 60% ações high-yield, 30% REITs, 10% bonds.",
    riskLevel: "conservative",
    author: "platform",
    ytdReturn: 4.2,
    constituents: [
      { symbol: "JNJ", weight: 0.10 },
      { symbol: "KO", weight: 0.08 },
      { symbol: "PEP", weight: 0.08 },
      { symbol: "MO", weight: 0.07 },
      { symbol: "PM", weight: 0.07 },
      { symbol: "O", weight: 0.06 },
      { symbol: "MAIN", weight: 0.05 },
      { symbol: "AGNC", weight: 0.05 },
      { symbol: "TLT", weight: 0.10 },
      { symbol: "BND", weight: 0.10 },
    ],
  },
  {
    id: "growth-tech",
    name: "Growth Tech Leaders",
    description: "Top 10 empresas de tecnologia com maior crescimento de receita e margem operacional > 20%.",
    criterion:
      "Setor Technology + Communication Services, market cap > $100B, receita YoY > 15%, margem operacional > 20%. Equal-weighted.",
    riskLevel: "aggressive",
    author: "platform",
    ytdReturn: 28.7,
    constituents: [
      { symbol: "NVDA", weight: 0.11 },
      { symbol: "AAPL", weight: 0.10 },
      { symbol: "MSFT", weight: 0.10 },
      { symbol: "META", weight: 0.10 },
      { symbol: "GOOGL", weight: 0.10 },
      { symbol: "AMZN", weight: 0.10 },
      { symbol: "TSLA", weight: 0.09 },
      { symbol: "AVGO", weight: 0.08 },
      { symbol: "CRM", weight: 0.08 },
      { symbol: "NFLX", weight: 0.07 },
    ],
  },
  {
    id: "balanced-60-40",
    name: "Balanced 60/40",
    description: "Alocação clássica 60% ações S&P 500 + 40% bonds. Rebalanceamento trimestral.",
    criterion:
      "60% SPY (S&P 500 ETF) + 40% BND (bonds investment grade). Rebalanceamento trimestral. Sem alavancagem.",
    riskLevel: "moderate",
    author: "platform",
    ytdReturn: 9.4,
    constituents: [
      { symbol: "SPY", weight: 0.60 },
      { symbol: "BND", weight: 0.40 },
    ],
  },
  {
    id: "global-diversified",
    name: "Global Diversified",
    description: "Exposição global: 60% US, 25% developed ex-US, 15% emerging markets.",
    criterion:
      "Mix de ETFs de índices globais. Rebalanceamento semestral. Sem alavancagem. Sem single-stock risk.",
    riskLevel: "moderate",
    author: "platform",
    ytdReturn: 12.1,
    constituents: [
      { symbol: "VTI", weight: 0.50 },
      { symbol: "VEA", weight: 0.20 },
      { symbol: "VWO", weight: 0.10 },
      { symbol: "AGG", weight: 0.20 },
    ],
  },
];

const RISK_COLORS: Record<RiskLevel, string> = {
  conservative: "bg-blue-400/10 text-blue-300",
  moderate: "bg-yellow-400/10 text-yellow-300",
  aggressive: "bg-red-400/10 text-red-300",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Agressivo",
};

export default function PortfoliosPage() {
  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Portfolios</h1>
        <p className="text-sm text-text-secondary">
          Portfolios pré-definidos com critério, risco e composição. Acompanhe performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PORTFOLIOS.map((p) => (
          <Link
            key={p.id}
            href={`/portfolios/${p.id}`}
            className="rounded-lg border border-border bg-surface p-5 hover:border-foreground/30 hover:bg-surface-elevated transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                {p.name}
              </h3>
              <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider",
                  RISK_COLORS[p.riskLevel],
                )}
              >
                {RISK_LABELS[p.riskLevel]}
              </span>
              <span className="text-xs text-text-muted">por {p.author}</span>
            </div>

            <p className="text-sm text-text-secondary mb-3 line-clamp-2">{p.description}</p>

            <div className="flex items-baseline justify-between pt-3 border-t border-border-subtle">
              <span className="text-xs text-text-muted">{p.constituents.length} ativos</span>
              <span
                className={cn(
                  "text-sm font-mono font-semibold tabular-nums",
                  p.ytdReturn >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {p.ytdReturn >= 0 ? "+" : ""}
                {p.ytdReturn.toFixed(1)}% YTD
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-border-subtle bg-surface-elevated/40 p-6 flex items-start gap-4">
        <Lock className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
        <div className="text-sm text-text-secondary">
          <p className="mb-2">
            <strong className="text-foreground">Criação de portfolios próprios</strong> virá em uma
            próxima fase. Hoje mostramos portfolios pré-definidos pela plataforma.
          </p>
          <p>
            Quando disponível, você poderá definir alocação (por ativo ou %), critérios de
            seleção, rebalanceamento e comparar com benchmarks.
          </p>
        </div>
      </div>
    </div>
  );
}
