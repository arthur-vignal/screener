"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock, Globe, User as UserIcon, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEED_PORTFOLIOS, type SeedPortfolio } from "@/lib/seed-data";
import { PortfolioHoldingsTable } from "./portfolio-holdings-table";

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
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-7xl">
      <PageHeader
        title={title}
        description={description}
        actions={
          scope === "mine" && user && (
            <Link
              href="/portfolios/new"
              className="inline-flex items-center justify-center gap-2 h-9 px-3 bg-brand text-brand-on hover:bg-brand-soft transition-colors duration-150 press text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Novo portfolio
            </Link>
          )
        }
      />

      {isAuthRequired ? (
        <div className="border-t border-hairline py-10 text-center">
          <Lock className="w-6 h-6 text-muted mx-auto mb-2" />
          <h2 className="font-medium text-ink mb-1 text-sm">Faça login para ver seus portfolios</h2>
          <p className="text-xs text-muted mb-3">Seus portfolios são privados e sincronizam entre dispositivos.</p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center px-3 h-8 bg-ink text-canvas text-xs font-medium hover:bg-brand-deep transition-colors duration-150 press"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center px-3 h-8 border border-hairline-strong text-xs font-medium hover:bg-surface-elevated transition-colors duration-150 press"
            >
              Criar conta
            </Link>
          </div>
        </div>
      ) : loading ? (
        <Skeleton className="h-32" />
      ) : portfolios.length === 0 ? (
        <div className="border-t border-hairline py-10 text-center">
          <BookOpen className="w-6 h-6 text-muted mx-auto mb-2" />
          <p className="text-xs text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolios.map((p, i) => (
            <PortfolioSection key={`${p.slug}-${i}`} p={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioSection({ p, index }: { p: PortfolioWithMeta; index: number }) {
  return (
    <section className="border-t border-hairline animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/portfolios/${p.slug}`}
            className="group inline-flex items-center gap-2"
          >
            <h2 className="font-display text-xl text-ink group-hover:text-brand-deep transition-colors duration-150">
              {p.name}
            </h2>
            <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>
          <p className="text-xs text-body mt-1 max-w-3xl">{p.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
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
              <span className="text-[10px] px-1.5 py-0.5 bg-surface-elevated text-muted uppercase tracking-wider inline-flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" />
                Public
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 bg-surface-elevated text-muted uppercase tracking-wider inline-flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Private
              </span>
            )}
            {p.owner && <span className="text-xs text-muted">@{p.owner}</span>}
            <span className="text-xs text-muted">· {p.constituents.length} ativos</span>
            {p.ytdReturn != null && (
              <span className={cn(
                "text-xs font-tabular font-medium",
                p.ytdReturn >= 0 ? "text-positive" : "text-negative",
              )}>
                YTD {p.ytdReturn >= 0 ? "+" : ""}{p.ytdReturn.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <PortfolioHoldingsTable holdings={p.constituents} />
    </section>
  );
}
