"use client";

/**
 * PortfolioCard — hero card da coluna esquerda da /home.
 *
 * Layout (commit 1 — 2026-09-06):
 *   - Header: "Seu portfolio valorizou x%" + chip liquid glass
 *     color coded da variação (verde/vermelho muted)
 *   - Chart preview do último pregão (pack 05 — linha branca +
 *     gradient verde/vermelho relativo ao valor inicial)
 *   - Lista top-3 holdings com dropdown "24h var" / "Alocação"
 *   - CTA "Acessar portfólio"
 *
 * Estados:
 *   - loading: skeleton com forma do conteúdo
 *   - empty:   sem portfólio → CTA "Criar carteira"
 *   - ready:   novo layout
 *   - error:   mensagem + retry
 */

import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowDown, Briefcase } from "lucide-react";
import type { JSX } from "react";

import { PortfolioPreviewChart } from "@/components/home/portfolio-preview-chart";
import { Skeleton } from "@/components/foundation/skeleton";
import {
  PortfolioTopHoldings,
  type TopHolding,
} from "@/components/home/portfolio-top-holdings";
import { cn } from "@/lib/utils";

export type PreviewPoint = { ts: number; value: number };

export type PortfolioCardState =
  | { kind: "loading" }
  | { kind: "empty"; name: string | null }
  | {
      kind: "ready";
      name: string;
      initialValue: number;
      totalValue: number;
      changeToday: number;
      changeTodayPercent: number;
      currency: "BRL" | "USD";
      holdings: TopHolding[];
      preview: PreviewPoint[];
    }
  | { kind: "error" };

type Props = {
  state: PortfolioCardState;
  className?: string;
};

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

  const pct = state.changeTodayPercent;
  const positive = pct >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  // Liquid glass color coded: fundo muted da cor + texto na cor cheia
  const chipBg = positive
    ? "bg-[var(--positive-soft)] text-[var(--positive)]"
    : "bg-[var(--negative-soft)] text-[var(--negative)]";

  return (
    <div
      className={cn(
        "rounded-2xl fey-card p-6 flex flex-col gap-5",
        className
      )}
    >
      {/* Header: "Carteira" eyebrow + saudação nova */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">
          Carteira
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-[16px] font-medium text-foreground leading-snug max-w-[200px]">
            Seu portfolio valorizou{" "}
            <span
              className={cn(
                "inline-flex items-center gap-1 align-middle px-2 py-0.5 rounded-full text-[13px] font-semibold tabular-nums backdrop-blur-md",
                chipBg
              )}
            >
              <Icon className="h-3 w-3" strokeWidth={2.5} />
              {positive ? "+" : "−"}
              {Math.abs(pct).toFixed(2)}%
            </span>{" "}
            hoje
          </h2>
        </div>

        <div className="mt-4 text-[28px] font-semibold tabular-nums text-foreground leading-none tracking-tight">
          {valueFormatted}
        </div>
      </div>

      {/* Chart preview do último pregão (pack 05 — gradient relativo ao initialValue) */}
            {state.preview.length >= 2 && (
              <div
                className={cn(
                  "rounded-lg px-3 py-2.5 border",
                  positive
                    ? "bg-[var(--positive-soft)] border-[var(--positive)]/15"
                    : "bg-[var(--negative-soft)] border-[var(--negative)]/15"
                )}
              >
                <PortfolioPreviewChart
                                  points={state.preview}
                                  initialValue={state.initialValue}
                                  height={56}
                                />
              </div>
            )}

      {/* Top 3 holdings */}
      <PortfolioTopHoldings holdings={state.holdings} />

      {/* CTA */}
      <Link
        href="/portfolio"
        className={cn(
          "mt-auto inline-flex items-center justify-center gap-1.5 w-full h-10",
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
        "rounded-2xl fey-card p-6",
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
        "rounded-2xl fey-card p-6 flex flex-col gap-5",
        className
      )}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-12 w-full" roundedMd />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-full" roundedMd />
    </div>
  );
}

// ─── Error ──────────────────────────────────────────────────────────────────

function ErrorCard({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl fey-card p-6",
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}