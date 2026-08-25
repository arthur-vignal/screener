"use client";

/**
 * NewsCard — vertical news feed filtered to this ticker.
 *
 *  Per the Fey (Mobbin) reference: 1 card per article, no mega-list.
 *  Each card has:
 *    - source logo (circular, colored by source-hash)
 *    - headline with inline ticker chips (PETR4 / VALE3 → clickable)
 *    - source name + relative time + external link icon
 *
 *  Filter chips above the feed: All · Press · Analysis.
 *  The "Daily recap" hero card was intentionally NOT added — we don't
 *  have an LLM-generated summary yet.
 */

import useSWR from "swr";
import { motion } from "motion/react";
import { useMemo, useState, useEffect } from "react";
import { ExternalLink, Clock } from "lucide-react";
import { tagTickers } from "@/lib/news-tagger";
import { renderHeadline } from "@/components/news/headline-with-tickers";
import { cn } from "@/lib/utils";

type NewsItem = {
  id: number | string;
  headline: string;
  summary?: string;
  source: string;
  url: string;
  datetime: number;
  category?: string;
  relatedTickers?: string[];
};

type Tab = "all" | "press" | "analysis";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "press", label: "Press" },
  { key: "analysis", label: "Analysis" },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRESS_SOURCES = [
  "B3",
  "CVM",
  "Valor",
  "Valor Econômico",
  "Exame",
  "InfoMoney",
  "NeoFeed",
  "Money Times",
];

const ANALYSIS_SOURCES = [
  "Bloomberg",
  "Reuters",
  "Investing.com",
  "Seeking Alpha",
  "ADVFN",
  "Status Invest",
];

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function timeAgo(ts: number): string {
  const ms = Date.now() - ts * 1000;
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(0, min)}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function classify(item: NewsItem): Tab {
  const src = item.source.toLowerCase();
  if (PRESS_SOURCES.some((s) => src.includes(s.toLowerCase()))) return "press";
  if (ANALYSIS_SOURCES.some((s) => src.includes(s.toLowerCase()))) return "analysis";
  return "all";
}

// Stable hash → palette color (matches ticker-chip palette family so the
// source logo and a ticker chip inside the same headline feel related).
function sourceColor(src: string): { bg: string; letter: string } {
  const PALETTE: Array<{ bg: string; letter: string }> = [
    { bg: "#10b981", letter: "#ffffff" }, // emerald
    { bg: "#3b82f6", letter: "#ffffff" }, // blue
    { bg: "#a855f7", letter: "#ffffff" }, // purple
    { bg: "#f43f5e", letter: "#ffffff" }, // rose
    { bg: "#f59e0b", letter: "#0a0a0a" }, // amber
    { bg: "#06b6d4", letter: "#ffffff" }, // cyan
    { bg: "#ec4899", letter: "#ffffff" }, // pink
    { bg: "#6366f1", letter: "#ffffff" }, // indigo
    { bg: "#14b8a6", letter: "#ffffff" }, // teal
    { bg: "#f97316", letter: "#ffffff" }, // orange
  ];
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function SourceLogo({ source }: { source: string }) {
  const letter = source.trim().charAt(0).toUpperCase() || "?";
  const c = sourceColor(source);
  return (
    <div
      aria-hidden
      className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-[13px] font-semibold tracking-tight"
      style={{ background: c.bg, color: c.letter }}
    >
      {letter}
    </div>
  );
}

export function NewsCard({ symbol }: { symbol: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [mounted, setMounted] = useState(false);
  // mounted gates the time-ago render so SSR and CSR match (avoids
  // hydration mismatch when the diff would otherwise be "5min" vs "").
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useSWR<{ news: NewsItem[] }>(
    `/api/news/multi/${encodeURIComponent(symbol)}?tickers=${encodeURIComponent(symbol)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const all = data?.news ?? [];

  const items = useMemo(() => {
    // Per-ticker news feed is sparse — fetchNewsForTickers pulls 10 per
    // ticker but the upstream Google News query rarely returns that many
    // for a single B3 stock. Show everything we got rather than
    // capping at 5, which would leave the card looking empty.
    if (tab === "all") return all;
    return all.filter((n) => classify(n) === tab);
  }, [all, tab]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
      className="h-full flex flex-col"
    >
      {/* Header strip: title + filter chips (flat, no inner card) */}
      <header className="px-1 pb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60">
          Notícias · {symbol}
        </h2>
        <div className="flex items-center gap-1 p-0.5 rounded-full border border-border/60 bg-background/40">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 h-6 rounded-full text-[10.5px] tracking-wide transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Feed: each article = its own flat card. Scroll lives on this
          container so the section grows with content but doesn't push
          the page into a giant empty area below the chart. */}
      <div
        className="flex-1 overflow-y-auto space-y-2 pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-6 text-center text-[12px] text-muted-foreground/60">
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-6 text-center text-[12px] text-muted-foreground/60">
            Sem notícias {tab !== "all" ? `em ${tab}` : ""} para {symbol}.
          </div>
        ) : (
          items.map((n) => {
            const headline = stripHtml(n.headline);
            const matches = tagTickers(headline).matches;
            return (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-border/60 bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-border transition-colors px-4 py-3.5"
              >
                <div className="flex items-start gap-3">
                  <SourceLogo source={n.source} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-foreground/90 group-hover:text-foreground transition-colors">
                      {renderHeadline(headline, matches)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <span className="truncate max-w-[160px]">{n.source}</span>
                      <span aria-hidden className="opacity-40">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {mounted ? timeAgo(n.datetime) : ""}
                      </span>
                      <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-40 group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </motion.section>
  );
}