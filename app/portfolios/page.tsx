"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Portfolio = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initialValue: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  owner: string | null;
  constituents: { symbol: string; weight: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Seed portfolios displayed when DB is empty (first-time visitors)
const SEED_PORTFOLIOS = [
  {
    id: -1,
    slug: "growth-tech",
    name: "Growth Tech Leaders",
    description: "Top 10 empresas de tecnologia com maior crescimento de receita.",
    criterion: "Setor Tech + Comm Services, market cap > $100B, receita YoY > 15%.",
    riskLevel: "aggressive",
    ytdReturn: 28.7,
    constituents: [
      { symbol: "NVDA", weight: 0.11 },
      { symbol: "AAPL", weight: 0.10 },
      { symbol: "MSFT", weight: 0.10 },
      { symbol: "META", weight: 0.10 },
      { symbol: "GOOGL", weight: 0.10 },
    ],
  },
  {
    id: -2,
    slug: "balanced-60-40",
    name: "Balanced 60/40",
    description: "Alocação clássica: 60% ações S&P 500 + 40% bonds.",
    criterion: "60% SPY + 40% BND. Rebalanceamento trimestral.",
    riskLevel: "moderate",
    ytdReturn: 9.4,
    constituents: [
      { symbol: "SPY", weight: 0.60 },
      { symbol: "BND", weight: 0.40 },
    ],
  },
  {
    id: -3,
    slug: "income-yield",
    name: "Income & Yield",
    description: "Foco em renda passiva com ações dividend + bonds.",
    criterion: "Dividend yield > 3%, payout < 70%.",
    riskLevel: "conservative",
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
  },
];

export default function PortfoliosPage() {
  const { data } = useSWR<{ portfolios: Portfolio[] }>(
    "/api/portfolios?scope=public",
    fetcher,
  );
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const userPortfolios = data?.portfolios ?? [];
  const showingUserPortfolios = userPortfolios.length > 0;

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Portfolios</h1>
          <p className="text-sm text-text-secondary">
            {user
              ? "Seus portfolios + portfolios públicos da plataforma"
              : "Portfolios pré-definidos pela plataforma"}
          </p>
        </div>
        {user && (
          <Link
            href="/portfolios/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Novo portfolio
          </Link>
        )}
      </div>

      {!user && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center justify-between">
          <div className="text-sm">
            <strong className="text-foreground">Crie sua conta</strong> pra salvar
            portfolios e ver performance real baseada em dados históricos.
          </div>
          <Link
            href="/signup"
            className="text-xs px-3 py-1.5 rounded-md bg-foreground text-background"
          >
            Criar agora
          </Link>
        </div>
      )}

      {showingUserPortfolios ? (
        <>
          <h2 className="text-sm uppercase tracking-wider text-text-muted font-medium mb-3">
            {user ? "Meus portfolios" : "Portfolios da plataforma"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {userPortfolios.map((p) => (
              <Link
                key={p.id}
                href={`/portfolios/${p.slug}`}
                className="rounded-lg border border-border bg-surface p-5 hover:border-foreground/30 hover:bg-surface-elevated transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {p.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  {p.isPublic ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted uppercase tracking-wider">
                      Público
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted uppercase tracking-wider inline-flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Privado
                    </span>
                  )}
                  <span className="text-xs text-text-muted">@{p.owner ?? "anon"}</span>
                </div>

                {p.description && (
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                    {p.description}
                  </p>
                )}

                <div className="flex items-baseline justify-between pt-3 border-t border-border-subtle">
                  <span className="text-xs text-text-muted">{p.constituents.length} ativos</span>
                  <span className="text-xs text-text-muted">
                    {new Date(p.createdAt * 1000).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {!showingUserPortfolios && (
        <>
          <h2 className="text-sm uppercase tracking-wider text-text-muted font-medium mb-3">
            Pré-definidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEED_PORTFOLIOS.map((p) => (
              <PortfolioCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                description={p.description}
                criterion={p.criterion}
                riskLevel={p.riskLevel as "conservative" | "moderate" | "aggressive"}
                constituents={p.constituents}
                ytdReturn={p.ytdReturn}
                author="platform"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PortfolioCard({
  slug,
  name,
  description,
  riskLevel,
  constituents,
  ytdReturn,
  author,
}: {
  slug: string;
  name: string;
  description: string;
  criterion: string;
  riskLevel: "conservative" | "moderate" | "aggressive";
  constituents: { symbol: string; weight: number }[];
  ytdReturn: number;
  author: string;
}) {
  const RISK_COLORS = {
    conservative: "bg-blue-400/10 text-blue-300",
    moderate: "bg-yellow-400/10 text-yellow-300",
    aggressive: "bg-red-400/10 text-red-300",
  };
  const RISK_LABELS = {
    conservative: "Conservador",
    moderate: "Moderado",
    aggressive: "Agressivo",
  };
  return (
    <Link
      href={`/portfolios/${slug}`}
      className="rounded-lg border border-border bg-surface p-5 hover:border-foreground/30 hover:bg-surface-elevated transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
          {name}
        </h3>
        <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider",
            RISK_COLORS[riskLevel],
          )}
        >
          {RISK_LABELS[riskLevel]}
        </span>
        <span className="text-xs text-text-muted">por {author}</span>
      </div>
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">{description}</p>
      <div className="flex items-baseline justify-between pt-3 border-t border-border-subtle">
        <span className="text-xs text-text-muted">{constituents.length} ativos</span>
        <span
          className={cn(
            "text-sm font-mono font-semibold tabular-nums",
            ytdReturn >= 0 ? "text-positive" : "text-negative",
          )}
        >
          {ytdReturn >= 0 ? "+" : ""}
          {ytdReturn.toFixed(1)}% YTD
        </span>
      </div>
    </Link>
  );
}
