"use client";

/**
 * DayHighlightCard — card "Notícia do dia" (sub-card da coluna esquerda).
 *
 * Mostra a notícia cujo ticker tem o maior volume negociado no dia
 * (commit 2 — 2026-09-06). Quando vazio, mostra placeholder.
 *
 * Chip do ticker (cor da marca via `BrandTickerChip` do news-feed)
 * + headline + fonte + volume negociado.
 */

import { Calendar, Newspaper, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { JSX } from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { getBrandColor } from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

export type DayHighlightProps = {
  /** Ticker destacado (null = sem destaque). */
  ticker: string | null;
  /** Long name do ticker (ex: "Petrobras PN"). */
  longName: string | null;
  /** Volume negociado em BRL. Null se sem match de volume. */
  volume: number | null;
  /** Headline da notícia. */
  headline: string | null;
  /** Fonte. */
  source: string | null;
  /** Data em PT-BR (DD/MM/YYYY). */
  dateText: string;
  /** URL externa da notícia. */
  url: string | null;
  loading?: boolean;
  className?: string;
};

export function DayHighlightCard({
  ticker,
  longName,
  volume,
  headline,
  source,
  dateText,
  url,
  loading,
  className,
}: DayHighlightProps): JSX.Element {
  if (loading) return <LoadingCard className={className} />;

  const hasContent = headline && source && url;
  const volumeLabel = formatVolume(volume);

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-6",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
          Notícia do dia
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/70 tabular-nums">
          <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
          {dateText}
        </div>
      </div>

      {hasContent ? (
        <div>
          {/* Ticker chip + volume (se houver) */}
          {ticker && (
            <div className="flex items-center justify-between gap-2 mb-3">
              <BrandTickerChip ticker={ticker} longName={longName} />
              {volumeLabel && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold tabular-nums text-muted-foreground">
                  <TrendingUp className="h-3 w-3" strokeWidth={2} />
                  {volumeLabel}
                </span>
              )}
            </div>
          )}

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <h3 className="text-[16px] font-semibold text-foreground leading-snug group-hover:text-foreground/90 transition-colors">
              {headline}
            </h3>
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground/70 tabular-nums">
              <Newspaper className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="font-medium uppercase tracking-wide">
                {source}
              </span>
            </div>
          </a>
        </div>
      ) : (
        <div className="py-7 text-center">
          <p className="text-[14px] text-muted-foreground/85">
            Sem destaque do dia ainda.
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground/60">
            Os portais publicam destaques ao longo do pregão.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatVolume(v: number | null): string | null {
  if (v == null || v <= 0) return null;
  // Brapi retorna volume em BRL (financialVolume). Ex: PETR4 ~R$ 1bi/dia.
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(2)}bi`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

/** Ticker chip liquid glass com cor da marca (mesmo padrão do news-feed). */
function BrandTickerChip({
  ticker,
  longName,
}: {
  ticker: string;
  longName: string | null;
}): JSX.Element {
  const hex = getBrandColor(ticker);
  return (
    <Link
      href={`/asset/${ticker}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: `linear-gradient(180deg, ${hex}2e 0%, ${hex}14 100%)`,
        borderColor: `${hex}47`,
      }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "backdrop-blur-md border",
        "hover:opacity-80 transition-opacity"
      )}
      title={longName ?? ticker}
    >
      <span className="text-[11px] font-semibold tracking-tight text-foreground">
        {ticker}
      </span>
      {longName && (
        <span className="text-[10.5px] text-muted-foreground/85 truncate max-w-[140px]">
          {longName}
        </span>
      )}
    </Link>
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
      <Skeleton className="h-3 w-28 mb-5" />
      <Skeleton className="h-5 w-24 mb-3" />
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-2/3 mb-4" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}