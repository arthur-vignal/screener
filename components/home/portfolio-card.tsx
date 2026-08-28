"use client";

/**
 * PortfolioCard — hero card da coluna esquerda da /home.
 *
 * Saudação personalizada + variação total do portfólio hoje + CTA
 * "Acessar portfólio". Skeleton quando carregando, empty quando
 * o usuário ainda não tem portfólio.
 *
 * Estados:
 *  - loading: skeleton com forma do conteúdo
 *  - empty:   sem portfólio → CTA "Criar portfólio"
 *  - ready:   mostra saudação + variação + CTA "Acessar portfólio"
 *  - error:   mensagem + retry
 */

import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import type { JSX } from "react";

import { Delta } from "@/components/foundation/delta";
import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

export type PortfolioCardState =
  | { kind: "loading" }
  | { kind: "empty"; name: string | null }
  | {
      kind: "ready";
      name: string;
      totalValue: number;
      changeToday: number;
      changeTodayPercent: number;
      currency: "BRL" | "USD";
    }
  | { kind: "error" };

type Props = {
  state: PortfolioCardState;
  className?: string;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function PortfolioCard({ state, className }: Props): JSX.Element {
  if (state.kind === "loading") return <LoadingCard className={className} />;
  if (state.kind === "error") return <ErrorCard className={className} />;
  if (state.kind === "empty")
    return <EmptyCard name={state.name} className={className} />;

  return <ReadyCard state={state} className={className} />;
}

// ─── Ready ──────────────────────────────────────────────────────────────────

function ReadyCard({
  state,
  className,
}: {
  state: Extract<PortfolioCardState, { kind: "ready" }>;
  className?: string;
}): JSX.Element {
  const valueFormatted = state.totalValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: state.currency,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-6",
        className
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">
        Carteira
      </div>

      <p className="text-[15px] text-foreground leading-snug">
        {greeting()},{" "}
        <span className="font-semibold">{state.name}</span>.
      </p>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 mb-1.5">
          Patrimônio
        </div>
        <div className="text-[32px] font-semibold tabular-nums text-foreground leading-none">
          {valueFormatted}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[13px]">
          <Delta
            value={state.changeTodayPercent}
            unit="percent"
            size="md"
          />
          <span className="text-muted-foreground">hoje</span>
        </div>
      </div>

      <Link
        href="/portfolio"
        className={cn(
          "mt-6 inline-flex items-center justify-center gap-1.5 w-full h-10",
          "rounded-md border border-white/10 bg-white/[0.04]",
          "text-[13px] font-medium text-foreground",
          "hover:bg-white/[0.08] hover:border-white/20",
          "transition-colors cursor-pointer"
        )}
      >
        Acessar portfólio
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}

// ─── Empty ──────────────────────────────────────────────────────────────────

function EmptyCard({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-6",
        className
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">
        Carteira
      </div>

      <p className="text-[15px] text-foreground leading-snug">
        {greeting()}{name ? `, ${name}` : ""}.
      </p>

      <p className="mt-4 text-[14px] text-muted-foreground/85 leading-relaxed">
        Você ainda não tem uma carteira. Crie uma pra acompanhar seus
        ativos e ver a valorização em tempo real.
      </p>

      <Link
        href="/portfolio/new"
        className={cn(
          "mt-6 inline-flex items-center justify-center gap-1.5 w-full h-10",
          "rounded-md bg-[var(--primary)] text-[#070709]",
          "text-[13px] font-semibold",
          "hover:opacity-90 transition-opacity cursor-pointer"
        )}
      >
        <Briefcase className="h-4 w-4" strokeWidth={2.25} />
        Criar carteira
      </Link>
    </div>
  );
}

// ─── Loading ────────────────────────────────────────────────────────────────

function LoadingCard({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-6",
        className
      )}
    >
      <Skeleton className="h-3 w-20 mb-4" />
      <Skeleton className="h-4 w-48 mb-5" />
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-40 mb-4" />
      <Skeleton className="h-10 w-full" roundedMd />
    </div>
  );
}

// ─── Error ──────────────────────────────────────────────────────────────────

function ErrorCard({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-6",
        className
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">
        Carteira
      </div>
      <p className="text-[15px] text-foreground leading-snug">
        Não foi possível carregar sua carteira.
      </p>
      <p className="mt-2.5 text-[13px] text-muted-foreground/85">
        Tente recarregar a página.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={cn(
          "mt-5 inline-flex items-center justify-center gap-1.5 w-full h-10",
          "rounded-md border border-white/10 bg-white/[0.04]",
          "text-[13px] font-medium text-foreground",
          "hover:bg-white/[0.08] transition-colors cursor-pointer"
        )}
      >
        Recarregar
      </button>
    </div>
  );
}
