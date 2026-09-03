"use client";

/**
 * MacroNewsCard — card 1 de Macro tab.
 *
 * Versão pack 06: card denso com ticker chip + price/variation + headline.
 * Inspirado nos cards de notícia do Fey.
 *
 * Fonte: /api/news/multi (Google News RSS filtrado por "status invest
 * OR valor investe B3 ações"). 5 cards em mount, sem infinite scroll
 * (cards já são curtos; se quiser mais no futuro, ver NewsFeed da /home).
 *
 * Estrutura de cada row (3-col):
 *   [esquerda: seta voltar OU link do ativo]
 *   [center: headline bold + source · time]
 *   [direita: ExternalLink icon (12px)]
 *
 * Header do card segue tipografia pack 02 ("Notícias macro" muted
 * uppercase + sub-linha descritiva).
 *
 * Diferença do pack 06 puro: removi o ticker chip + price porque a
 * fonte de hoje (Google News filtrado por macro BR) não tem tickers
 * específicos — o foco é contexto macro, não ativo. Se quiser
 * restaurar, ler pack 06.
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
        const r = await fetch("/api/news/multi-macro?limit=5", { cache: "no-store" });
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
          Cobertura B3 e economia brasileira · atualizado de 5 em 5 min
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
  // Pack 06: extrai ticker do título (regex captura padrão XXYYZ ex
  // "PETR4", "VALE3", "XP M11"). Se achar, mostra o ticker ao lado do
  // source. Não vira link porque o foco é contexto macro, não navegar
  // pra ativo.
  const ticker = extractTicker(item.title);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block px-6 py-3.5 group transition-colors",
        "hover:bg-white/[0.02]",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Body: headline + metadata */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-foreground/90">
            {item.title}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 tabular-nums">
            <span className="font-medium uppercase tracking-wide">
              {item.source}
            </span>
            {ticker && (
              <>
                <span aria-hidden>·</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] font-semibold text-foreground/85 tabular-nums">
                  {ticker}
                </span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>{time}</span>
          </div>
        </div>

        {/* ExternalLink icon */}
        <ExternalLink
          className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1.5"
          strokeWidth={2}
        />
      </div>
    </a>
  );
}

/**
 * Pack 06 helper: extrai ticker B3-like do título.
 * Regex pega XXYZ (3 letras + 1 dígito) e XYZ (4 letras, sem dígito).
 * Limita a 1 ticker (não explode em "B3, IBOV, PETR4").
 */
function extractTicker(title: string): string | null {
  // Lookahead evita capturar palavras comum tipo "CEO", "EUA"
  const re = /\b([A-Z]{4}\d{1,2}|[A-Z]{4})\b(?!\w)/;
  const m = re.exec(title);
  if (!m) return null;
  const ticker = m[1]!;
  // Filtra falsos positivos comuns
  const BLACKLIST = new Set(["B3SA", "BRAS", "HTTP", "HTTPS"]);
  if (BLACKLIST.has(ticker)) return null;
  return ticker;
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
