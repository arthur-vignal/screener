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
        "rounded-2xl border border-white/10 bg-[#101116] p-5",
        className
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
        Carteira
      </div>

      <p className="text-[14px] text-foreground leading-snug">
        {greeting()},{" "}
        <span className="font-semibold">{state.name}</span>.
      </p>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85 mb-1">
          Patrimônio
        </div>
        <div className="text-[28px] font-semibold tabular-nums text-foreground leading-none">
          {valueFormatted}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[12px]">
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
          "mt-5 inline-flex items-center justify-center gap-1.5 w-full h-9",
          "rounded-md border border-white/10 bg-white/[0.04]",
          "text-[12px] font-medium text-foreground",
          "hover:bg-white/[0.08] hover:border-white/20",
          "transition-colors"
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
        "rounded-2xl border border-white/10 bg-[#101116] p-5",
        className
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
        Carteira
      </div>

      <p className="text-[14px] text-foreground leading-snug">
        {greeting()}{name ? `, ${name}` : ""}.
      </p>

      <p className="mt-3 text-[13px] text-muted-foreground/85 leading-relaxed">
        Você ainda não tem uma carteira. Crie uma pra acompanhar seus
        ativos e ver a valorização em tempo real.
      </p>

      <Link
        href="/portfolio/new"
        className={cn(
          "mt-5 inline-flex items-center justify-center gap-1.5 w-full h-9",
          "rounded-md bg-[var(--primary)] text-[#070709]",
          "text-[12px] font-semibold",
          "hover:opacity-90 transition-opacity"
        )}
      >
        <Briefcase className="h-3.5 w-3.5" strokeWidth={2.25} />
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
        "rounded-2xl border border-white/10 bg-[#101116] p-5",
        className
      )}
    >
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-7 w-32 mb-3" />
      <Skeleton className="h-9 w-full" roundedMd />
    </div>
  );
}

// ─── Error ──────────────────────────────────────────────────────────────────

function ErrorCard({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-5",
        className
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
        Carteira
      </div>
      <p className="text-[14px] text-foreground leading-snug">
        Não foi possível carregar sua carteira.
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground/85">
        Tente recarregar a página.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={cn(
          "mt-4 inline-flex items-center justify-center gap-1.5 w-full h-9",
          "rounded-md border border-white/10 bg-white/[0.04]",
          "text-[12px] font-medium text-foreground",
          "hover:bg-white/[0.08] transition-colors"
        )}
      >
        Recarregar
      </button>
    </div>
  );
}
