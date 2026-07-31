"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { cn, formatCompact, formatPercent } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";

type Row = {
  ticker: string;
  price: number;
  marketCap: number;
  peRatio: number | null;
  sector: string;
  industry: string;
  changePercent: number;
  yearHigh: number;
  yearLow: number;
  dividendYield: number | null;
  beta: number | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StocksScreen() {
  // Filtros: P/E maximo (rascunho — Finnhub free nao retorna P/E)
  // e market cap minimo + dividend yield minimo (que vem preenchido)
  const [mcapMin, setMcapMin] = useState(1000); // $1B
  const [divYieldMin, setDivYieldMin] = useState(0); // %
  const [applied, setApplied] = useState({ mcapMin: 1000, divYieldMin: 0 });

  const url = `/api/screen/stocks?mcapMin=${applied.mcapMin}&divYieldMin=${applied.divYieldMin}&limit=30`;
  const { data, error, isLoading } = useSWR<{ rows: Row[]; count: number }>(url, fetcher, {
    refreshInterval: 5 * 60 * 1000,
  });

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Ações</h1>
          <p className="text-sm text-text-secondary">
            {data ? `${data.count} resultados` : "Carregando..."}
          </p>
        </div>
        {data && data.rows.length > 0 && (
          <button
            onClick={() =>
              downloadCSV(
                `stocks-${new Date().toISOString().slice(0, 10)}`,
                data.rows,
                [
                  { key: "ticker", label: "Ticker" },
                  { key: "industry", label: "Setor" },
                  { key: "price", label: "Preço" },
                  { key: "changePercent", label: "Variação %" },
                  { key: "marketCap", label: "Market Cap (M USD)" },
                  { key: "peRatio", label: "P/E" },
                  { key: "dividendYield", label: "Yield %" },
                ],
              )
            }
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:border-foreground/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FilterSlider
            label="Dividend yield mínimo"
            value={divYieldMin}
            onChange={setDivYieldMin}
            min={0}
            max={10}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
          />
          <FilterSlider
            label="Market cap mínimo"
            value={mcapMin}
            onChange={setMcapMin}
            min={100}
            max={100000}
            step={100}
            format={(v) => `$${formatCompact(v)}M`}
          />
          <div className="flex items-end">
            <button
              onClick={() => setApplied({ mcapMin, divYieldMin })}
              className="w-full bg-foreground text-background font-medium py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-negative/30 bg-negative/5 px-4 py-3 mb-6 text-sm text-negative">
          {String(error)}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md shimmer" />
          ))}
        </div>
      )}

      {data && data.rows.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">
            Nenhum resultado. Tente放宽 os filtros.
          </p>
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Ticker</th>
                <th className="text-left px-4 py-3 font-medium">Setor</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-right px-4 py-3 font-medium">Variação</th>
                <th className="text-right px-4 py-3 font-medium">Mcap</th>
                <th className="text-right px-4 py-3 font-medium">P/E</th>
                <th className="text-right px-4 py-3 font-medium">Yield</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr
                  key={r.ticker}
                  className={cn(
                    "border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors cursor-pointer",
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-elevated/30",
                  )}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/asset/${r.ticker}`}
                      className="font-mono font-semibold text-foreground hover:text-accent transition-colors"
                    >
                      {r.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{r.industry}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    ${r.price.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      r.changePercent >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatPercent(r.changePercent)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    ${formatCompact(r.marketCap * 1e6)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {r.peRatio ? r.peRatio.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {r.dividendYield ? `${r.dividendYield.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs uppercase tracking-wider text-text-muted font-medium">
          {label}
        </label>
        <span className="text-sm font-mono tabular-nums text-foreground">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground"
      />
    </div>
  );
}
