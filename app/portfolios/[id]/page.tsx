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
  Area,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { SEED_PORTFOLIOS, getSeedPortfolio } from "@/lib/seed-data";

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

type CurrentQuote = {
  symbol: string;
  weight: number;
  price: number | null;
  changePercent: number | null;
  value: number | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const seed = getSeedPortfolio(id);
  const isSeed = !!seed;

  // Fetch portfolio definition from DB (only for non-seed)
  const { data: portfolio, error: portfolioError } = useSWR<PortfolioDetail | { error: string }>(
    isSeed ? null : `/api/portfolios/${id}`,
    fetcher,
  );

  // Fetch performance. For seeds, use the seed route. For DB portfolios, use the standard route.
  const perfUrl = isSeed
    ? `/api/seed/portfolio/${id}/performance`
    : portfolio && "id" in portfolio
      ? `/api/portfolios/${portfolio.slug}/performance`
      : null;

  const { data: perfData } = useSWR<{
    performance: Performance;
    currentQuotes: CurrentQuote[];
  }>(perfUrl, fetcher);
  const { data: memoData } = useSWR<{
    spec: {
      category: "growth" | "value" | "income" | "momentum" | "quality" | "blend" | "thematic";
      riskLevel: "conservative" | "moderate" | "aggressive";
      thesis: string;
      criteria: string[];
      risks?: string[];
      expectedBehavior?: string;
    };
    sectorExposure: Record<string, number>;
    perHoldingRationale: Record<string, { sector: string; rationale: string }>;
  }>(
    portfolio && "id" in portfolio
      ? `/api/portfolios/${portfolio.slug}/memo`
      : null,
    fetcher,
  );

  if (portfolioError && "error" in portfolioError && portfolioError.error === "private") {
    return (
      <div className="px-6 md:px-10 py-8 max-w-3xl">
        <Link
          href="/portfolios"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-4 transition-colors link-underline"
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar
        </Link>
        <div className="panel p-10 text-center animate-fade-up">
          <Lock className="w-8 h-8 text-muted mx-auto mb-3" />
          <h1 className="font-display text-xl text-ink mb-1">Portfolio privado</h1>
          <p className="text-sm text-muted">
            Faça login pra ver portfolios privados.
          </p>
        </div>
      </div>
    );
  }

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
  const isPublic = isSeed || (portfolio && "isPublic" in portfolio ? portfolio.isPublic : true);
  const initialValue = isSeed
    ? seed!.initialValue
    : portfolio && "initialValue" in portfolio
      ? portfolio.initialValue
      : 10000;

  const performance = perfData?.performance;
  const currentQuotes = perfData?.currentQuotes ?? [];
  const historyData = performance?.history ?? [];
  const totalReturn = performance?.totalReturn;
  const annualizedReturn = performance?.annualizedReturn;
  const maxDrawdown = performance?.maxDrawdown;
  const daysHeld = performance?.daysHeld ?? 0;
  const endValue = performance?.endValue;
  const bestDay = performance?.bestDay;

  const isLoading = !isSeed && !portfolio && !portfolioError;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <Link
        href="/portfolios"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-6 transition-colors link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        Voltar
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Carregando portfolio…
        </div>
      )}

      {!isLoading && (
        <>
          <div className="mb-8 animate-fade-up">
            <h1 className="font-display text-4xl md:text-5xl text-ink tracking-tight mb-2">
              {name}
            </h1>
            {description && (
              <p className="text-body text-base max-w-2xl">{description}</p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted flex-wrap">
              {owner && <span>@{owner}</span>}
              {!isPublic && (
                <Badge tone="neutral">
                  <Lock className="w-2.5 h-2.5 mr-1" />
                  Privado
                </Badge>
              )}
              {createdAt > 0 && (
                <span>· criado em {new Date(createdAt * 1000).toLocaleDateString("pt-BR")}</span>
              )}
              {daysHeld > 0 && <span>· {daysHeld} dias</span>}
              {seed && (
                <Badge tone="brand">Plataforma</Badge>
              )}
            </div>
            {seed?.criterion && (
              <p className="text-xs text-muted mt-3 italic max-w-2xl">
                {seed.criterion}
              </p>
            )}
          </div>

          {/* Performance */}
          <div className="panel p-6 mb-6 animate-fade-up stagger-1">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-sm font-medium text-ink uppercase tracking-wider">
                Performance
              </h2>
              {!performance && (
                <span className="text-xs text-muted flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Calculando…
                </span>
              )}
            </div>

            {performance && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
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
                  <Metric label="Melhor dia" value={bestDay!} />
                </div>

                {historyData.length > 1 && (
                  <div className="h-64 mt-4 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={historyData}>
                        <defs>
                          <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#494fdf" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#494fdf" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.42)" }}
                          minTickGap={50}
                          tickFormatter={(v) => {
                            const d = new Date(v);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.42)" }}
                          tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--surface-elevated)",
                            border: "1px solid var(--hairline-strong)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v) => `$${Math.round(Number(v)).toLocaleString()}`}
                          labelFormatter={(v) => new Date(v as string).toLocaleDateString("pt-BR")}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          fill="url(#perfGrad)"
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#494fdf"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Constituents table with live prices + P&L */}
          <div className="panel p-6 animate-fade-up stagger-2">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-medium text-ink uppercase tracking-wider">
                Constituentes ({constituents.length})
              </h2>
              {currentQuotes.length > 0 && (
                <span className="text-xs text-muted">Preços ao vivo</span>
              )}
            </div>
            {currentQuotes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted border-b border-hairline">
                      <th className="text-left py-2 font-medium">Ticker</th>
                      <th className="text-right py-2 font-medium">Peso</th>
                      <th className="text-right py-2 font-medium">Preço</th>
                      <th className="text-right py-2 font-medium">24h</th>
                      <th className="text-right py-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuotes.map((q, i) => (
                      <tr
                        key={q.symbol}
                        className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <td className="py-2.5">
                          <Link
                            href={`/asset/${encodeURIComponent(q.symbol)}`}
                            className="font-mono font-semibold text-ink hover:text-brand-bright transition-colors duration-150"
                          >
                            {q.symbol}
                          </Link>
                        </td>
                        <td className="text-right py-2.5 font-tabular text-body">
                          {(q.weight * 100).toFixed(1)}%
                        </td>
                        <td className="text-right py-2.5 font-tabular text-ink">
                          {q.price != null ? `$${q.price.toFixed(2)}` : "—"}
                        </td>
                        <td
                          className={cn(
                            "text-right py-2.5 font-tabular font-medium",
                            q.changePercent == null
                              ? "text-muted"
                              : q.changePercent >= 0
                                ? "text-positive"
                                : "text-negative",
                          )}
                        >
                          {q.changePercent != null
                            ? `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="text-right py-2.5 font-tabular text-ink">
                          {q.value != null
                            ? `$${q.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <RichFundamentalsTable
                rows={constituents.map((h) => ({ symbol: h.symbol, weight: h.weight }))}
              />
            )}
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
      <div className="text-[11px] uppercase tracking-wider text-muted mb-1.5 font-medium">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-tabular font-semibold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        <AnimatedNumber value={value * 100} signed decimals={2} suffix="%" />
      </div>
      {suffix && (
        <div className="text-xs text-muted mt-0.5">{suffix}</div>
      )}
    </div>
  );
}
