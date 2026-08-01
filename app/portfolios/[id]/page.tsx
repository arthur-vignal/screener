"use client";

export const dynamic = "force-dynamic";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import {

  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

const PORTFOLIOS: Record<string, PortfolioEntry> = {
  "income-yield": {
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
  "growth-tech": {
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
  "balanced-60-40": {
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
  "global-diversified": {
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
};

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

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const portfolio = PORTFOLIOS[id];
  const [showBenchmark, setShowBenchmark] = useState(false);

  if (!portfolio) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-text-secondary">Portfolio não encontrado.</p>
        <Link href="/portfolios" className="text-accent hover:underline text-sm mt-2 inline-block">
          ← Voltar
        </Link>
      </div>
    );
  }

  const days = 180;
  const portfolioSeries = Array.from({ length: days }, (_, i) => ({
    day: i,
    value: 100 + i * (portfolio.ytdReturn / days) + Math.sin(i * 0.3) * 0.4 + Math.cos(i * 0.7) * 0.3,
  }));
  const benchmarkSeries = Array.from({ length: days }, (_, i) => ({
    day: i,
    value: 100 + i * 0.045 + Math.sin(i * 0.4) * 0.3,
  }));

  return (
    <div className="px-8 py-6 max-w-6xl">
      <Link
        href="/portfolios"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </Link>

      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-semibold tracking-tight">{portfolio.name}</h1>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider",
            RISK_COLORS[portfolio.riskLevel],
          )}
        >
          {RISK_LABELS[portfolio.riskLevel]}
        </span>
      </div>
      <div className="text-sm text-text-muted mb-6">por {portfolio.author}</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <Card label="Performance YTD" value={`${portfolio.ytdReturn >= 0 ? "+" : ""}${portfolio.ytdReturn.toFixed(2)}%`} positive={portfolio.ytdReturn >= 0} />
        <Card label="Constituintes" value={String(portfolio.constituents.length)} />
        <Card label="Tipo" value={RISK_LABELS[portfolio.riskLevel]} />
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-hidden mb-6">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Performance</h3>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showBenchmark}
              onChange={(e) => setShowBenchmark(e.target.checked)}
              className="accent-foreground"
            />
            <span className="text-text-secondary">Comparar com benchmark (S&P 500)</span>
          </label>
        </div>
        <div className="px-4 py-6 h-72 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="day" type="number" domain={[0, days - 1]} hide />
              <YAxis
                domain={["auto", "auto"]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                formatter={(v) => Number(v).toFixed(2)}
              />
              <Line
                type="monotone"
                data={portfolioSeries}
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Portfolio"
              />
              {showBenchmark && (
                <Line
                  type="monotone"
                  data={benchmarkSeries}
                  dataKey="value"
                  stroke="#737373"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                  name="Benchmark"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Descrição">
            <p className="text-sm text-text-secondary leading-relaxed">{portfolio.description}</p>
          </Section>
          <Section title="Critério de seleção">
            <p className="text-sm text-text-secondary leading-relaxed">{portfolio.criterion}</p>
          </Section>
        </div>

        <div>
          <Section title="Composição">
            <div className="space-y-1">
              {portfolio.constituents.map((c) => (
                <Link
                  key={c.symbol}
                  href={`/asset/${c.symbol}`}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-elevated transition-colors"
                >
                  <span className="font-mono font-semibold text-sm">{c.symbol}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-surface-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${c.weight * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-text-muted w-10 text-right">
                      {(c.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div
        className={cn(
          "text-2xl font-mono font-semibold tabular-nums",
          positive === true && "text-positive",
          positive === false && "text-negative",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-foreground mb-3 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}
