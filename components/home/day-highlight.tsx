"use client";

/**
 * DayHighlight — Fey-style card showing the "top story of the day".
 *
 * Pulls the most recent news item from /api/news/multi and renders
 * it as a large feature card with source + time-ago + ticker chips.
 */

import { motion } from "motion/react";
import useSWR from "swr";
import { ArrowUpRight } from "lucide-react";

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

export function DayHighlight() {
  const { data } = useSWR<{ news: NewsItem[] }>(
    `/api/news/multi`,
    fetcher,
  );
  const top = (data?.news ?? [])[0];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/5">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.20em] text-muted-foreground">
            Data do dia
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
            principal notícia do dia
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        {!top && (
          <p className="text-center text-[12px] text-muted-foreground py-6">
            Carregando...
          </p>
        )}
        {top && (
          <motion.a
            href={top.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="block group cursor-pointer"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {top.source}
            </p>
            <p
              className="text-[20px] leading-[1.25] text-foreground group-hover:text-white transition-colors"
              style={{
                fontFamily: "var(--font-archivo-black), Manrope, sans-serif",
                fontWeight: 400,
                letterSpacing: "-0.01em",
              }}
            >
              {stripHtml(top.headline)}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                abrir materia
              </span>
              {top.relatedTickers?.slice(0, 3).map((tk) => (
                <span
                  key={tk}
                  className="px-1.5 py-0.5 rounded-full bg-white/5 text-[10px] uppercase tracking-wider"
                >
                  {tk}
                </span>
              ))}
            </div>
          </motion.a>
        )}
      </div>
    </div>
  );
}