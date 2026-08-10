"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn, formatPercent, formatCompact } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { IBOV_SECTORS } from "@/lib/ibovespa";
import { SectorRibbon } from "@/components/sector-ribbon";
import { NewsRail, SulfurPortfoliosRail } from "@/components/right-rail";

type Quote = {
  price: number;
  changePercent: number;
  volume: number;
  currency: string;
};

type Item = {
  symbol: string;
  name: string;
  sector: string;
  type: "stock" | "etf" | "crypto";
  market: "us" | "br" | "global";
};

type Row = { symbol: string; quote: Quote | null };
type ListResponse = { items: Item[]; total: number; hasMore: boolean };

const BR = "\u{1F1E7}\u{1F1F7}";

export default function BrMarketOverview() {
  return (
    <Suspense fallback={<BrMarketFallback />}>
      <BrMarketInner />
    </Suspense>
  );
}

function BrMarketFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-32 mb-3" />
      <div className="grid grid-cols-[1fr_320px] gap-3">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function BrMarketInner() {
  const [page, setPage] = useState(0);
  const [sector, setSector] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(true);
  const LIMIT = 18;

  useEffect(() => {
    setPage(0);
  }, [sector]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({
      offset: String(page * LIMIT),
      limit: String(LIMIT),
      exchange: "b3",
    });
    if (sector && sector !== "Todos") params.set("sector", sector);

    fetch(`/api/assets/list?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, sector]);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const syms = items.map((i) => i.symbol).join(",");
    fetch(`/api/assets/quote?symbols=${encodeURIComponent(syms)}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, Quote> = {};
        for (const row of (d.rows ?? []) as Row[]) {
          if (row.quote) {
            map[row.symbol] = {
              price: row.quote.price,
              changePercent: row.quote.changePercent,
              volume: row.quote.volume,
              currency: row.quote.currency ?? "BRL",
            };
          }
        }
        setQuotes(map);
      })
      .catch(() => {});
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="max-w-[1920px] mx-auto bg-canvas text-ink">
      <SectorRibbon
        onSectorChange={(s) => setSector(s)}
        activeSector={sector}
        market="br"
      />

      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 340px" }}
      >
        <div className="border-r border-hairline-strong">
          <div className="px-7 pt-5 pb-[10px] flex items-baseline justify-between">
            <h2 className="font-display text-[19px] text-ink tracking-[-0.03em]">
              Mercado {BR}
            </h2>
            <span className="label-s label-muted-2">
              {total > 0 ? `${total.toLocaleString("pt-BR")} ativos` : "\u2014"}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-px bg-canvas">
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div key={i} className="h-[46px] shimmer" />
              ))}
            </div>
          ) : !items || items.length === 0 ? (
            <div className="px-7 py-10 text-center label-s text-muted">
              Nenhum ativo encontrado.
            </div>
          ) : (
            <div className="bg-canvas-soft border-t border-b border-hairline-strong">
              <div className="grid grid-cols-[44px_1fr_110px_100px_88px_100px] items-center h-8 px-7 label-s label-muted-2">
                <div className="num text-faint">#</div>
                <div>Ticker</div>
                <div>Setor</div>
                <div className="text-right">Preço</div>
                <div className="text-right">24h</div>
                <div className="text-right">Volume</div>
              </div>
              {items.map((it, i) => {
                const q = quotes[it.symbol];
                return (
                  <Link
                    key={it.symbol}
                    href={`/asset/${encodeURIComponent(it.symbol)}`}
                    className="grid grid-cols-[44px_1fr_110px_100px_88px_100px] items-center h-[36px] px-7 border-t border-hairline hover-row press animate-fade-up"
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    <div className="num text-faint text-[10.5px]">
                      {String(i + 1 + page * LIMIT).padStart(3, "0")}
                    </div>
                    <div className="flex items-center gap-[11px] min-w-0">
                      <div className="w-[22px] h-[22px] bg-surface flex items-center justify-center num text-[9px] text-ink shrink-0">
                        {it.symbol.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <div className="num text-[12.5px] text-ink truncate">
                          {it.symbol}
                        </div>
                        <div className="text-[10.5px] text-muted truncate">
                          {it.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11.5px] text-muted truncate">
                      {it.sector}
                    </div>
                    <div className="num text-[12.5px] text-ink text-right">
                      {q ? `R$${q.price.toFixed(2)}` : "\u2014"}
                    </div>
                    <div
                      className={cn(
                        "num text-[12px] text-right font-medium",
                        q ? (q.changePercent >= 0 ? "text-positive" : "text-negative") : "text-faint",
                      )}
                    >
                      {q ? formatPercent(q.changePercent) : "\u2014"}
                    </div>
                    <div className="num text-[12px] text-muted text-right">
                      {q && q.volume > 0 ? formatCompact(q.volume) : "\u2014"}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="px-7 py-4 flex items-center justify-between border-t border-hairline-strong">
            <div className="label-s label-muted-2">
              Mostrando{" "}
              {total === 0 ? 0 : page * LIMIT + 1}
              {"\u2014"}
              {Math.min(total, (page + 1) * LIMIT)} de {total.toLocaleString("pt-BR")}
            </div>
            <div className="flex items-stretch border border-hairline-strong">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 label-s text-muted hover:text-ink disabled:text-disabled press border-r border-hairline-strong"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 label-s text-muted">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 label-s text-muted hover:text-ink disabled:text-disabled press border-l border-hairline-strong"
              >
                Pr\u00f3ximo
              </button>
            </div>
          </div>
        </div>

        <aside className="px-6 py-7 space-y-[18px]">
          <RailBlock>
            <NewsRail />
          </RailBlock>
          <RailBlock>
            <SulfurPortfoliosRail />
          </RailBlock>
        </aside>
      </div>
    </div>
  );
}

function RailBlock({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-hairline-strong pt-[18px]">{children}</div>;
}
