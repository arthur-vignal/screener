"use client";

/**
 * PortfolioWidget — Fey-style card with the same surface look as
 * the rest of the home (rounded-2xl border border-border bg-card).
 *
 * Header: 'Seu portfolio / valorizou hoje' + a day's return %.
 * Table: top 6 holdings by weight, with price + 24h change.
 * Footer: 'acessar portfolio ->' link.
 *
 * Data: /api/portfolios?scope=mine + /api/assets/quote?symbols=...
 * Empty state if the user has no holdings.
 */

import Link from "next/link";
import { motion } from "motion/react";
import useSWR from "swr";
import { MetallicCard } from "@/components/ui/metallic-card";
import { ArrowRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PortfolioRow = {
  id: number;
  slug: string;
  name: string;
  initial_value: number;
  is_public: boolean;
  username: string | null;
  symbol: string | null;
  weight: number | null;
};

type QuoteRow = {
  symbol: string;
  quote: {
    price: number;
    changePercent: number;
    currency: string;
  } | null;
};

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function PortfolioWidget() {
  const { data: portfoliosData, isLoading } = useSWR<{
    portfolios: PortfolioRow[];
  }>("/api/portfolios?scope=mine", fetcher);

  const holdings = (portfoliosData?.portfolios ?? [])
    .filter((p) => p.symbol)
    .reduce<
      Map<string, { symbol: string; weight: number; portfolioSlug: string }>
    >((acc, p) => {
      const cur = acc.get(p.symbol!) ?? {
        symbol: p.symbol!,
        weight: 0,
        portfolioSlug: p.slug,
      };
      cur.weight += p.weight ?? 0;
      acc.set(p.symbol!, cur);
      return acc;
    }, new Map());

  const top = Array.from(holdings.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);
  const symbols = top.map((h) => h.symbol).join(",");

  const { data: quotesData } = useSWR<{ rows: QuoteRow[] }>(
    symbols ? `/api/assets/quote?symbols=${symbols}` : null,
    fetcher,
  );
  const quotes = new Map(
    (quotesData?.rows ?? []).map((r) => [r.symbol, r]),
  );

  const totalWeight = top.reduce((s, h) => s + h.weight, 0) || 1;
  const dayReturnPct = top.reduce((s, h) => {
    const q = quotes.get(h.symbol);
    if (!q?.quote) return s;
    return s + (h.weight / totalWeight) * q.quote.changePercent;
  }, 0);

  return (
    <MetallicCard className="h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border flex items-baseline justify-between">
        <div className="min-w-0">
          <p className="text-[12.5px] text-foreground/85 leading-tight">
            Hoje seu portfolio valorizou
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide">
            no dia
          </p>
        </div>
        <p
          className="text-[28px] leading-none tracking-tight font-medium tabular-nums"
          style={{
            color: dayReturnPct >= 0 ? "#10b981" : "#f43f5e",
          }}
        >
          {dayReturnPct >= 0 ? "+" : ""}
          {dayReturnPct.toFixed(2)}%
        </p>
      </div>

      {/* Table */}
      <div className="flex-1">
        {isLoading && (
          <div className="px-6 py-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-md bg-muted/50 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}
        {!isLoading && top.length === 0 && (
          <div className="px-6 py-6 text-center">
            <p className="text-[12.5px] text-muted-foreground">
              Você ainda não tem um portfolio.
            </p>
            <Link
              href="/portfolios/mine"
              className="inline-flex items-center gap-1.5 mt-2 text-[11.5px] text-foreground hover:underline"
            >
              Criar portfolio <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
        {!isLoading && top.length > 0 && (
          <div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-6 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 border-b border-border/60">
              <span>Ativo</span>
              <span className="text-right">Preço</span>
              <span className="text-right w-[68px]">24h</span>
            </div>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {top.map((h) => {
                const q = quotes.get(h.symbol);
                const ch = q?.quote?.changePercent ?? 0;
                return (
                  <motion.li
                    key={h.symbol}
                    variants={{
                      hidden: { opacity: 0, x: -8 },
                      show: { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <Link
                      href={`/asset/${h.symbol}`}
                      className="grid grid-cols-[1fr_auto_auto] gap-3 px-6 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {h.symbol.replace(/\d$/, "")}
                          <span className="text-muted-foreground ml-1">
                            {h.symbol.match(/\d$/)?.[0]}
                          </span>
                        </p>
                        <p className="text-[10.5px] text-muted-foreground truncate">
                          peso {(h.weight * 100).toFixed(1)}%
                        </p>
                      </div>
                      <p className="text-[13px] tabular-nums text-foreground text-right">
                        {q?.quote ? formatBRL(q.quote.price) : "—"}
                      </p>
                      <p
                        className="text-[12.5px] tabular-nums text-right w-[68px]"
                        style={{
                          color: ch >= 0 ? "#10b981" : "#f43f5e",
                        }}
                      >
                        {q?.quote
                          ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`
                          : "—"}
                      </p>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        )}
      </div>

      {/* Footer link */}
      <Link
        href="/portfolios/mine"
        className="flex items-center justify-center gap-2 px-6 py-3.5 border-t border-border text-[12px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        acessar portfolio
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </MetallicCard>
  );
}