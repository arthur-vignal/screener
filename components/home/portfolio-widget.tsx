"use client";

/**
 * PortfolioWidget — Fey-style card showing the user's portfolio
 * performance. Top line is the day's return percentage (in big
 * Archivo Black), below is a table of the top holdings with
 * price + 24h change + sparkline. 'Acessar portfolio →' link at
 * the bottom.
 *
 * Data: fetches the current user's portfolios + quotes batch.
 * If the user has no portfolios yet, renders a friendly empty
 * state with a CTA to create one.
 */

import Link from "next/link";
import { motion } from "motion/react";
import useSWR from "swr";
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
  type: string;
  sector: string;
  quote: {
    symbol: string;
    price: number;
    prevClose: number;
    change: number;
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

  // Aggregate holdings across all the user's portfolios.
  const holdings = (portfoliosData?.portfolios ?? [])
    .filter((p) => p.symbol)
    .reduce<
      Map<
        string,
        { symbol: string; weight: number; portfolioSlug: string }
      >
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
    .slice(0, 6);
  const symbols = top.map((h) => h.symbol).join(",");

  const { data: quotesData } = useSWR<{ rows: QuoteRow[] }>(
    symbols ? `/api/assets/quote?symbols=${symbols}` : null,
    fetcher,
  );

  const quotes = new Map(
    (quotesData?.rows ?? []).map((r) => [r.symbol, r]),
  );

  // Compute the day return = sum(weight * changePercent) / sum(weight)
  const totalWeight = top.reduce((s, h) => s + h.weight, 0) || 1;
  const dayReturnPct = top.reduce((s, h) => {
    const q = quotes.get(h.symbol);
    if (!q?.quote) return s;
    return s + (h.weight / totalWeight) * q.quote.changePercent;
  }, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-baseline justify-between px-5 pt-4 pb-3 border-b border-white/5">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.20em] text-muted-foreground">
            Seu portfolio
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            valorizou hoje
          </p>
        </div>
        <p
          className="text-[34px] leading-none tracking-tight"
          style={{
            fontFamily: "var(--font-archivo-black), Manrope, sans-serif",
            color: dayReturnPct >= 0 ? "#34d399" : "#fb7185",
          }}
        >
          {dayReturnPct >= 0 ? "+" : ""}
          {dayReturnPct.toFixed(2)}%
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        {isLoading && <SkeletonRows />}
        {!isLoading && top.length === 0 && <EmptyState />}
        {!isLoading && top.length > 0 && (
          <div className="px-2 py-2">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
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
                      className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
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
                          color: ch >= 0 ? "#34d399" : "#fb7185",
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
        className="flex items-center justify-center gap-2 px-5 py-3 border-t border-white/5 text-[12px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
      >
        acessar portfolio
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="px-5 py-3 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-9 rounded-lg bg-white/5 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[13px] text-muted-foreground">
        Você ainda não tem um portfolio.
      </p>
      <Link
        href="/portfolios/mine"
        className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-[#a78bfa] hover:text-white transition-colors"
      >
        Criar portfolio <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}