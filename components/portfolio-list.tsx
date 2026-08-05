"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock, Globe, User as UserIcon, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEED_PORTFOLIOS, type SeedPortfolio } from "@/lib/seed-data";

type Portfolio = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initialValue: number;
  isPublic: boolean;
  createdAt: number;
  owner: string | null;
  constituents: { symbol: string; weight: number }[];
};

type PortfolioWithMeta = Portfolio & {
  criterion?: string;
  riskLevel?: "conservative" | "moderate" | "aggressive";
  ytdReturn?: number;
};

type Scope = "all" | "sulfur" | "mine" | "public";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Props = {
  scope: Scope;
  title: string;
  description: string;
  emptyMessage: string;
};

const SCOPE_LABEL: Record<Scope, string> = {
  all: "Todos",
  sulfur: "Sulfur",
  mine: "My Portfolios",
  public: "Public",
};

const SCOPE_ICON: Record<Scope, typeof UserIcon> = {
  all: BookOpen,
  sulfur: Globe,
  mine: UserIcon,
  public: Globe,
};

export function PortfolioList({ scope, title, description, emptyMessage }: Props) {
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const { data: userData } = useSWR<{ portfolios: Portfolio[] }>(
    scope === "mine" && user ? "/api/portfolios?scope=mine" : null,
    fetcher,
  );
  const { data: publicData } = useSWR<{ portfolios: Portfolio[] }>(
    scope === "public" ? "/api/portfolios?scope=public" : null,
    fetcher,
  );

  const Icon = SCOPE_ICON[scope];

  let portfolios: PortfolioWithMeta[] = [];
  if (scope === "sulfur") {
    portfolios = SEED_PORTFOLIOS.map((p) => ({
      id: 0,
      slug: p.slug,
      name: p.name,
      description: p.description,
      initialValue: p.initialValue,
      isPublic: true,
      createdAt: p.createdAt,
      owner: p.author,
      constituents: p.constituents,
      criterion: p.criterion,
      riskLevel: p.riskLevel,
      ytdReturn: p.ytdReturn,
    }));
  } else if (scope === "mine") {
    portfolios = userData?.portfolios ?? [];
  } else if (scope === "public") {
    portfolios = publicData?.portfolios ?? [];
  } else {
    // "all" — combine seed + public + mine
    const mine = userData?.portfolios ?? [];
    const pub = publicData?.portfolios ?? [];
    const seedCards: PortfolioWithMeta[] = SEED_PORTFOLIOS.map((p) => ({
      id: 0,
      slug: p.slug,
      name: p.name,
      description: p.description,
      initialValue: p.initialValue,
      isPublic: true,
      createdAt: p.createdAt,
      owner: p.author,
      constituents: p.constituents,
      criterion: p.criterion,
      riskLevel: p.riskLevel,
      ytdReturn: p.ytdReturn,
    }));
    portfolios = [...seedCards, ...pub, ...mine];
  }

  const loading = scope === "mine" && !userData && user;
  const isAuthRequired = scope === "mine" && !user;

  return (
    <div className="px-6 md:px-10 py-10 md:py-14 max-w-7xl">
      <PageHeader
        title={title}
        description={description}
        actions={
          scope === "mine" && user && (
            <Link
              href="/portfolios/new"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-brand text-brand-on hover:bg-brand-soft transition-colors duration-150 press text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Novo portfolio
            </Link>
          )
        }
      />

      {isAuthRequired ? (
        <Card className="p-10 text-center">
          <Lock className="w-8 h-8 text-muted mx-auto mb-3" />
          <h2 className="font-medium text-ink mb-1">Faça login para ver seus portfolios</h2>
          <p className="text-sm text-muted mb-4">
            Seus portfolios são privados e sincronizam entre dispositivos.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center px-4 h-9 bg-ink text-canvas text-sm font-medium hover:bg-brand-deep transition-colors duration-150 press"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center px-4 h-9 border border-hairline-strong text-sm font-medium hover:bg-surface-elevated transition-colors duration-150 press"
            >
              Criar conta
            </Link>
          </div>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <Card className="p-12 text-center">
          <Icon className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">{emptyMessage}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p, i) => (
            <PortfolioCard key={`${p.slug}-${i}`} p={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioCard({ p, index }: { p: PortfolioWithMeta; index: number }) {
  return (
    <Link
      href={`/portfolios/${p.slug}`}
      className="panel p-5 hover-lift group animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-2.5">
        <h3 className="font-medium text-ink group-hover:text-brand-deep transition-colors duration-150">
          {p.name}
        </h3>
        <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
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
        {p.isPublic ? (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-muted uppercase tracking-wider inline-flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" />
            Public
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-muted uppercase tracking-wider inline-flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Private
          </span>
        )}
        {p.owner && (
          <span className="text-xs text-muted">@{p.owner}</span>
        )}
        <span className="text-xs text-muted">· {p.constituents.length} ativos</span>
      </div>
      <p className="text-sm text-body line-clamp-2 mb-3">{p.description}</p>
      {p.criterion && (
        <p className="text-xs text-muted italic mb-3">{p.criterion}</p>
      )}
      {p.ytdReturn != null && (
        <div className="flex items-baseline justify-between pt-3 border-t border-hairline">
          <span className="text-xs text-muted">YTD</span>
          <span
            className={cn(
              "text-sm font-tabular font-semibold",
              p.ytdReturn >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {p.ytdReturn >= 0 ? "+" : ""}
            {p.ytdReturn.toFixed(1)}%
          </span>
        </div>
      )}
    </Link>
  );
}
