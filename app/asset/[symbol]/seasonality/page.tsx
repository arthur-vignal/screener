"use client";

/**
 * /asset/[symbol]/seasonality — seasonality heatmap (F4-2).
 *
 * For each calendar year (rows) and month (columns), compute the
 * mean daily return of the asset. Render as a 12×N grid where the
 * cell color encodes the magnitude of the return.
 *
 * Data: /api/asset/[symbol]/candles?range=5y (up to 5 years of daily
 * closes). No pre-computed Brapi field — local arithmetic.
 */

import Link from "next/link";
import { use, useMemo } from "react";
import useSWR from "swr";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";

const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

type Candle = {
  date: string;
  timestamp: number;
  close: number;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

export default function SeasonalityPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data: bundle } = useAssetBundle(symbol);

  const { data: candleData } = useSWR<{ candles: Candle[] }>(
    `/api/asset/${encodeURIComponent(symbol)}/candles?range=5y`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600_000 },
  );

  const heatmap = useMemo(() => buildHeatmap(candleData?.candles ?? []), [candleData]);

  // Find the absolute max for color scaling
  const maxAbs = useMemo(() => {
    let m = 0;
    for (const row of heatmap) {
      for (const cell of row.cells) {
        if (cell != null && Math.abs(cell) > m) m = Math.abs(cell);
      }
    }
    return m;
  }, [heatmap]);

  return (
    <div
      className="min-h-screen text-foreground overflow-x-hidden"
      style={{
        fontFamily: "var(--font-manrope)",
        background:
          "radial-gradient(ellipse at top, #0f1014 0%, #0a0a0c 45%, #060608 100%)",
      }}
    >
      <div className="px-1 pt-5 pb-12 max-w-5xl">
        <AssetSubheader
          symbol={symbol}
          longName={bundle?.longName ?? null}
          logoUrl={bundle?.logoUrl ?? null}
          currency={bundle?.currency ?? "BRL"}
          price={bundle?.quote?.price ?? null}
          change={bundle?.quote?.change ?? null}
          changePercent={bundle?.quote?.changePercent ?? null}
          section={{ slug: "seasonality", label: "Sazonalidade" }}
        />

        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Retorno médio por mês
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-3 py-4">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] tabular-nums">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1.5 font-normal text-muted-foreground/60 uppercase tracking-[0.14em]">
                      Ano
                    </th>
                    {MONTHS_PT.map((m) => (
                      <th
                        key={m}
                        className="px-1 py-1.5 font-normal text-muted-foreground/60 uppercase tracking-[0.14em] text-center"
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-3 py-8 text-center text-[12px] text-muted-foreground/60">
                        Carregando ou dados insuficientes.
                      </td>
                    </tr>
                  )}
                  {heatmap.map((row) => (
                    <tr key={row.year}>
                      <td className="px-2 py-1 text-muted-foreground/80">{row.year}</td>
                      {row.cells.map((cell, mi) => (
                        <td
                          key={mi}
                          className="px-1 py-1 text-center"
                          style={cell != null ? cellStyle(cell, maxAbs) : {}}
                        >
                          {cell != null ? `${(cell * 100).toFixed(1)}%` : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
              <span>Negativo</span>
              <span
                className="h-3 w-32 rounded"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(244,63,94,0.7) 0%, rgba(244,63,94,0.15) 50%, rgba(16,185,129,0.15) 100%, rgba(16,185,129,0.7) 100%)",
                }}
              />
              <span>Positivo</span>
            </div>
          </div>
          <p className="mt-3 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/40 text-center max-w-2xl mx-auto">
            Média dos retornos diários por mês, calculada a partir de candles diários de 5 anos.
            Não é recomendação: passado não garante futuro.
          </p>
        </section>

        <Link
          href={`/asset/${symbol}`}
          className="inline-flex items-center gap-1.5 mt-8 text-[12px] tracking-[0.18em] uppercase text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar para o gráfico
        </Link>
      </div>
    </div>
  );
}

function buildHeatmap(candles: Candle[]): Array<{
  year: string;
  cells: Array<number | null>;
}> {
  if (candles.length === 0) return [];
  // Group returns by year-month
  const byYM = new Map<string, number[]>();
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];
    if (!prev || !cur || !cur.close || !prev.close) continue;
    const y = cur.date.slice(0, 4);
    const m = parseInt(cur.date.slice(5, 7), 10) - 1;
    const ymKey = `${y}-${m}`;
    const ret = (cur.close - prev.close) / prev.close;
    if (!byYM.has(ymKey)) byYM.set(ymKey, []);
    byYM.get(ymKey)!.push(ret);
  }
  // Average per (year, month)
  const years = Array.from(new Set(Array.from(byYM.keys()).map((k) => k.split("-")[0])))
    .sort();
  return years.map((year) => ({
    year,
    cells: Array.from({ length: 12 }, (_, mi) => {
      const rets = byYM.get(`${year}-${mi}`) ?? [];
      if (rets.length === 0) return null;
      const avg = rets.reduce((s, r) => s + r, 0) / rets.length;
      return avg;
    }),
  }));
}

function cellStyle(value: number, maxAbs: number) {
  const ratio = maxAbs > 0 ? value / maxAbs : 0;
  const intensity = Math.min(1, Math.abs(ratio));
  const alpha = 0.10 + intensity * 0.55;
  const color = value >= 0 ? "16,185,129" : "244,63,94";
  return {
    background: `rgba(${color},${alpha.toFixed(2)})`,
    color: Math.abs(ratio) > 0.4 ? "#ffffff" : undefined,
  };
}