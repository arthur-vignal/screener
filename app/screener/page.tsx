"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Filter } from "lucide-react";
import Link from "next/link";
import { cn, formatCompact, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { IBOV } from "@/lib/ibovespa";

type Row = {
  symbol: string;
  name: string | null;
  sector: string | null;
  price: number | null;
  peRatio: number | null;
  marketCap: number | null;
  roeProxy: number | null;
  dividendYield: number | null;
  ttmDividends: number | null;
};

const BR = "\u{1F1E7}\u{1F1F7}";

export default function ScreenerPage() {
  return (
    <Suspense fallback={<ScreenerFallback />}>
      <ScreenerInner />
    </Suspense>
  );
}

function ScreenerFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-64" />
    </div>
  );
}

function ScreenerInner() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const symbols = IBOV.map((e) => e.symbol).join(",");
    fetch(`/api/screener/run?symbols=${encodeURIComponent(symbols)}`)
      .then((r) => r.json())
      .then((d) => setRows(d.results ?? []))
      .catch(() => setRows([]));
  }, []);

  const [peMax, setPeMax] = useState<number | null>(null);
  const [dyMin, setDyMin] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!rows) return null;
    return rows.filter((r) => {
      if (peMax != null && (r.peRatio == null || r.peRatio > peMax)) return false;
      if (dyMin != null && (r.dividendYield == null || r.dividendYield < dyMin)) return false;
      return true;
    });
  }, [rows, peMax, dyMin]);

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
            Screener Fundamentalista {BR}
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Filtra por P/L e Dividend Yield. Dados via Brapi Pro. P/VP, EV/EBITDA
            e outros indicadores avançados precisam de balance-sheet endpoints
            que a Brapi bloqueia por anti-bot.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted" />
        <span className="label-s label-muted-2">Filtros:</span>
        <label className="flex items-center gap-2 text-sm">
          P/L ≤
          <input
            type="number"
            value={peMax ?? ""}
            onChange={(e) => setPeMax(e.target.value ? Number(e.target.value) : null)}
            placeholder="∞"
            className="w-20 h-7 px-2 border border-hairline-strong bg-canvas num text-[12px]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          DY ≥
          <input
            type="number"
            value={dyMin ?? ""}
            onChange={(e) => setDyMin(e.target.value ? Number(e.target.value) : null)}
            placeholder="0"
            className="w-20 h-7 px-2 border border-hairline-strong bg-canvas num text-[12px]"
            step="0.5"
          />
          %
        </label>
        <span className="label-s text-muted">
          {filtered ? `${filtered.length} ativos` : "—"}
        </span>
      </div>

      {!filtered ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="border border-hairline-strong overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-s label-muted-2 border-b border-hairline-strong h-8 bg-canvas-soft">
                <th className="text-left py-2 px-3 font-medium">Ticker</th>
                <th className="text-left py-2 px-3 font-medium">Setor</th>
                <th className="text-right py-2 px-3 font-medium">Preço</th>
                <th className="text-right py-2 px-3 font-medium">P/L</th>
                <th className="text-right py-2 px-3 font-medium">ROE (proxy)</th>
                <th className="text-right py-2 px-3 font-medium">Mkt cap</th>
                <th className="text-right py-2 px-3 font-medium">TTM div</th>
                <th className="text-right py-2 px-3 font-medium">DY</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 label-s text-muted">
                    Sem ativos que passam os filtros.
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0))
                  .map((r, i) => (
                    <tr
                      key={r.symbol}
                      className={cn(
                        "border-b border-hairline last:border-0 hover-row",
                        i % 2 === 0 ? "bg-canvas" : "bg-surface-elevated",
                      )}
                    >
                      <td className="py-2 px-3">
                        <Link
                          href={`/asset/${encodeURIComponent(r.symbol)}`}
                          className="num font-medium text-ink hover:text-brand-deep"
                        >
                          {r.symbol}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-[11.5px] text-muted truncate max-w-[160px]">
                        {r.sector ?? "—"}
                      </td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {r.price != null ? `R$${r.price.toFixed(2)}` : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-3 num text-right font-medium",
                          r.peRatio == null
                            ? "text-faint"
                            : r.peRatio > 25
                              ? "text-warning"
                              : r.peRatio > 0
                                ? "text-positive"
                                : "text-negative",
                        )}
                      >
                        {r.peRatio != null ? r.peRatio.toFixed(2) : "n/d"}
                      </td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {r.roeProxy != null ? `${r.roeProxy.toFixed(1)}%` : "n/d"}
                      </td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {r.marketCap != null ? formatCompact(r.marketCap) : "—"}
                      </td>
                      <td className="py-2 px-3 num text-right text-muted">
                        {r.ttmDividends != null ? `R$${r.ttmDividends.toFixed(2)}` : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-3 num text-right font-medium",
                          r.dividendYield == null
                            ? "text-faint"
                            : r.dividendYield >= 6
                              ? "text-positive"
                              : r.dividendYield >= 3
                                ? "text-warning"
                                : "text-ink",
                        )}
                      >
                        {r.dividendYield != null ? formatPercent(r.dividendYield) : "—"}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
