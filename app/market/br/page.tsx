"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn, formatPercent, formatCompact } from "@/lib/utils";
import { IBOV_SECTORS } from "@/lib/ibovespa";
import { Skeleton } from "@/components/ui/skeleton";

type AssetType = "stock" | "etf" | "crypto";
type Item = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
  market: "us" | "br" | "global";
};
type Quote = {
  price: number;
  changePercent: number;
  volume: number;
  currency: string;
};
type Row = { symbol: string; quote: Quote | null };
type ListResponse = { items: Item[]; total: number; hasMore: boolean };
type MultiQuoteResponse = { rows: Row[] };

const PAGE_SIZE = 50;

// B3 sectors come from IBOV; for non-IBOV stocks we'll show "—" until we
// enrich the list with full CVM/B3 sector data.
const SECTORS: readonly string[] = ["All", ...IBOV_SECTORS];

export default function BrMarketPage() {
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
      <div className="space-y-px">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    </div>
  );
}

function BrMarketInner() {
  const [page, setPage] = useState(0);
  const [sector, setSector] = useState<string>("All");
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPage(0);
  }, [sector]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({
      offset: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      exchange: "b3",
    });
    if (sector !== "All") params.set("sector", sector);

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
        for (const row of (d as MultiQuoteResponse).rows ?? []) {
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <Link
        href="/market"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-3 link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        Market
      </Link>

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            Mercado Brasileiro 🇧🇷
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Todas as ações listadas na B3, com preços em tempo real (via Brapi Pro),
            variação de 24h e volume. Use os filtros de setor para navegar.
          </p>
        </div>
        <div className="label-s label-muted-2">{total.toLocaleString("en-US")} ativos</div>
      </div>

      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        {SECTORS.map((s) => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className={cn(
              "label-s border px-2.5 py-1 whitespace-nowrap press",
              sector === s
                ? "border-ink text-ink bg-surface-elevated"
                : "border-hairline-strong text-muted hover:text-ink",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="border-t border-hairline-strong">
        <div className="grid grid-cols-[40px_minmax(220px,1fr)_110px_100px_88px_100px] label-s label-muted-2 h-9 items-center px-3 bg-canvas-soft">
          <div className="num text-faint">#</div>
          <div>Ticker</div>
          <div>Setor</div>
          <div className="text-right">Preço</div>
          <div className="text-right">24h</div>
          <div className="text-right">Volume</div>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="py-10 text-center label-s text-muted">Nenhuma ação encontrada.</div>
        ) : (
          items.map((it, i) => {
            const q = quotes[it.symbol];
            return (
              <Link
                key={it.symbol}
                href={`/asset/${encodeURIComponent(it.symbol)}`}
                className="grid grid-cols-[40px_minmax(220px,1fr)_110px_100px_88px_100px] items-center h-9 px-3 border-b border-hairline hover-row press"
              >
                <div className="num text-faint text-[10.5px]">
                  {String(start + i).padStart(3, "0")}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] leading-none shrink-0" title="Brasil">
                    🇧🇷
                  </span>
                  <span className="num font-semibold text-[12.5px] text-ink">{it.symbol}</span>
                  <span className="text-[11px] text-muted truncate">{it.name}</span>
                </div>
                <div className="text-[11px] text-muted truncate">{it.sector}</div>
                <div className="num text-[12px] text-ink text-right">
                  {q ? `R$${q.price.toFixed(2)}` : "—"}
                </div>
                <div
                  className={cn(
                    "num text-[12px] text-right font-medium",
                    q ? (q.changePercent >= 0 ? "text-positive" : "text-negative") : "text-faint",
                  )}
                >
                  {q ? formatPercent(q.changePercent) : "—"}
                </div>
                <div className="num text-[12px] text-muted text-right">
                  {q && q.volume > 0 ? formatCompact(q.volume) : "—"}
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="px-3 py-3 flex items-center justify-between border-t border-hairline-strong">
        <div className="label-s label-muted-2">
          Mostrando {start}–{end} de {total.toLocaleString("en-US")}
        </div>
        <div className="flex items-stretch border border-hairline-strong">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 label-s text-muted hover:text-ink disabled:text-disabled press border-r border-hairline-strong"
          >
            <ArrowLeft className="inline w-3 h-3 mr-1" />
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
            Próximo
            <ArrowRight className="inline w-3 h-3 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
