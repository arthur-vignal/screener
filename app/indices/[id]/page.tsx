"use client";

import { ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";

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

type IndexPerformance = {
  performance: {
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    daysHeld: number;
    history: { date: string; value: number }[];
  };
  constituents: Constituent[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Seed details (shown when DB doesn't have the index)
const SEED_DETAILS: Record<
  string,
  {
    name: string;
    description: string;
    methodology: string;
    author: string;
    createdAt: number;
    constituents: string[];
  }
> = {
  "sp500-momentum": {
    name: "S&P 500 Momentum Score",
    description: "Top 50 ações do S&P 500 rankeadas por momentum 12-1.",
    methodology:
      "Universo: S&P 500. Critério: retorno 12 meses excluindo último mês. Top 50. Equal-weighted. Rebalanceamento mensal.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["NVDA", "MSFT", "AAPL", "AMZN", "META", "GOOGL", "AVGO", "TSLA", "BRK.B", "LLY"],
  },
  "quality-value": {
    name: "Quality-Value Composite",
    description: "Ações com ROE > 15% e P/E < 20.",
    methodology: "Universo: S&P 500. ROE > 15%, P/E < 20. Top 30.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["JNJ", "PG", "KO", "PEP", "WMT", "HD", "AXP", "BLK", "MA", "V"],
  },
  "low-vol-defensive": {
    name: "Low-Volatility Defensive",
    description: "Ações com baixa volatilidade histórica.",
    methodology: "Top 30 com menor volatilidade anualizada.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["JNJ", "PG", "KO", "PEP", "WMT", "VZ", "T", "XOM", "CVX", "NEE"],
  },
  "global-momentum": {
    name: "Global Momentum",
    description: "ETFs globais com momentum positivo em 6 meses.",
    methodology: "Mix de ETFs globais. Rebalanceamento mensal.",
    author: "platform",
    createdAt: Math.floor(new Date("2024-01-01").getTime() / 1000),
    constituents: ["SPY", "QQQ", "VEA", "VWO", "EFA", "IEMG"],
  },
};

export default function IndexDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const seed = SEED_DETAILS[id];

  const { data: index, error: indexError } = useSWR<IndexDetail | { error: string }>(
    `/api/indices/${id}`,
    fetcher,
  );
  const { data: perfData } = useSWR<IndexPerformance>(
    index && "id" in index
      ? `/api/indices/${index.slug}/performance`
      : null,
    fetcher,
  );

  if (indexError && "error" in indexError && indexError.error === "private") {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <Link
          href="/indices"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3 h-3" />
          Voltar
        </Link>
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <Lock className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <h1 className="text-lg font-medium mb-1">Índice privado</h1>
          <p className="text-sm text-text-secondary">
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
  const isPublic =
    (index && "isPublic" in index ? index.isPublic : true);
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

  const performance = perfData?.performance;
  const isLoading = !index && !seed;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <Link
        href="/indices"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Voltar
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Carregando índice…
        </div>
      )}

      {!isLoading && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight mb-1">{name}</h1>
            {description && <p className="text-sm text-text-secondary">{description}</p>}
            <div className="flex items-center gap-2 mt-2">
              {owner && <span className="text-xs text-text-muted">@{owner}</span>}
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
              {performance && (
                <span className="text-xs text-text-muted">
                  · {performance.daysHeld} dias
                </span>
              )}
            </div>
          </div>

          {performance && performance.history.length > 1 && (
            <div className="rounded-lg border border-border bg-surface p-5 mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-medium">Performance</h2>
                {!performance && (
                  <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <Metric
                  label="Total"
                  value={performance.totalReturn}
                />
                <Metric
                  label="Anualizado"
                  value={performance.annualizedReturn}
                />
                <Metric
                  label="Max Drawdown"
                  value={-performance.maxDrawdown}
                />
              </div>
            </div>
          )}

          {/* Methodology */}
          {methodology && (
            <div className="rounded-lg border border-border bg-surface p-5 mb-6">
              <h2 className="text-sm font-medium mb-2">Metodologia</h2>
              <p className="text-sm text-text-secondary">{methodology}</p>
            </div>
          )}

          {/* Constituents */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-medium mb-3">
              Constituentes ({constituents.length})
            </h2>
            <div className="space-y-1">
              {constituents.map((c) => (
                <div
                  key={c.symbol}
                  className="flex items-center gap-3 px-3 py-2 bg-background/50 rounded"
                >
                  <span className="text-xs text-text-muted w-8 text-right font-mono">
                    #{c.rank}
                  </span>
                  <Link
                    href={`/asset/${encodeURIComponent(c.symbol)}`}
                    className="font-mono font-semibold text-sm w-20 hover:text-accent transition-colors"
                  >
                    {c.symbol}
                  </Link>
                  <span className="flex-1 text-xs text-text-muted truncate">
                    {c.name}
                  </span>
                  <span className="text-xs text-text-muted hidden md:inline">
                    {c.sector}
                  </span>
                  {c.price > 0 && (
                    <>
                      <span className="text-xs font-mono tabular-nums">
                        ${c.price.toFixed(2)}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-mono tabular-nums w-16 text-right",
                          c.changePercent >= 0 ? "text-positive" : "text-negative",
                        )}
                      >
                        {c.changePercent >= 0 ? "+" : ""}
                        {c.changePercent.toFixed(2)}%
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-mono font-semibold tabular-nums",
          value >= 0 ? "text-positive" : "text-negative",
        )}
      >
        {value >= 0 ? "+" : ""}
        {(value * 100).toFixed(2)}%
      </div>
    </div>
  );
}
