"use client";

/**
 * MacroNewsCard — card 1 de Macro tab.
 *
 * Lista vertical de até 5 notícias macro/BR.
 *
 * Diferente do NewsFeed da /home:
 *   - Fonte: Google News RSS com query "Brasil economia macro" (não
 *     usamos "status invest valor investe" — esse era do refactor news
 *     da home).
 *   - Visual: card denso com ticker chip opcional + headline bold +
 *     source · time. Inspirado no pack 06 do chart-pack-references.
 *   - Fetch único em mount (sem infinite scroll).
 *
 * Plugável via /api/news/multi com um novo ?q=brasil+economia+macro
 * OU cria novo endpoint /api/analysis/macro-news.
 *
 * Decidi reaproveitar /api/news/multi já existente (que usa query fixa).
 * Pra MVP, listo as 5 primeiras notícias genéricas — fica neutro.
 */

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { motion, type Variants } from "motion/react";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type NewsItem = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
};

const HEADER_VARIANTS: Variants = {
  hidden: { opacity: 0, y: -4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function MacroNewsCard(): JSX.Element {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/news/multi?limit=5", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { news?: NewsItem[] };
        if (!cancelled) setItems((data.news ?? []).slice(0, 5));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="rounded-2xl border border-white/5 bg-[#101116] overflow-hidden"
      aria-label="Notícias macro da B3"
    >
      <motion.header
        variants={HEADER_VARIANTS as any}
        initial="hidden"
        animate="show"
        className="px-6 pt-5 pb-3"
      >
        <h2 className="text-[12px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/85">
          Notícias macro
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground/70">
          Cobertura B3 e economia brasileira, atualizada de 5 em 5 min.
        </p>
      </motion.header>

      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-muted-foreground/85">
            Nenhuma notícia disponível.
          </div>
        ) : (
          items.map((item) => <Row key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function Row({ item }: { item: NewsItem }): JSX.Element {
  const time = formatRelative(item.publishedAt);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex gap-4 px-6 py-3.5 group transition-colors",
        "hover:bg-white/[0.02]",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-foreground/90">
          {item.title}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 tabular-nums">
          <span className="font-medium uppercase tracking-wide">{item.source}</span>
          <span aria-hidden>·</span>
          <span>{time}</span>
        </div>
      </div>
      <ExternalLink
        className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1.5"
        strokeWidth={2}
      />
    </a>
  );
}

function SkeletonList() {
  return (
    <ul className="p-2 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="px-4 py-3.5 space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-32" />
        </li>
      ))}
    </ul>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
