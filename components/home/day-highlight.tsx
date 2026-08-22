"use client";

/**
 * DayHighlight — Fey-style "top story of the day" card.
 *
 * Pulls the most recent news item from /api/news/multi and
 * renders it as a featured card with source + headline +
 * related tickers.
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import useSWR from "swr";
import { MetallicCard } from "@/components/ui/metallic-card";
import { ArrowUpRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NewsItem = {
  id: number | string;
  headline: string;
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { data } = useSWR<{ news: NewsItem[] }>(`/api/news/multi`, fetcher);
  const top = (data?.news ?? [])[0];

  return (
    <MetallicCard className="h-full">
      <div className="px-2 pt-5 pb-3 border-b border-border">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Data do dia
        </p>
        <p className="text-[12.5px] text-foreground/85 mt-1 tabular-nums">
          {mounted
            ? new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : ""}
        </p>
      </div>

      <div className="flex-1 px-2 py-5">
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
          variants={{
            hidden: { opacity: 0, y: 6 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
          }}
          className="block group h-full"
        >
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {top.source}
            </p>
            <p className="text-[20px] leading-[1.3] text-foreground group-hover:text-foreground/95 transition-colors font-medium tracking-tight">
              {stripHtml(top.headline)}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                abrir materia
              </span>
              {top.relatedTickers?.slice(0, 3).map((tk) => (
                <span
                  key={tk}
                  className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wider text-foreground/80"
                >
                  {tk}
                </span>
              ))}
            </div>
          </motion.a>
        )}
      </div>
    </MetallicCard>
  );
}