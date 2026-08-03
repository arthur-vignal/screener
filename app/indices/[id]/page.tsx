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
import { getSeedIndex } from "@/lib/seed-data";

type Constituent = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  rank: number;
};

type IndexDetail = {
  id: number;
  slug: string;
  name: string;
  description: string;
  universe: string;
  topN: number;
  isPublic: boolean;
  createdAt: number;
  owner: string | null;
};

type Performance = {
  startValue: number;
  endValue: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
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

export default function IndexDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const seed = getSeedIndex(id);
  const isSeed = !!seed;

  const { data: index, error: indexError } = useSWR<IndexDetail | { error: string }>(
    isSeed ? null : `/api/indices/${id}`,
    fetcher,
  );

  const perfUrl = isSeed
    ? `/api/seed/index/${id}/performance`
    : index && "id" in index
      ? `/api/indices/${index.slug}/performance`
      : null;

  const { data: perfData } = useSWR<{
    performance: Performance;
    constituents?: Constituent[];
    currentQuotes?: CurrentQuote[];
  }>(perfUrl, fetcher);

  if (indexError && "error" in indexError && indexError.error === "private") {
    return (
      <div className="px-6 md:px-10 py-8 max-w-3xl">
        <Link
          href="/indices"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-4 transition-colors link-underline"
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar
        </Link>
        <div className="panel p-10 text-center animate-fade-up">
          <Lock className="w-8 h-8 text-muted mx-auto mb-3" />
          <h1 className="font-display text-xl text-ink mb-1">Índice privado</h1>
          <p className="text-sm text-muted">
            Faça login pra ver índices privados.
          </p>
        </div>
      </div>
    );
  }

  const name = (index && "name" in index ? index.name : seed?.name) ?? id;
  const description =
    (index && "description" in index ? index.description : seed?.description) ?? "";
  const methodology =
    (index && "description" in index ? index.description : seed?.methodology) ?? "";
  const owner = (index && "owner" in index ? index.owner : seed?.author) ?? null;
  const isPublic = isSeed || (index && "isPublic" in index ? index.isPublic : true);
  const createdAt =
    (index && "createdAt" in index ? index.createdAt : seed?.createdAt) ?? 0;

  const constituents =
    perfData?.constituents ??
    (seed?.constituents.map((s, i) => ({
      symbol: s,
      name: s,
      sector: "—",
      price: 0,
      changePercent: 0,
      rank: i + 1,
    })) ?? []);

  const currentQuotes = perfData?.currentQuotes ?? [];
  const performance = perfData?.performance;
  const isLoading = !isSeed && !index && !indexError;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <Link
        href="/indices"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-6 transition-colors link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        Voltar
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Carregando índice…
        </div>
      )}

      {!isLoading && (
        <>
          <div className="mb-8 animate-fade-up">
            <h1 className="font-display text-4xl md:text-5xl text-ink tracking-tight mb-2">
              {name}
            </h1>
            {description && <p className="text-body text-base max-w-2xl">{description}</p>}
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
              {performance && (
                <span>· {performance.daysHeld} dias</span>
              )}
              {seed && <Badge tone="brand">Plataforma</Badge>}
            </div>
          </div>

          {performance && performance.history.length > 1 && (
            <div className="panel p-6 mb-6 animate-fade-up stagger-1">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-sm font-medium text-ink uppercase tracking-wider">
                  Performance
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-5 mb-5">
                <Metric label="Total" value={performance.totalReturn} />
                <Metric label="Anualizado" value={performance.annualizedReturn} />
                <Metric label="Max Drawdown" value={-performance.maxDrawdown} />
              </div>
              <div className="h-64 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={performance.history}>
                    <defs>
                      <linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#idxGrad)"
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
            </div>
          )}

          {methodology && (
            <div className="panel p-6 mb-6 animate-fade-up stagger-2">
              <h2 className="text-sm font-medium text-ink uppercase tracking-wider mb-2">
                Metodologia
              </h2>
              <p className="text-sm text-body leading-relaxed">{methodology}</p>
            </div>
          )}

          <div className="panel p-6 animate-fade-up stagger-3">
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
                rows={constituents.map((c) => ({
                  symbol: c.symbol,
                  weight: 1 / constituents.length,
                }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted mb-1.5 font-medium">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-tabular font-semibold",
          value >= 0 ? "text-positive" : "text-negative",
        )}
      >
        <AnimatedNumber value={value * 100} signed decimals={2} suffix="%" />
      </div>
    </div>
  );
}
