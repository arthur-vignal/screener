"use client";

/**
 * NewsFeed — feed vertical de notícias (coluna direita da /home).
 *
 * Versão minimalista (2026-09-02): sem ticker detection, sem regex, sem
 * tagger, sem ícones de marca. Cada card tem só:
 *   - título (link externo, abre em nova aba)
 *   - fonte · tempo relativo
 *
 * Fontes via Google News RSS → `lib/google-news.ts` → `/api/news/multi`.
 *
 * Infinite scroll por IntersectionObserver no sentinel (alinhado com o
 * fim do card de cotações na coluna central). Sem barra de scroll visível
 * no aside — apenas overflow natural.
 */

import { ExternalLink } from "lucide-react";
import type { JSX } from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  /** ISO timestamp. */
  publishedAt: string;
  /** Absolute URL — link out. */
  url: string;
};

type Props = {
  items: NewsItem[];
  loading?: boolean;
  loadingMore?: boolean;
  onRetry?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
};

export function NewsFeed({
  items,
  loading,
  loadingMore,
  onRetry,
  onLoadMore,
  hasMore,
  className,
}: Props): JSX.Element {
  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border border-white/10 bg-[#101116] overflow-hidden",
        className,
      )}
      aria-label="Feed de notícias"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
          Notícias da B3
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground/70">
          Portais verificados · Google News
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-2">
        {loading ? (
          <LoadingList />
        ) : items.length === 0 ? (
          <EmptyState onRetry={onRetry} />
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <NewsCard item={item} />
              </li>
            ))}
          </ul>
        )}

        {/* Infinite-scroll sentinel + loader */}
        {!loading && items.length > 0 && hasMore && (
          <div className="px-4 py-3 flex items-center justify-center">
            {loadingMore ? (
              <Skeleton className="h-3 w-32" />
            ) : (
              <button
                type="button"
                onClick={onLoadMore}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Carregar mais
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: NewsItem }): JSX.Element {
  const time = formatRelative(item.publishedAt);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg p-3.5",
        "hover:bg-white/[0.02]",
        "transition-colors group",
      )}
    >
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground leading-snug line-clamp-2 group-hover:text-foreground/90">
            {item.title}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 tabular-nums">
            <span className="font-medium uppercase tracking-wide">
              {item.source}
            </span>
            <span aria-hidden="true">·</span>
            <span>{time}</span>
          </div>
        </div>

        <ExternalLink
          className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1"
          strokeWidth={2}
        />
      </div>
    </a>
  );
}

// ─── Loading ────────────────────────────────────────────────────────────────

function LoadingList(): JSX.Element {
  return (
    <ul className="space-y-2 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex gap-3 p-2.5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Empty ──────────────────────────────────────────────────────────────────

function EmptyState({ onRetry }: { onRetry?: () => void }): JSX.Element {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-[14px] text-foreground">
        Sem notícias no momento.
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground/85">
        Os portais verificados ainda não publicaram nada hoje.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-4 inline-flex items-center justify-center h-9 px-3 rounded-md",
            "border border-white/10 bg-white/[0.04]",
            "text-[12px] font-medium text-foreground",
            "hover:bg-white/[0.08] transition-colors",
          )}
        >
          Recarregar
        </button>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
