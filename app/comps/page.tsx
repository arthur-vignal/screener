"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn, formatCompact } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { IBOV_SECTORS } from "@/lib/ibovespa";

type ScreenerRow = {
  symbol: string;
  name: string | null;
  sector: string | null;
  price: number | null;
  peRatio: number | null;
  marketCap: number | null;
  roeProxy: number | null;
  dividendYield: number | null;
};

const BR = "\u{1F1E7}\u{1F1F7}";

const SECTOR_PRESETS: Record<string, string[]> = {
  Bancos: ["ITUB4", "BBDC4", "BBAS3", "SANB11", "BBDC3"],
  "Petróleo e Gás": ["PETR4", "PETR3", "PRIO3", "UGPA3", "VBBR3"],
  Mineração: ["VALE3", "CSNA3", "GGBR4", "GOAU4", "USIM5"],
  "Varejo / Consumo": ["ABEV3", "MGLU3", "LREN3", "BHIA3", "PCAR3"],
  Energia: ["ENGI11", "TAEE11", "EGIE3", "ELET3", "CMIG4"],
};

// Aggregate sectors by the top 5 most-traded tickers in each.
const DEFAULT_SECTORS: Array<{ key: string; name: string; symbols: string[] }> = Object.entries(
  SECTOR_PRESETS,
).map(([name, symbols]) => ({
  key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  symbols,
}));

export default function CompsPage() {
  return (
    <Suspense fallback={<CompsFallback />}>
      <CompsInner />
    </Suspense>
  );
}

function CompsFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-48 mb-3" />
      <Skeleton className="h-48" />
    </div>
  );
}

function CompsInner() {
  const [sectorIdx, setSectorIdx] = useState(0);
  const [allRows, setAllRows] = useState<ScreenerRow[] | null>(null);

  useEffect(() => {
    // Pull IBOV tickers via screener
    const symbols = DEFAULT_SECTORS.flatMap((s) => s.symbols).join(",");
    fetch(`/api/screener/run?symbols=${encodeURIComponent(symbols)}`)
      .then((r) => r.json())
      .then((d) => setAllRows(d.results ?? []))
      .catch(() => setAllRows([]));
  }, []);

  const sector = DEFAULT_SECTORS[sectorIdx];
  const sectorRows = useMemo(() => {
    if (!allRows) return [];
    return allRows.filter((r) => sector.symbols.includes(r.symbol));
  }, [allRows, sector]);

  // Radar: 3 axes = P/L (inverted), ROE proxy (%), DY (%)
  const radarData = useMemo(() => {
    return sector.symbols.map((sym) => {
      const row = allRows?.find((r) => r.symbol === sym);
      const pe = row?.peRatio ?? 0;
      // P/L "inverse" (lower = better, normalize 0-100 by 1/pe scaled)
      const peScore = pe > 0 ? Math.min(100, (1 / pe) * 30) : 0;
      const roe = row?.roeProxy ?? 0;
      const dy = row?.dividendYield ?? 0;
      return {
        symbol: sym,
        peScore: Number(peScore.toFixed(1)),
        roe: Number(roe.toFixed(1)),
        dy: Number(dy.toFixed(1)),
      };
    });
  }, [allRows, sector]);

  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-3 link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        Início
      </Link>

      <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
        Comps Setoriais {BR}
      </h1>
      <p className="text-body text-sm mt-1 max-w-2xl">
        Comparação lado-a-lado dos principais pares em cada setor: P/L,
        ROE e Dividend Yield. Dados via Brapi Pro. P/VP e EV/EBITDA requerem
        balance-sheet (bloqueado por anti-bot).
      </p>

      {/* Sector selector */}
      <div className="flex items-center gap-2 mb-4 mt-4 overflow-x-auto flex-wrap">
        <BarChart3 className="w-4 h-4 text-muted shrink-0" />
        {DEFAULT_SECTORS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setSectorIdx(i)}
            className={cn(
              "label-s border px-3 py-1 press whitespace-nowrap",
              i === sectorIdx
                ? "border-ink text-ink bg-surface-elevated"
                : "border-hairline-strong text-muted hover:text-ink",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {!allRows ? (
        <Skeleton className="h-72 my-4" />
      ) : (
        <>
          {/* Radar chart */}
          <section className="mb-6 border border-hairline-strong bg-canvas-soft p-4">
            <h2 className="font-display text-[16px] text-ink mb-3">
              {sector.name} — Comparação multi-eixo
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--hairline)" />
                  <PolarAngleAxis
                    dataKey="symbol"
                    tick={{ fontSize: 11, fill: "var(--ink)", fontFamily: "var(--font-mono)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-elevated)",
                      border: "1px solid var(--hairline-strong)",
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <Radar
                    name="P/L score (1/PE * 30, higher = cheaper)"
                    dataKey="peScore"
                    stroke="var(--brand-deep)"
                    fill="var(--brand-deep)"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="ROE proxy %"
                    dataKey="roe"
                    stroke="var(--positive)"
                    fill="var(--positive)"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="Dividend Yield %"
                    dataKey="dy"
                    stroke="var(--warning)"
                    fill="var(--warning)"
                    fillOpacity={0.1}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10.5px] text-muted mt-2">
              Eixos normalizados em escala 0–100. "P/L score" = 1/P/L × 30
              (quanto maior, mais barata). ROE e DY são percentuais.
            </div>
          </section>

          {/* Detailed table */}
          <section>
            <h2 className="font-display text-[18px] text-ink tracking-[-0.02em] mb-3">
              Detalhamento
            </h2>
            <div className="border border-hairline-strong overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="label-s label-muted-2 border-b border-hairline-strong h-8 bg-canvas-soft">
                    <th className="text-left py-2 px-3 font-medium">Ticker</th>
                    <th className="text-right py-2 px-3 font-medium">Preço</th>
                    <th className="text-right py-2 px-3 font-medium">P/L</th>
                    <th className="text-right py-2 px-3 font-medium">ROE (proxy)</th>
                    <th className="text-right py-2 px-3 font-medium">DY</th>
                    <th className="text-right py-2 px-3 font-medium">Mkt cap</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorRows.map((r, i) => (
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
                              : "text-positive",
                        )}
                      >
                        {r.peRatio != null ? r.peRatio.toFixed(2) : "n/d"}
                      </td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {r.roeProxy != null ? `${r.roeProxy.toFixed(1)}%` : "n/d"}
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
                        {r.dividendYield != null
                          ? `${r.dividendYield.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="py-2 px-3 num text-right text-muted">
                        {r.marketCap != null ? formatCompact(r.marketCap) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
