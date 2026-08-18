"use client";

/**
 * NewsCard — vertical news feed filtered to this ticker.
 *
 *  - Tabs: All · Press · Analysis
 *  - 3-5 cards, each with headline + source + time-ago
 *  - Uses /api/news/multi/[tickers]?tickers=SYM to scope results
 *    to the current ticker.
 *
 *  The "Press" / "Analysis" tabs are filtered client-side by
 *  `category` and source heuristics (B3 press releases vs analyst
 *  sites). The "All" tab shows everything.
 */

import useSWR from "swr";
import { motion } from "motion/react";
import { useMemo, useState, useEffect } from "react";
import { ExternalLink, Clock } from "lucide-react";
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
    if (tab === "all") return all.slice(0, 5);
    return all.filter((n) => classify(n) === tab).slice(0, 5);
  }, [all, tab]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
      className="h-fit"
    >
      <div className="rounded-2xl border border-border/60 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #08090c 0%, #15161b 30%, #0d0e12 55%, #1c1d22 80%, #07080b 100%)",
        }}
      >
        <header className="px-5 pt-4 pb-3 border-b border-border/40 flex items-center justify-between">
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

        <div className="divide-y divide-border/40">
          {isLoading ? (
            <div className="px-5 py-6 text-center text-[12px] text-muted-foreground/60">
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-6 text-center text-[12px] text-muted-foreground/60">
              Sem notícias {tab !== "all" ? `em ${tab}` : ""} para {symbol}.
            </div>
          ) : (
            items.map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-3 hover:bg-foreground/[0.03] transition-colors group"
              >
                <p className="text-[13px] text-foreground/90 leading-snug line-clamp-2 group-hover:text-foreground transition-colors">
                  {stripHtml(n.headline)}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="truncate max-w-[140px]">{n.source}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {mounted ? timeAgo(n.datetime) : ""}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-40 group-hover:opacity-100" />
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}