"use client";

import { ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { RichFundamentalsTable } from "@/components/rich-fundamentals-table";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";

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
            </div>
          </div>

          {performance && performance.history.length > 1 && (
            <div className="panel p-6 mb-6 animate-fade-up stagger-1">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-sm font-medium text-ink uppercase tracking-wider">
                  Performance
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-5 mb-3">
                <Metric label="Total" value={performance.totalReturn} />
                <Metric label="Anualizado" value={performance.annualizedReturn} />
                <Metric label="Max Drawdown" value={-performance.maxDrawdown} />
              </div>
            </div>
          )}

          {methodology && (
            <div className="panel p-6 mb-6 animate-fade-up stagger-2">
              <h2 className="text-sm font-medium text-ink uppercase tracking-wider mb-2">
                Metodologia
              </h2>
              <p className="text-sm text-body">{methodology}</p>
            </div>
          )}

          <div className="panel p-6 animate-fade-up stagger-3">
            <h2 className="text-sm font-medium text-ink uppercase tracking-wider mb-4">
              Constituentes ({constituents.length})
            </h2>
            <RichFundamentalsTable
              rows={constituents.map((c) => ({
                symbol: c.symbol,
                weight: 1 / constituents.length,
              }))}
            />
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
