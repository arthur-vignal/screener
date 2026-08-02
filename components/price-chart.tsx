"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatCompact } from "@/lib/utils";
import { sma, rsi } from "@/lib/indicators";

type Candle = {
  date: string;
  timestamp: number;
  close: number;
};

type Range = "1M" | "3M" | "6M" | "1Y" | "2Y";

const RANGES: Range[] = ["1M", "3M", "6M", "1Y", "2Y"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PriceChart({ ticker }: { ticker: string }) {
  const [range, setRange] = useState<Range>("1Y");
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  const { data, isLoading } = useSWR<{ points: Candle[] }>(
    `/api/chart/${ticker}?range=${range}`,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 },
  );

  const enriched = useMemo(() => {
    const points = data?.points ?? [];
    if (points.length === 0) return [];
    const prices = points.map((p) => p.close);
    const sma20 = sma(prices, 20);
    const sma50 = sma(prices, 50);
    return points.map((p, i) => ({
      ...p,
      sma20: Number.isNaN(sma20[i]) ? null : sma20[i],
      sma50: Number.isNaN(sma50[i]) ? null : sma50[i],
    }));
  }, [data]);

  const rsiData = useMemo(() => {
    const points = data?.points ?? [];
    if (points.length === 0) return [];
    const prices = points.map((p) => p.close);
    const rsiValues = rsi(prices, 14);
    return points.map((p, i) => ({
      date: p.date,
      rsi: Number.isNaN(rsiValues[i]) ? null : rsiValues[i],
    }));
  }, [data]);

  const points = enriched;
  const prices = useMemo(() => points.map((p) => p.close), [points]);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const padding = (max - min) * 0.05 || 1;
  const isPositive =
    points.length >= 2 && points[points.length - 1].close >= points[0].close;
  const color = isPositive ? "var(--positive)" : "var(--negative)";

  const lastRsi = rsiData.length > 0 ? rsiData[rsiData.length - 1].rsi : null;

  return (
    <div className="flex flex-col gap-3 h-[600px]">
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Preço</h3>
          <div className="flex items-center gap-1 bg-surface-elevated rounded-md p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                  range === r
                    ? "bg-foreground text-background"
                    : "text-text-secondary hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-6 flex-1 relative min-h-[280px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-text-muted">Carregando…</div>
            </div>
          )}
          {!isLoading && points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-text-muted">Sem dados</div>
            </div>
          )}
          {points.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  minTickGap={40}
                />
                <YAxis
                  domain={[min - padding, max + padding]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickFormatter={(v) => formatCompact(v)}
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
                  labelStyle={{ color: "var(--text-secondary)", marginBottom: 4 }}
                  itemStyle={{ color: "var(--foreground)", fontFamily: "var(--font-inter)" }}
                  formatter={(v) => `$${Number(v).toFixed(2)}`}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${ticker})`}
                  isAnimationActive={true}
                  animationDuration={400}
                  name="Preço"
                />
                {showSMA20 && (
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA 20"
                    isAnimationActive={false}
                  />
                )}
                {showSMA50 && (
                  <Line
                    type="monotone"
                    dataKey="sma50"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA 50"
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-2.5 text-xs">
          <span className="text-text-muted uppercase tracking-wider font-medium">
            Indicadores
          </span>
          <button
            onClick={() => setShowSMA20(!showSMA20)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
              showSMA20 ? "text-foreground" : "text-text-muted hover:text-foreground",
            )}
          >
            <span className="w-3 h-0.5 bg-yellow-400" />
            SMA 20
          </button>
          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
              showSMA50 ? "text-foreground" : "text-text-muted hover:text-foreground",
            )}
          >
            <span className="w-3 h-0.5 bg-violet-400" />
            SMA 50
          </button>
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
              showRSI ? "text-foreground" : "text-text-muted hover:text-foreground",
            )}
          >
            <span className="w-3 h-0.5 bg-blue-400" />
            RSI 14
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-all duration-500 ease-out shrink-0",
          showRSI && rsiData.length > 0 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        style={{ transitionProperty: "grid-template-rows, opacity" }}
      >
        <div className="overflow-hidden">
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">RSI (14)</h3>
            {lastRsi !== null && (
              <span
                className={cn(
                  "text-sm font-mono tabular-nums",
                  lastRsi > 70
                    ? "text-negative"
                    : lastRsi < 30
                      ? "text-positive"
                      : "text-text-secondary",
                )}
              >
                {lastRsi.toFixed(1)}
                {lastRsi > 70 ? " (sobrecomprado)" : lastRsi < 30 ? " (sobrevendido)" : ""}
              </span>
            )}
          </div>
          <div className="px-4 py-4 h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rsiData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  minTickGap={50}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 30, 70, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: "var(--text-secondary)", marginBottom: 4 }}
                  itemStyle={{ color: "var(--foreground)", fontFamily: "var(--font-inter)" }}
                  formatter={(v) => Number(v).toFixed(1)}
                />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#60a5fa"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="RSI"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
