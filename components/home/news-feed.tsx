"use client";

/**
 * NewsFeed — feed vertical de notícias (coluna direita da /home).
 *
 * Pack 06 do chart-pack-references (SMCI card):
 *   - Ticker chip (canto sup. esquerdo, clicável → /asset/[ticker])
 *   - Preço + variação (canto sup. direito)
 *   - Headline em destaque (corpo principal, bold ~14px)
 *   - Source · tempo na linha de metadata
 *
 * Fonte de preço: vem do parent /home via prop `priceIndex` (Map<symbol,
 * {price, changePercent}>). Construído uma vez no /home a partir do
 * /api/assets/quote?type=stock&page=1 — sem requests extra.
 *
 * Sem flag de preço: o card renderiza sem chip de preço (apenas ticker)
 * pra evitar rejete e manter o pack 06 honesto.
 *
 * Infinite scroll cursor (igual antes).
 */

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { JSX } from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { getBrandColor } from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  /** ISO timestamp. */
  publishedAt: string;
  /** Absolute URL — link out. */
  url: string;
  /** B3 ticker pattern extracted from title (PETR4, VALE3). */
  ticker?: string;
  /** Preço atual do ticker (server-side brapi batch). */
  price?: number;
  /** Variação % desde abertura (server-side brapi batch, em FRAÇÃO: 0.024 = +2.4%). */
  changePercent?: number;
};

export type PriceIndex = Map<string, { price: number; changePercent: number }>;

type Props = {
  items: NewsItem[];
  loading?: boolean;
  loadingMore?: boolean;
  onRetry?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  /** Optional index of ticker → price/variation for the card header. */
  priceIndex?: PriceIndex;
  className?: string;
};

export function NewsFeed({
  items,
  loading,
  loadingMore,
  onRetry,
  onLoadMore,
  hasMore,
  priceIndex,
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

      {/* Body — rola dentro do card */}
                  <div
                    className="flex-1 p-2 overflow-y-auto no-scrollbar"
                    style={{ scrollbarWidth: "none" }}
                  >
        {loading ? (
          <LoadingList />
        ) : items.length === 0 ? (
          <EmptyState onRetry={onRetry} />
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <NewsCard item={item} priceIndex={priceIndex} />
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

// ─── Card (pack 06) ──────────────────────────────────────────────────────────

function NewsCard({
  item, priceIndex,
}: { item: NewsItem; priceIndex?: PriceIndex }): JSX.Element {
  const time = formatRelative(item.publishedAt);
  // Preço vem do servidor (brapi batch via lib/news-aggregator). Só cai pro
  // priceIndex se o servidor não retornou (graceful fallback).
  const indexed = item.ticker ? priceIndex?.get(item.ticker) : undefined;
  const price = item.price ?? indexed?.price;
  const change = item.changePercent ?? indexed?.changePercent;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg p-3.5 group transition-colors",
        "hover:bg-white/[0.02]",
      )}
    >
      {/* Linha 1: ticker chip à esquerda + preço/variação à direita */}
      {(item.ticker || price != null) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {item.ticker && (
              // Ticker chip com liquid glass da cor da marca (mesma cor do
              // glow background em /asset/[ticker]). `getBrandColor` cobre
              // ~17 tickers IBOVESPA; resto usa slate-600 fallback.
              <BrandTickerChip ticker={item.ticker} />
            )}
          </div>
          {price != null && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[12px] font-semibold tabular-nums text-foreground">
                {price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {change != null && (
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded-md",
                    "text-[10px] font-semibold tabular-nums",
                    change >= 0
                      ? "bg-[#d84f68]/20 text-[#d84f68]"
                      : "bg-[#4dbe95]/20 text-[#4dbe95]",
                  )}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Headline */}
      <p className="text-[14px] font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-foreground/90">
        {item.title}
      </p>

      {/* Metadata */}
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 tabular-nums">
        <span className="font-medium uppercase tracking-wide">{item.source}</span>
        <span aria-hidden>·</span>
        <span>{time}</span>
        <ExternalLink
          className="ml-auto h-3 w-3 text-muted-foreground/40 shrink-0"
          strokeWidth={2}
        />
      </div>
    </a>
  );
}

/**
 * Ticker chip com efeito liquid glass da cor dominante do ticker.
 *
 * Mesma cor do glow background em `/asset/[ticker]` (mesmo getBrandColor).
 *
 * Implementação:
 *   - bg: linear-gradient vertical com 18% / 8% da cor da marca
 *   - border: 1px solid 28% da cor da marca
 *   - backdrop-filter: blur(8px) (liquid glass)
 *   - hover: opacity sobe (sem mudar cor)
 */
function BrandTickerChip({ ticker }: { ticker: string }): JSX.Element {
  const hex = getBrandColor(ticker);
  return (
    <Link
      href={`/asset/${ticker}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        // liquid glass usando color-mix direto (não via variável CSS)
        // pra evitar flash de cor fallback enquanto o CSS variables carrega
        background: `linear-gradient(180deg, ${hex}2e 0%, ${hex}14 100%)`,
        borderColor: `${hex}47`,
      }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "backdrop-blur-md",
        "border",
        "text-[11px] font-semibold tracking-tight",
        "text-foreground transition-all duration-150",
        "hover:opacity-80",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/30",
      )}
      title={`Ver ${ticker}`}
    >
      {ticker}
    </Link>
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
