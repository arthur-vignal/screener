"use client";

/**
 * NewsSummaryCard — card de news à direita do gráfico (estilo Fey TSLA).
 *
 * Visual:
 *   ┌─────────────────────────────────────┐
 *   │ News summary              [⛶]      │
 *   │                                     │
 *   │ ─── "Tesla to acquire German..."   │
 *   │                                     │
 *   │ News summarized today at 2:58 PM   │
 *   └─────────────────────────────────────┘
 *   [News] [KPIs] [About]      ← tabs embaixo
 */

import { Maximize2 } from "lucide-react";
import { useState } from "react";
import type { JSX } from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { renderHeadline } from "@/components/news/headline-with-tickers";
import { cn } from "@/lib/utils";

export type NewsSummaryItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  /** ISO timestamp. */
  publishedAt: string;
  /** Tickers mencionados — usado pra chips clicáveis no headline. */
  tickers?: string[];
};

type Tab = "news" | "kpis" | "about";

type Props = {
  items: NewsSummaryItem[];
  loading?: boolean;
  className?: string;
};

export function NewsSummaryCard({
  items,
  loading,
  className,
}: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>("news");

  const primary = items[0] ?? null;
  const lastUpdate = primary
    ? new Date(primary.publishedAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    : null;

  return (
    <div className={cn("flex flex-col h-full min-h-[560px]", className)}>
      {/* Card */}
      <div className="flex-1 rounded-2xl border border-white/10 bg-[#101116] p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[12px] font-semibold text-foreground">
            News summary
          </div>
          <button
            type="button"
            aria-label="Expandir"
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md",
              "text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground",
              "transition-colors cursor-pointer"
            )}
          >
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1">
          {loading ? (
            <NewsLoadingBody />
          ) : primary ? (
            <article>
              <h3 className="text-[15px] font-medium text-foreground leading-snug pl-3 border-l-2 border-white/30">
                {renderHeadlineWithChips(primary.title, primary.tickers)}
              </h3>
              {primary.summary && (
                <p className="mt-2.5 text-[12.5px] text-muted-foreground/85 leading-relaxed">
                  {primary.summary}
                </p>
              )}
            </article>
          ) : (
            <div className="text-center py-8">
              <p className="text-[13px] text-muted-foreground/85">
                Sem notícias no momento.
              </p>
            </div>
          )}
        </div>

        {/* Footer do card */}
        {primary && lastUpdate && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground/70">
              News summarized today at {lastUpdate}
            </p>
          </div>
        )}
      </div>

      {/* Tabs embaixo */}
      <div className="mt-3 flex items-center gap-1">
        <TabPill active={tab === "news"} onClick={() => setTab("news")}>
          News
        </TabPill>
        <TabPill active={tab === "kpis"} onClick={() => setTab("kpis")}>
          KPIs
        </TabPill>
        <TabPill active={tab === "about"} onClick={() => setTab("about")}>
          About
        </TabPill>
      </div>
    </div>
  );
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-colors",
        active
          ? "bg-white/[0.04] text-foreground border border-white/10"
          : "text-muted-foreground/70 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function NewsLoadingBody(): JSX.Element {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-10/12" />
      <Skeleton className="h-3 w-3/4 mt-3" />
    </div>
  );
}

function renderHeadlineWithChips(
  title: string,
  tickers: string[] | undefined,
): React.ReactNode {
  // Só renderiza chip se o servidor mandou tickers. NÃO roda tagTickers
  // no client (mesma justificativa do NewsFeed — varreria 500+ regex
  // tests da B3 inteira, combinado com onError do TickerLogo causava
  // travamento no /home). Sem chip → headline pura.
  const matches =
    tickers && tickers.length > 0
      ? matchTickersInText(title, tickers)
      : [];
  if (matches.length === 0) return title;
  return renderHeadline(title, matches);
}

function matchTickersInText(
  text: string,
  symbols: string[],
): { symbol: string; start: number; end: number }[] {
  const out: { symbol: string; start: number; end: number }[] = [];
  const seen = new Set<number>();
  for (const symbol of symbols) {
    const re = new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (!seen.has(m.index)) {
        seen.add(m.index);
        out.push({ symbol, start: m.index, end: m.index + m[0].length });
      }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
