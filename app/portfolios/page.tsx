"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock, Globe, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      { symbol: "THR", weight: 0.06 },
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

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "mine", label: "Meus portfolios", count: mine.length },
    { id: "library", label: "Biblioteca", count: library.length },
    { id: "platform", label: "Plataforma", count: PLATFORM_PORTFOLIOS.length },
  ];

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl">
      <PageHeader
        title="Portfolios"
        description="Crie portfolios com data retroativa e veja performance histórica real."
        actions={
          user && (
            <ButtonLink href="/portfolios/new" className="hidden md:inline-flex">
              <Plus className="w-4 h-4" />
              Novo portfolio
            </ButtonLink>
          )
        }
      />

      {/* Mobile floating action — keep visible on small screens */}
      {user && (
        <Link
          href="/portfolios/new"
          className="md:hidden flex items-center justify-center gap-2 mb-4 w-full bg-brand text-on-brand rounded-md py-2.5 text-sm font-medium press hover:bg-brand-bright transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo portfolio
        </Link>
      )}

      {/* Custom tabs to keep icon support */}
      <TabBar tabs={tabs} tab={tab} setTab={setTab} user={user} />

      <div className="mt-6">
        {tab === "mine" && (
          <PortfolioGrid
            portfolios={mine}
            emptyMessage={user ? "Você ainda não criou portfolios." : "Faça login para criar portfolios."}
            showOwner={false}
          />
        )}
        {tab === "library" && (
          <PortfolioGrid
            portfolios={library}
            emptyMessage="Nenhum portfolio público na biblioteca ainda."
            showOwner
          />
        )}
        {tab === "platform" && (
          <PortfolioGrid
            portfolios={PLATFORM_PORTFOLIOS as unknown as PortfolioWithMeta[]}
            emptyMessage=""
            showOwner={false}
            platformOwned
          />
        )}
      </div>
    </div>
  );
}

function ButtonLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className}>
      <span className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-brand text-on-brand hover:bg-brand-bright transition-colors press text-sm font-medium">
        {children}
      </span>
    </Link>
  );
}

function TabBar({
  tabs,
  tab,
  setTab,
  user,
}: {
  tabs: { id: Tab; label: string; count: number }[];
  tab: Tab;
  setTab: (t: Tab) => void;
  user: { userId: string; username: string } | null;
}) {
  const icons: Record<Tab, typeof UserIcon> = {
    mine: UserIcon,
    library: Globe,
    platform: Lock,
  };
  return (
    <div className="relative border-b border-hairline">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = icons[t.id];
          const active = tab === t.id;
          const disabled = t.id === "mine" && !user;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={disabled}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors duration-150 press",
                active ? "text-ink font-medium" : "text-muted hover:text-ink",
                disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              <span className="text-xs text-muted">({t.count})</span>
              {active && <span className="tab-indicator left-0 right-0" />}
            </button>
          );
        })}
      </nav>
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
      <div className="text-center py-16 text-sm text-muted animate-fade-up">
        {emptyMessage || "Nenhum portfolio encontrado."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {portfolios.map((p, i) => (
        <Link
          key={p.id}
          href={`/portfolios/${p.slug}`}
          className="panel p-5 hover-lift group animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between mb-2.5">
            <h3 className="font-semibold text-ink group-hover:text-brand-bright transition-colors duration-150">
              {p.name}
            </h3>
            {showOwner && p.owner && (
              <span className="text-xs text-muted">@{p.owner}</span>
            )}
            {platformOwned && (
              <Badge tone="brand">Platform</Badge>
            )}
          </div>
          <p className="text-sm text-body mb-3 line-clamp-2 leading-relaxed">
            {p.description}
          </p>
          {p.criterion && (
            <p className="text-xs text-muted mb-3 italic">{p.criterion}</p>
          )}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {p.riskLevel && (
                <Badge
                  tone={
                    p.riskLevel === "conservative"
                      ? "positive"
                      : p.riskLevel === "moderate"
                      ? "warning"
                      : "negative"
                  }
                >
                  {p.riskLevel}
                </Badge>
              )}
              <span className="text-muted">{p.constituents.length} ativos</span>
            </div>
            {p.ytdReturn != null && (
              <span className="font-tabular text-positive font-semibold">
                +{p.ytdReturn.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center justify-end text-xs text-muted group-hover:text-ink transition-colors duration-150">
            Ver detalhes
            <ArrowRight className="w-3 h-3 ml-1 icon-rotate-hover" />
          </div>
        </Link>
      ))}
    </div>
  );
}
