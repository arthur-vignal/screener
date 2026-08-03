"use client";

import { ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { RichFundamentalsTable } from "@/components/rich-fundamentals-table";
import useSWR from "swr";
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

type Holding = { symbol: string; weight: number };

type PortfolioDetail = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initialValue: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  owner: string | null;
  ownerId: number | null;
  holdings: Holding[];
};

type Performance = {
  startValue: number;
  endValue: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  bestDay: number;
  worstDay: number;
  daysHeld: number;
  history: { date: string; value: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SEED_DETAILS: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    criterion: string;
    riskLevel: "conservative" | "moderate" | "aggressive";
    author: string;
    ytdReturn: number;
    constituents: Holding[];
    createdAt: number;
  }
> = {
  "growth-tech": {
    id: "growth-tech",
    name: "Growth Tech Leaders",
    description: "Top 10 empresas de tecnologia com maior crescimento de receita.",
    criterion: "Setor Tech + Comm Services, market cap > $100B.",
    riskLevel: "aggressive",
    author: "platform",
    ytdReturn: 28.7,
    constituents: [
      { symbol: "NVDA", weight: 0.11 },
      { symbol: "AAPL", weight: 0.10 },
      { symbol: "MSFT", weight: 0.10 },
      { symbol: "META", weight: 0.10 },
      { symbol: "GOOGL", weight: 0.10 },
    ],
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
  },
  "balanced-60-40": {
    id: "balanced-60-40",
    name: "Balanced 60/40",
    description: "Alocação clássica: 60% ações S&P 500 + 40% bonds.",
    criterion: "60% SPY + 40% BND. Rebalanceamento trimestral.",
    riskLevel: "moderate",
    author: "platform",
    ytdReturn: 9.4,
    constituents: [
      { symbol: "SPY", weight: 0.60 },
      { symbol: "BND", weight: 0.40 },
    ],
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
  },
  "income-yield": {
    id: "income-yield",
    name: "Income & Yield",
    description: "Foco em renda passiva com ações dividend + bonds.",
    criterion: "Dividend yield > 3%, payout < 70%.",
    riskLevel: "conservative",
    author: "platform",
    ytdReturn: 4.2,
    constituents: [
      { symbol: "JNJ", weight: 0.15 },
      { symbol: "KO", weight: 0.10 },
      { symbol: "PEP", weight: 0.10 },
      { symbol: "O", weight: 0.10 },
      { symbol: "TLT", weight: 0.20 },
      { symbol: "BND", weight: 0.20 },
      { symbol: "AGNC", weight: 0.15 },
    ],
    createdAt: Math.floor(new Date("2025-01-01").getTime() / 1000),
  },
};

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const seed = SEED_DETAILS[id];


  const { data: portfolio, error: portfolioError } = useSWR<PortfolioDetail | { error: string }>(
    `/api/portfolios/${id}`,
    fetcher,
  );
  const { data: perfData } = useSWR<{ performance: Performance }>(
    portfolio && "id" in portfolio
      ? `/api/portfolios/${portfolio.slug}/performance`
      : null,
    fetcher,
  );

  if (portfolioError && "error" in portfolioError && portfolioError.error === "private") {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <Link
          href="/portfolios"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar
        </Link>
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <Lock className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <h1 className="text-lg font-medium mb-1">Portfolio privado</h1>
          <p className="text-sm text-text-secondary">
            Faça login pra ver portfolios privados.
          </p>
        </div>
      </div>
    );
  }

  // Use seed if no DB portfolio

  const name = (portfolio && "name" in portfolio ? portfolio.name : seed?.name) ?? id;
  const description =
    (portfolio && "description" in portfolio ? portfolio.description : seed?.description) ?? "";
  const constituents =
    (portfolio && "holdings" in portfolio
      ? portfolio.holdings
      : seed?.constituents) ?? [];
  const createdAt =
    (portfolio && "createdAt" in portfolio ? portfolio.createdAt : seed?.createdAt) ?? 0;
  const owner = (portfolio && "owner" in portfolio ? portfolio.owner : seed?.author) ?? null;
  const isPublic =
    (portfolio && "isPublic" in portfolio ? portfolio.isPublic : true);

  const performance = perfData?.performance;
  const initialValue =
    (portfolio && "initialValue" in portfolio ? portfolio.initialValue : 10000) ?? 10000;

  const historyData = performance?.history ?? [];
  const totalReturn = performance?.totalReturn;
  const annualizedReturn = performance?.annualizedReturn;
  const maxDrawdown = performance?.maxDrawdown;
  const daysHeld = performance?.daysHeld ?? 0;
  const endValue = performance?.endValue;
  const bestDay = performance?.bestDay;


  const isLoading = !portfolio && !(id in SEED_DETAILS);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <Link
        href="/portfolios"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Voltar
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Carregando portfolio…
        </div>
      )}

      {!isLoading && (
        <>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">{name}</h1>
              {description && (
                <p className="text-sm text-text-secondary">{description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {owner && (
                  <span className="text-xs text-text-muted">@{owner}</span>
                )}
                {!isPublic && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted uppercase tracking-wider inline-flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Privado
                  </span>
                )}
                {createdAt > 0 && (
                  <span className="text-xs text-text-muted">
                    · criado em{" "}
                    {new Date(createdAt * 1000).toLocaleDateString("pt-BR")}
                  </span>
                )}
                {daysHeld > 0 && (
                  <span className="text-xs text-text-muted">· {daysHeld} dias</span>
                )}
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="rounded-lg border border-border bg-surface p-5 mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-medium">Performance</h2>
              {!performance && (
                <span className="text-xs text-text-muted">
                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                  Calculando…
                </span>
              )}
            </div>

            {performance && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Metric
                    label="Total"
                    value={totalReturn!}
                    suffix={`R$ ${(endValue! - initialValue).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
                  />
                  <Metric
                    label="Anualizado"
                    value={annualizedReturn!}
                    suffix={`(${daysHeld}d)`}
                  />
                  <Metric
                    label="Max Drawdown"
                    value={-maxDrawdown!}
                    color="negative"
                  />
                  <Metric
                    label="Melhor dia"
                    value={bestDay!}
                  />
                </div>

                {historyData.length > 1 && (
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData}>
                        <defs>
                          <linearGradient id="hist" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                          minTickGap={50}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                          tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--surface-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          formatter={(v) => `$${Math.round(Number(v)).toLocaleString()}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Constituents */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-medium mb-3">
              Constituentes ({constituents.length})
            </h2>
            <RichFundamentalsTable
              rows={constituents.map((h) => ({ symbol: h.symbol, weight: h.weight }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color?: "positive" | "negative";
}) {
  const tone = color ?? (value >= 0 ? "positive" : "negative");
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-mono font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value >= 0 ? "+" : ""}
        {(value * 100).toFixed(2)}%
      </div>
      {suffix && (
        <div className="text-xs text-text-muted mt-0.5">{suffix}</div>
      )}
    </div>
  );
}
