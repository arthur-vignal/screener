"use client";

/**
 * /portfolio — menu de portfolios do user logado.
 *
 * Lista todos os portfolios criados (ordenados por updated_at DESC) em
 * cards com:
 *   - nome + slug + descrição
 *   - holdings count
 *   - valor total (calculado via /api/portfolio/[slug])
 *   - retorno % desde criação
 *   - data de atualização
 *
 * Empty state: nenhum portfolio → CTA grande pra `/portfolio/new`.
 * Loading state: skeleton com 3 cards vazios.
 * Error state: mensagem + retry.
 *
 * Auth: se não tiver sessão, redireciona pra /login.
 */

import { motion } from "motion/react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { JSX } from "react";
import {
  ArrowRight,
  Briefcase,
  LineChart,
  Plus,
  RefreshCw,
  TrendingDown,
} from "lucide-react";

import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import {
  StaggerOnMount,
  staggerParentVariants,
} from "@/components/foundation/stagger";
import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type PortfolioRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initial_value: number;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  holdings_count: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 401) {
    const err = new Error("unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

export default function PortfolioMenuPage(): JSX.Element {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<{
    portfolios: PortfolioRow[];
  }>("/api/portfolio", fetchJson, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  // Redireciona pra /login se não autenticado.
  useEffect(() => {
    if (error && (error as Error & { status?: number }).status === 401) {
      router.push("/login");
    }
  }, [error, router]);

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#070709" }}>
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-8 pb-32"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground leading-[1.1]">
            Portfolios
          </h1>
          <Link
            href="/portfolio/new"
            className={cn(
              "inline-flex items-center gap-1.5 h-10 px-4 rounded-md",
              "bg-[var(--primary)] text-[#070709]",
              "text-[13px] font-semibold",
              "hover:opacity-90 transition-opacity cursor-pointer",
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Novo portfolio
          </Link>
        </div>

        {/* Body */}
        {isLoading ? (
          <SkeletonGrid />
        ) : error ? (
          (error as Error & { status?: number }).status === 401 ? null : (
            <ErrorState onRetry={() => mutate()} />
          )
        ) : !data || data.portfolios.length === 0 ? (
          <EmptyState />
        ) : (
          <StaggerOnMount>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.portfolios.map((p) => (
                <PortfolioCard key={p.id} portfolio={p} />
              ))}
            </div>
          </StaggerOnMount>
        )}
      </motion.main>

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────

function PortfolioCard({
  portfolio,
}: { portfolio: PortfolioRow }): JSX.Element {
  const date = new Date(portfolio.updated_at * 1000);
  const dateText = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const isPublic = portfolio.is_public;
  return (
    <Link
      href={`/portfolio/${portfolio.slug}`}
      className={cn(
        "block rounded-2xl border border-white/10 bg-[#101116] p-5",
        "hover:border-white/20 hover:bg-[#13141a] transition-colors",
        "group",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Briefcase
              className="h-4 w-4 text-muted-foreground/70 shrink-0"
              strokeWidth={2}
            />
            <h2 className="text-[15px] font-semibold text-foreground truncate">
              {portfolio.name}
            </h2>
          </div>
          {portfolio.description && (
            <p className="mt-1 text-[12px] text-muted-foreground/70 line-clamp-2 leading-snug">
              {portfolio.description}
            </p>
          )}
        </div>
        {isPublic && (
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] uppercase tracking-wide text-muted-foreground/85 font-medium">
            Público
          </span>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
            Posições
          </div>
          <div className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">
            {portfolio.holdings_count}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
            Capital inicial
          </div>
          <div className="mt-1 text-[14px] tabular-nums text-muted-foreground/85 font-medium">
            {portfolio.initial_value.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground/70">
          Atualizado {dateText}
        </div>
        <ArrowRight
          className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
          strokeWidth={2}
        />
      </div>
    </Link>
  );
}

// ─── States ───────────────────────────────────────────────────────────────

function EmptyState(): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#101116] p-12 text-center">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/[0.04] border border-white/10">
        <LineChart className="h-5 w-5 text-muted-foreground/70" strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-[16px] font-semibold text-foreground">
        Nenhum portfolio ainda
      </h2>
      <p className="mt-1.5 text-[13px] text-muted-foreground/85 max-w-md mx-auto leading-relaxed">
        Crie um portfolio pra acompanhar seus ativos, ver a valorização
        em tempo real e comparar com benchmarks do mercado.
      </p>
      <Link
        href="/portfolio/new"
        className={cn(
          "mt-6 inline-flex items-center gap-1.5 h-10 px-4 rounded-md",
          "bg-[var(--primary)] text-[#070709]",
          "text-[13px] font-semibold",
          "hover:opacity-90 transition-opacity cursor-pointer",
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Criar primeiro portfolio
      </Link>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#101116] p-8 text-center">
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#d84f68]/10">
        <TrendingDown className="h-5 w-5 text-[#d84f68]" strokeWidth={2} />
      </div>
      <h2 className="mt-3 text-[15px] font-semibold text-foreground">
        Não foi possível carregar
      </h2>
      <p className="mt-1.5 text-[13px] text-muted-foreground/85">
        Tente recarregar — pode ser um problema de conexão temporário.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-md",
          "border border-white/10 bg-white/[0.04]",
          "text-[12px] font-medium text-foreground",
          "hover:bg-white/[0.08] transition-colors cursor-pointer",
        )}
      >
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
        Recarregar
      </button>
    </div>
  );
}

function SkeletonGrid(): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-[#101116] p-5"
        >
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-2/3 mb-6" />
          <div className="flex justify-between">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper icons (used internally; no exports — Next requires single default)
