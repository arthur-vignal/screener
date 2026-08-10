"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, formatPercent, formatCompact } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Quote = {
  price: number;
  changePercent: number;
  volume: number;
  currency: string;
};

type PreviewItem = {
  symbol: string;
  longName?: string | null;
  sector?: string | null;
};

const SECTIONS = [
  {
    key: "stock",
    title: "Stocks (S&P 500)",
    subtitle: "Top ações da S&P 500 — paginada em /market/stocks.",
    href: "/market/stocks",
    accent: "text-brand-deep",
  },
  {
    key: "etf",
    title: "ETFs (US)",
    subtitle: "ETFs listados nos EUA — spy, voo, qqq, etc.",
    href: "/market/etfs",
    accent: "text-warning",
  },
];

export default function UsMarketOverview() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            US Markets 🇺🇸
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Visão geral dos mercados dos EUA: ações S&P 500 e ETFs. Cada card
            mostra os 5 ativos mais relevantes da categoria; clique para ver
            a lista completa.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Suspense key={s.key} fallback={<PreviewFallback />}>
            <PreviewSection section={s} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}

function PreviewFallback() {
  return (
    <div className="border border-hairline-strong p-5">
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-3 w-48 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>
    </div>
  );
}

function PreviewSection({
  section,
}: {
  section: { key: string; title: string; subtitle: string; href: string; accent: string };
}) {
  const [rows, setRows] = useState<
    Array<{ symbol: string; name: string; price: number; change: number; volume: number; sector: string }>
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      exchange: section.key === "etf" ? "etf" : "sp500",
      offset: "0",
      limit: "5",
    });

    fetch(`/api/assets/list?${params}`)
      .then((r) => r.json())
      .then((listData) => {
        if (cancelled) return;
        const symbols = (listData.items ?? []).map((it: PreviewItem) => it.symbol).join(",");
        if (!symbols) {
          setLoaded(true);
          return;
        }
        return fetch(`/api/assets/quote?symbols=${encodeURIComponent(symbols)}`)
          .then((r) => r.json())
          .then((quoteData) => {
            if (cancelled) return;
            const qBySym = new Map<string, Quote>();
            for (const row of quoteData.rows ?? []) {
              if (row.quote) {
                qBySym.set(row.symbol, {
                  price: row.quote.price,
                  changePercent: row.quote.changePercent,
                  volume: row.quote.volume,
                  currency: row.quote.currency ?? "USD",
                });
              }
            }
            const merged = (listData.items ?? []).map((it: PreviewItem) => {
              const q = qBySym.get(it.symbol);
              return {
                symbol: it.symbol,
                name: it.longName ?? it.symbol,
                price: q?.price ?? 0,
                change: q?.changePercent ?? 0,
                volume: q?.volume ?? 0,
                sector: it.sector ?? "",
              };
            });
            setRows(merged);
            setLoaded(true);
          });
      })
      .catch(() => setLoaded(true));

    return () => {
      cancelled = true;
    };
  }, [section.key]);

  return (
    <div className="border border-hairline-strong bg-surface-elevated p-5 hover-lift">
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <h2 className={cn("font-medium text-[17px]", section.accent)}>
            {section.title}
          </h2>
          <p className="text-xs text-muted mt-1 max-w-md">{section.subtitle}</p>
        </div>
        <Link
          href={section.href}
          className="label-s text-muted hover:text-ink inline-flex items-center gap-1 press"
        >
          Ver todos
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="label-s text-muted py-4 text-center">Sem dados.</div>
      ) : (
        <div className="border-t border-hairline">
          {rows.map((r, i) => (
            <Link
              key={r.symbol}
              href={`/asset/${encodeURIComponent(r.symbol)}`}
              className={cn(
                "grid grid-cols-[60px_1fr_80px_70px] items-center h-7 px-1 press hover-row",
                i !== rows.length - 1 && "border-b border-hairline",
              )}
            >
              <div className="num text-[12px] text-ink font-semibold">{r.symbol}</div>
              <div className="text-[10.5px] text-muted truncate">{r.name}</div>
              <div className="num text-[11.5px] text-ink text-right">
                {r.price ? `$${r.price.toFixed(2)}` : "—"}
              </div>
              <div
                className={cn(
                  "num text-[11px] text-right font-medium",
                  r.change === 0
                    ? "text-faint"
                    : r.change > 0
                      ? "text-positive"
                      : "text-negative",
                )}
              >
                {r.change
                  ? `${r.change > 0 ? "+" : "−"}${Math.abs(r.change).toFixed(2)}%`
                  : "—"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
