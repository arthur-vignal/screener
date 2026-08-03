"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock, Globe, User as UserIcon } from "lucide-react";
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

type PortfolioWithMeta = Portfolio & {
  criterion?: string;
  riskLevel?: "conservative" | "moderate" | "aggressive";
  ytdReturn?: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// 5 platform-curated strategies (Damodaran-inspired)
const PLATFORM_PORTFOLIOS: PortfolioWithMeta[] = [
  {
    id: -1,
    slug: "growth-tech",
    name: "Growth Tech Leaders",
    description: "Empresas de tech com crescimento sustentável de receita e ROIC > 15%.",
    criterion: "Tech + Comm Services, ROIC > 15%, CAGR Receita 5y > 12%, ROE > 18%.",
    riskLevel: "aggressive",
    ytdReturn: 28.7,
    initialValue: 10000,
    isPublic: true,
    createdAt: 0,
    updatedAt: 0,
    owner: "platform",
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
    description: "Alocação clássica com bonds de qualidade.",
    criterion: "60% SPY + 40% BND. Rebalanceamento trimestral.",
    riskLevel: "moderate",
    ytdReturn: 9.4,
    initialValue: 10000,
    isPublic: true,
    createdAt: 0,
    updatedAt: 0,
    owner: "platform",
    constituents: [
      { symbol: "SPY", weight: 0.60 },
      { symbol: "BND", weight: 0.40 },
    ],
  },
  {
    id: -3,
    slug: "income-yield",
    name: "Income & Yield",
    description: "Renda passiva com dividend payers + bonds.",
    criterion: "Dividend yield > 3%, payout < 70%, ROE > 10%.",
    riskLevel: "conservative",
    ytdReturn: 4.2,
    initialValue: 10000,
    isPublic: true,
    createdAt: 0,
    updatedAt: 0,
    owner: "platform",
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
    id: -4,
    slug: "deep-value",
    name: "Deep Value (Piotroski)",
    description: "Ações descontadas (P/VP < 1.5) com qualidade financeira alta (Piotroski >= 7).",
    criterion: "P/VP < 1.5, P/L < 12, P/FCF > 8, Piotroski >= 7.",
    riskLevel: "moderate",
    ytdReturn: 12.1,
    initialValue: 10000,
    isPublic: true,
    createdAt: 0,
    updatedAt: 0,
    owner: "platform",
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
    id: -5,
    slug: "small-cap-quality",
    name: "Small-Cap Quality",
    description: "Small caps com ROIC alto e baixo endividamento.",
    criterion: "Market cap $2-15B, ROIC > 12%, Dívida/EBITDA < 2x, ROE > 15%.",
    riskLevel: "aggressive",
    ytdReturn: 18.3,
    initialValue: 10000,
    isPublic: true,
    createdAt: 0,
    updatedAt: 0,
    owner: "platform",
    constituents: [
      { symbol: "WSC", weight: 0.10 },
      { symbol: "ITT", weight: 0.10 },
      { symbol: "VSTO", weight: 0.08 },
      { symbol: "LNN", weight: 0.08 },
      { symbol: "EXPO", weight: 0.08 },
      { symbol: "UFPI", weight: 0.07 },
      { symbol: "ASO", weight: 0.07 },
      { symbol: "THR...", weight: 0.06 },
    ],
  },
];

type Tab = "mine" | "library" | "platform";

export default function PortfoliosPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // Fetch mine + public
  const mineKey = user ? "/api/portfolios?scope=mine" : null;
  const publicKey = "/api/portfolios?scope=public";
  const { data: mineData } = useSWR<{ portfolios: Portfolio[] }>(mineKey, fetcher);
  const { data: publicData } = useSWR<{ portfolios: Portfolio[] }>(publicKey, fetcher);

  const mine = mineData?.portfolios ?? [];
  const library = publicData?.portfolios ?? [];

  // If user not logged in, default to platform tab
  useEffect(() => {
    if (!user && tab === "mine") setTab("platform");
  }, [user, tab]);

  const tabs: { id: Tab; label: string; count: number; icon: typeof UserIcon }[] = [
    { id: "mine", label: "Meus portfolios", count: mine.length, icon: UserIcon },
    { id: "library", label: "Biblioteca", count: library.length, icon: Globe },
    { id: "platform", label: "Plataforma", count: PLATFORM_PORTFOLIOS.length, icon: Lock },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Portfolios</h1>
          <p className="text-sm text-text-secondary">
            Crie portfolios com data retroativa e veja performance histórica real.
          </p>
        </div>
        {user && (
          <Link
            href="/portfolios/new"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Novo portfolio
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle mb-6">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                disabled={t.id === "mine" && !user}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                  tab === t.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-text-muted hover:text-foreground",
                  t.id === "mine" && !user && "opacity-50 cursor-not-allowed",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                <span className="ml-1 text-xs text-text-muted">({t.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {tab === "mine" && (
        <PortfolioGrid portfolios={mine} emptyMessage={user ? "Você ainda não criou portfolios." : "Faça login para criar portfolios."} showOwner={false} />
      )}
      {tab === "library" && (
        <PortfolioGrid portfolios={library} emptyMessage="Nenhum portfolio público na biblioteca ainda." showOwner />
      )}
      {tab === "platform" && (
        <PortfolioGrid
          portfolios={PLATFORM_PORTFOLIOS}
          emptyMessage=""
          showOwner={false}
          platformOwned
        />
      )}
    </div>
  );
}

function PortfolioGrid({
  portfolios,
  emptyMessage,
  showOwner,
  platformOwned,
}: {
  portfolios: PortfolioWithMeta[];
  emptyMessage: string;
  showOwner?: boolean;
  platformOwned?: boolean;
}) {
  if (portfolios.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-text-muted">
        {emptyMessage || "Nenhum portfolio encontrado."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {portfolios.map((p) => (
        <Link
          key={p.id}
          href={`/portfolios/${p.slug}`}
          className="rounded-lg border border-border bg-surface p-5 hover:border-foreground transition-colors group"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
              {p.name}
            </h3>
            {showOwner && p.owner && (
              <span className="text-xs text-text-muted">@{p.owner}</span>
            )}
            {platformOwned && (
              <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">
                Platform
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mb-3 line-clamp-2">{p.description}</p>
          {p.criterion && (
            <p className="text-xs text-text-muted mb-3 italic">{p.criterion}</p>
          )}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {p.riskLevel && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium uppercase",
                    p.riskLevel === "conservative" && "bg-positive/20 text-positive",
                    p.riskLevel === "moderate" && "bg-yellow-500/20 text-yellow-400",
                    p.riskLevel === "aggressive" && "bg-negative/20 text-negative",
                  )}
                >
                  {p.riskLevel}
                </span>
              )}
              <span className="text-text-muted">{p.constituents.length} ativos</span>
            </div>
            {p.ytdReturn != null && (
              <span className="font-mono tabular-nums text-positive">
                +{p.ytdReturn.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center justify-end text-xs text-text-muted group-hover:text-foreground transition-colors">
            Ver detalhes
            <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      ))}
    </div>
  );
}