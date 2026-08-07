"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn, formatPercent, formatCompact } from "@/lib/utils";
import { SP500_SECTORS } from "@/lib/snp500";
import { IBOV_SECTORS } from "@/lib/ibovespa";
import { Skeleton } from "@/components/ui/skeleton";

type AssetType = "stock" | "etf" | "crypto";
type Market = "us" | "br" | "global";
type Item = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
  market: Market;
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

// All sectors (GICS + B3) for the chip filter; deduplicated and sorted.
const SECTORS: readonly string[] = ["All", ...Array.from(new Set([...SP500_SECTORS, ...IBOV_SECTORS])).sort()];

function normalizeMarket(raw: string | null): Market {
  if (raw === "us" || raw === "br") return raw;
  return "global";
}

function flagForMarket(m: Market, item?: Item): string | null {
  if (m === "us") return "🇺🇸";
  if (m === "br") return "🇧🇷";
  // Global: per-row flag based on market
  if (item?.market === "us") return "🇺🇸";
  if (item?.market === "br") return "🇧🇷";
  return null;
}

function priceFormat(price: number, currency: string): string {
  // BRL shows R$, others show $.
  const sym = currency === "BRL" ? "R$" : "$";
  return `${sym}${price.toFixed(2)}`;
}

export default function StocksPage() {
  // useSearchParams must be inside a Suspense boundary in Next 16+.
  return (
    <Suspense fallback={<StocksFallback />}>
      <StocksPageInner />
    </Suspense>
  );
}

function StocksFallback() {
  // Minimal layout so the page doesn't jump when the Suspense boundary
  // rehydrates with the real content.
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

function StocksPageInner() {
  const searchParams = useSearchParams();
  const marketParam = normalizeMarket(searchParams.get("market"));

  const [page, setPage] = useState(0);
  const [sector, setSector] = useState<string>("All");
  const [items, setItems] = useState<ListResponse["items"] | null>(null);
  const [total, setTotal] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPage(0);
  }, [sector, marketParam]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({
      offset: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      exchange: marketParam, // global | us | br (route normalizes us->sp500, br->ibov)
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
  }, [page, sector, marketParam]);

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
              currency: row.quote.currency ?? "USD",
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

  const titleForMarket: Record<Market, string> = {
    global: "Stocks — Global",
    us: "Stocks — US",
    br: "Stocks — Brasil",
  };
  const subtitleForMarket: Record<Market, string> = {
    global: "Ações do S&P 500 e do IBOVESPA, lado a lado. Busca livre ignora o toggle.",
    us: "Ações do S&P 500 com preços em tempo real, variação de 24h e volume.",
    br: "Ações do IBOVESPA (carteira teórica vigente) com preços em tempo real.",
  };

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
            {titleForMarket[marketParam]}
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">{subtitleForMarket[marketParam]}</p>
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
          <div>Sector</div>
          <div className="text-right">Price</div>
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
          <div className="py-10 text-center label-s text-muted">No stocks in this view.</div>
        ) : (
          items.map((it, i) => {
            const q = quotes[it.symbol];
            // Global view shows both flags; dedicated views show only their own flag.
            const showFlag =
              marketParam === "global"
                ? it.market === "us" || it.market === "br"
                : marketParam === it.market;
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
                  {showFlag && (
                    <span
                      className="text-[12px] leading-none shrink-0"
                      title={it.market === "br" ? "Brasil" : "US"}
                    >
                      {flagForMarket(it.market)}
                    </span>
                  )}
                  <span className="num font-semibold text-[12.5px] text-ink">{it.symbol}</span>
                  <span className="text-[11px] text-muted truncate">{it.name}</span>
                </div>
                <div className="text-[11px] text-muted truncate">{it.sector}</div>
                <div className="num text-[12px] text-ink text-right">
                  {q ? priceFormat(q.price, q.currency) : "—"}
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
          Showing {start}–{end} of {total.toLocaleString("en-US")}
        </div>
        <div className="flex items-stretch border border-hairline-strong">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 label-s text-muted hover:text-ink disabled:text-disabled press border-r border-hairline-strong"
          >
            <ArrowLeft className="inline w-3 h-3 mr-1" />
            Prev
          </button>
          <span className="px-3 py-1.5 label-s text-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 label-s text-muted hover:text-ink disabled:text-disabled press border-l border-hairline-strong"
          >
            Next
            <ArrowRight className="inline w-3 h-3 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
