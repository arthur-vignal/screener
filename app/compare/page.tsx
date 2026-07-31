"use client";

/**
 * Compare multiple tickers side by side.
 * Shows normalized price (% change from initial date), metrics table.
 */

import useSWR from "swr";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { X, Plus, ArrowLeft } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { cn, formatPercent } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

type Candle = { date: string; timestamp: number; close: number };
type AssetMetrics = {
  ticker: string;
  peRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  beta: number | null;
  marketCap: number | null;
  roe: number | null;
  price: number;
  changePercent: number;
};

export default function ComparePage() {
  // Initialize from localStorage synchronously (avoids setState-in-effect).
  const [tickers, setTickers] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("screener:compare");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");

  // Persistir tickers no localStorage quando mudam
  useEffect(() => {
    try {
      localStorage.setItem("screener:compare", JSON.stringify(tickers));
    } catch {
      // ignore quota
    }
  }, [tickers]);

  const addTicker = () => {
    const upper = input.toUpperCase().trim();
    if (!upper || tickers.includes(upper) || tickers.length >= 8) return;
    setTickers([...tickers, upper]);
    setInput("");
  };

  const removeTicker = (t: string) => {
    setTickers(tickers.filter((x) => x !== t));
  };

  // Fetch candles for each ticker
  const candleData = useSWR(
    tickers.length > 0 ? `/api/compare?symbols=${tickers.join(",")}&range=1Y` : null,
    fetcher,
  );

  // Fetch metrics for each ticker
  const metricsData = useSWR(
    tickers.length > 0 ? `/api/compare/metrics?symbols=${tickers.join(",")}` : null,
    fetcher,
  );

  // Build combined chart data: { date, [ticker]: normalized_pct_change }
  type ChartRow = { date: string } & Record<string, number | null>;
  const chartData: ChartRow[] = useMemo(() => {
    if (!candleData.data?.series) return [];
    const seriesByTicker = candleData.data.series as Record<string, Candle[]>;
    const datesSet = new Set<string>();
    Object.values(seriesByTicker).forEach((candles) => {
      candles.forEach((c) => datesSet.add(c.date));
    });
    const dates = Array.from(datesSet).sort();
    return dates.map((date) => {
      const row = { date } as ChartRow;
      tickers.forEach((t) => {
        const candles = seriesByTicker[t] ?? [];
        const firstIdx = candles[0];
        if (!firstIdx || firstIdx.close === 0) {
          row[t] = null;
          return;
        }
        const point = candles.find((c) => c.date === date);
        row[t] = point ? ((point.close / firstIdx.close - 1) * 100) : null;
      });
      return row;
    });
  }, [candleData.data, tickers]);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <Link
        href="/screen/stocks"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1">Comparar</h1>
      <p className="text-sm text-text-secondary mb-6">
        Adicione até 8 tickers e compare a performance normalizada (% desde o início do período).
      </p>

      <div className="rounded-lg border border-border bg-surface p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTicker())}
            placeholder="Adicionar ticker (ex: AAPL)"
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30"
          />
          <button
            onClick={addTicker}
            disabled={!input.trim() || tickers.length >= 8}
            className="bg-foreground text-background font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tickers.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-elevated border border-border text-sm font-mono"
            >
              {t}
              <button
                onClick={() => removeTicker(t)}
                className="text-text-muted hover:text-negative"
                aria-label={`Remover ${t}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {tickers.length === 0 && (
            <span className="text-xs text-text-muted">
              Nenhum ticker adicionado.
            </span>
          )}
        </div>
      </div>

      {tickers.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">
            Adicione tickers acima pra comparar.
          </p>
        </div>
      )}

      {tickers.length > 0 && (
        <>
          <div className="rounded-lg border border-border bg-surface p-5 mb-6">
            <h2 className="text-sm font-medium text-foreground mb-4">
              Performance normalizada (1Y, base 0%)
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  minTickGap={50}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  formatter={(v) => `${Number(v).toFixed(2)}%`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="plainline"
                />
                {tickers.map((t, i) => (
                  <Line
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {metricsData.data?.metrics && (
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="border-b border-border-subtle px-4 py-3">
                <h2 className="text-sm font-medium text-foreground">Métricas</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-medium">Ticker</th>
                      <th className="text-right px-4 py-3 font-medium">Preço</th>
                      <th className="text-right px-4 py-3 font-medium">1Y</th>
                      <th className="text-right px-4 py-3 font-medium">Mcap</th>
                      <th className="text-right px-4 py-3 font-medium">P/E</th>
                      <th className="text-right px-4 py-3 font-medium">P/VP</th>
                      <th className="text-right px-4 py-3 font-medium">ROE</th>
                      <th className="text-right px-4 py-3 font-medium">Yield</th>
                      <th className="text-right px-4 py-3 font-medium">Beta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metricsData.data.metrics as AssetMetrics[]).map((m) => (
                      <tr
                        key={m.ticker}
                        className="border-b border-border-subtle last:border-0 hover:bg-surface-elevated/30"
                      >
                        <td className="px-4 py-3 font-mono font-semibold">
                          <Link
                            href={`/asset/${m.ticker}`}
                            className="hover:text-accent transition-colors"
                          >
                            {m.ticker}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          ${m.price.toFixed(2)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono tabular-nums",
                            m.changePercent >= 0 ? "text-positive" : "text-negative",
                          )}
                        >
                          {formatPercent(m.changePercent)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                          {m.marketCap ? `$${(m.marketCap / 1000).toFixed(0)}B` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                          {m.peRatio ? m.peRatio.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                          {m.priceToBook ? m.priceToBook.toFixed(2) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                          {m.roe ? `${m.roe.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                          {m.dividendYield ? `${m.dividendYield.toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                          {m.beta ? m.beta.toFixed(2) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
