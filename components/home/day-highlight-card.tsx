"use client";

/**
 * DayHighlightCard — card "Notícia do dia" (sub-card da coluna esquerda).
 *
 * Mostra a notícia mais relevante do dia com headline, source, e link.
 * Quando vazio, mostra placeholder.
 */

import { Calendar, Newspaper } from "lucide-react";
import type { JSX } from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

export type DayHighlightProps = {
  /** Headline da notícia principal. Null = sem destaque ainda. */
  headline: string | null;
  /** Fonte. */
  source: string | null;
  /** Data em PT-BR (DD/MM/YYYY). */
  dateText: string;
  /** URL externa. */
  url: string | null;
  /** Quantos materiais relacionados existem. */
  relatedCount?: number;
  loading?: boolean;
  className?: string;
};

export function DayHighlightCard({
  headline,
  source,
  dateText,
  url,
  relatedCount,
  loading,
  className,
}: DayHighlightProps): JSX.Element {
  if (loading) return <LoadingCard className={className} />;

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

      {headline && source && url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <h3 className="text-[17px] font-semibold text-foreground leading-snug group-hover:text-foreground/90 transition-colors">
            {headline}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground/70 tabular-nums">
            <Newspaper className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="font-medium uppercase tracking-wide">
              {source}
            </span>
            {relatedCount != null && relatedCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{relatedCount} materiais</span>
              </>
            )}
          </div>
        </a>
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

function LoadingCard({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] p-6",
        className
      )}
    >
      <Skeleton className="h-3 w-28 mb-5" />
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-2/3 mb-4" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
