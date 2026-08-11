"use client";

/**
 * NewsWidget — Fey-style vertical feed of recent market news.
 *
 * Fetches /api/news/multi and renders the latest 12 items as
 * stacked cards. Each card shows headline, source, time-ago.
 * Clicking opens the article URL in a new tab.
 */

import { motion } from "motion/react";
import useSWR from "swr";
import { ExternalLink, Clock } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NewsItem = {
  id: number | string;
  headline: string;
  summary?: string;
  source: string;
  url: string;
  datetime: number;
  relatedTickers?: string[];
};

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
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

export function NewsWidget() {
  const { data } = useSWR<{ news: NewsItem[] }>(
    `/api/news/multi`,
    fetcher,
  );
  const items = (data?.news ?? []).slice(0, 14);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/5">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.20em] text-muted-foreground">
            Notícias
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
            e análises
          </p>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-center text-[12px] text-muted-foreground py-8">
            Carregando...
          </p>
        )}
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {items.map((n) => {
            const headline = stripHtml(n.headline);
            return (
              <motion.li
                key={n.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <p className="text-[12.5px] text-foreground/90 leading-snug line-clamp-3 group-hover:text-foreground transition-colors">
                    {headline}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="truncate max-w-[120px]">
                      {n.source}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(n.datetime)}
                    </span>
                    <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-50 group-hover:opacity-100" />
                  </div>
                </a>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </div>
  );
}