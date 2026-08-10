"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { cn, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { B3_DIVIDENDS, ttmDividends, type DividendEvent } from "@/lib/b3-dividends";

const BR = "\u{1F1E7}\u{1F1F7}";

type Quote = { symbol: string; price: number };

export default function DividendsCalendarPage() {
  return (
    <Suspense fallback={<DividendsFallback />}>
      <DividendsInner />
    </Suspense>
  );
}

function DividendsFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-64" />
    </div>
  );
}

function DividendsInner() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loaded, setLoaded] = useState(false);

  const symbols = useMemo(() => {
    const s = new Set<string>();
    for (const ev of B3_DIVIDENDS) s.add(ev.symbol);
    return Array.from(s);
  }, []);

  useEffect(() => {
    const symbolsParam = symbols.join(",");
    fetch(`/api/assets/quote?symbols=${encodeURIComponent(symbolsParam)}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, Quote> = {};
        for (const row of d.rows ?? []) {
          if (row.quote) {
            map[row.symbol] = { symbol: row.symbol, price: row.quote.price };
          }
        }
        setQuotes(map);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [symbols]);

  const eventsByMonth = useMemo(() => {
    const groups = new Map<string, DividendEvent[]>();
    for (const ev of B3_DIVIDENDS) {
      const key = ev.exDate.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ev);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0] < b[0] ? -1 : 1,
    );
  }, []);

  const tickerStats = useMemo(() => {
    const map: Record<
      string,
      { ttm: number; count: number; price: number; dy: number | null }
    > = {};
    for (const sym of symbols) {
      const ttm = ttmDividends(sym);
      const price = quotes[sym]?.price ?? 0;
      const yieldPct = ttm.total > 0 && price > 0 ? (ttm.total / price) * 100 : null;
      map[sym] = { ttm: ttm.total, count: ttm.count, price, dy: yieldPct };
    }
    return map;
  }, [symbols, quotes]);

  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-3 link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        Início
      </Link>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            Calendário de Proventos {BR}
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Dividendos, JCPs e rendimentos de FIIs. Yield on cost = soma dos
            últimos 12 meses / preço atual. Dados via Brapi Pro + seed.
          </p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-display text-[18px] text-ink tracking-[-0.02em] mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-deep" />
          Yield on Cost — Últimos 12 meses
        </h2>
        {!loaded ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="border border-hairline-strong overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-s label-muted-2 border-b border-hairline-strong h-8 bg-canvas-soft">
                  <th className="text-left py-2 px-3 font-medium">Ticker</th>
                  <th className="text-right py-2 px-3 font-medium">Preço</th>
                  <th className="text-right py-2 px-3 font-medium">Eventos (12m)</th>
                  <th className="text-right py-2 px-3 font-medium">Total 12m</th>
                  <th className="text-right py-2 px-3 font-medium">Yield atual</th>
                </tr>
              </thead>
              <tbody>
                {symbols
                  .map((sym) => ({ sym, ...tickerStats[sym] }))
                  .sort((a, b) => (b.dy ?? 0) - (a.dy ?? 0))
                  .map(({ sym, price, count, ttm, dy }, i) => (
                    <tr
                      key={sym}
                      className={cn(
                        "border-b border-hairline last:border-0 hover-row",
                        i % 2 === 0 ? "bg-canvas" : "bg-surface-elevated",
                      )}
                    >
                      <td className="py-2 px-3 num font-medium text-ink">{sym}</td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {price > 0 ? `R$${price.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2 px-3 num text-right text-muted">{count}</td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {ttm > 0 ? `R$${ttm.toFixed(2)}` : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-3 num text-right font-medium",
                          dy == null
                            ? "text-faint"
                            : dy >= 6
                              ? "text-positive"
                              : dy >= 3
                                ? "text-warning"
                                : "text-ink",
                        )}
                      >
                        {dy == null ? "—" : formatPercent(dy)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-[18px] text-ink tracking-[-0.02em] mb-3">
          Próximos eventos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {eventsByMonth.map(([month, events]) => (
            <MonthBlock key={month} month={month} events={events} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MonthBlock({ month, events }: { month: string; events: DividendEvent[] }) {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const total = events.reduce((s, e) => s + e.valuePerShare, 0);
  return (
    <div className="border border-hairline-strong bg-surface-elevated p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-medium text-ink capitalize">{label}</h3>
        <span className="label-s text-muted">
          {events.length} evento{events.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-1">
        {events.map((ev, i) => (
          <Link
            key={i}
            href={`/asset/${encodeURIComponent(ev.symbol)}`}
            className="grid grid-cols-[60px_60px_1fr_80px] items-center h-7 px-1 press hover-row"
          >
            <div className="num text-[11px] text-faint">
              {new Date(ev.exDate).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </div>
            <div className="num text-[11.5px] text-ink font-medium">{ev.symbol}</div>
            <div className="text-[10.5px] text-muted truncate">
              {ev.type === "DIV"
                ? "Dividendo"
                : ev.type === "JCP"
                  ? "JCP"
                  : "Rendimento"}
            </div>
            <div className="num text-[11.5px] text-ink text-right">
              R${ev.valuePerShare.toFixed(2)}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-hairline text-[10.5px] text-muted flex justify-between">
        <span>Total</span>
        <span className="num text-ink">R${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
