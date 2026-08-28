"use client";

/**
 * NewsFeed — feed vertical de notícias (coluna direita da /home).
 *
 * Cards estilo Fey:
 *   - Avatar circular colorido com primeira letra do ticker principal
 *   - Headline (14px, 2 linhas max truncate)
 *   - SOURCE • timestamp (muted, 11px)
 *   - Link externo no canto
 *
 * Layout scroll independente (não rola com a página central).
 * Loading: skeleton com 5-6 cards de mesma forma.
 * Empty: "Sem notícias no momento."
 * Error: mensagem + retry.
 */

import { ExternalLink } from "lucide-react";
import type { JSX } from "react";

import { BrandLetter } from "@/components/foundation/brand-letter";
import { Skeleton } from "@/components/foundation/skeleton";
import { TickerLogo } from "@/components/foundation/ticker-logo";
import { cn } from "@/lib/utils";

export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  /** ISO timestamp. */
  publishedAt: string;
  /** URL externo (link out). */
  url: string;
  /** Tickers mencionados (1 ou 2 principais exibidos). */
  tickers: string[];
};

type Props = {
  items: NewsItem[];
  loading?: boolean;
  onRetry?: () => void;
  className?: string;
  /** Limite de itens renderizados. Default: 8 (cabe sem scroll em ~1080p). */
  maxItems?: number;
};

export function NewsFeed({
  items,
  loading,
  onRetry,
  className,
  maxItems = 8,
}: Props): JSX.Element {
  const visible = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border border-white/10 bg-[#101116] overflow-hidden",
        className
      )}
      aria-label="Feed de notícias"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
          Notícias da B3
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground/70">
          Portais verificados
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-2">
        {loading ? (
          <LoadingList />
        ) : visible.length === 0 ? (
          <EmptyState onRetry={onRetry} />
        ) : (
          <ul className="space-y-1">
            {visible.map((item) => (
              <li key={item.id}>
                <NewsCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasMore && !loading && (
        <div className="px-5 py-3 border-t border-border/40">
          <a
            href="/news"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todas as notícias →
          </a>
        </div>
      )}
    </aside>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: NewsItem }): JSX.Element {
  const primary = item.tickers[0] ?? null;
  const time = formatRelative(item.publishedAt);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg p-3.5",
        "hover:bg-white/[0.02]",
        "transition-colors group"
      )}
    >
      <div className="flex gap-3">
        {primary ? (
          <TickerLogo symbol={primary} size="md" className="mt-0.5" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-white/[0.04] shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground leading-snug line-clamp-2 group-hover:text-foreground/90">
            {item.headline}
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
          <Skeleton roundedFull className="h-10 w-10 shrink-0" />
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
            "hover:bg-white/[0.08] transition-colors"
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
