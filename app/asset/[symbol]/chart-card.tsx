"use client";

/**
 * ChartCard — price + line chart + time-range pills + previous close
 * reference line + volume bars.
 *
 * Layout per the Fey-style reference:
 *   [ PRICE  | +1.23% ]
 *   [ RANGE PILLS .............................. ]
 *   [ LINE CHART (full width, ~280px) ]
 *   [ VOLUME BARS  (subtle, low contrast)       ]
 *
 * Uses Recharts. We disable the parent variant dance — each path
 * animates on its own initial/animate (see earlier fix on
 * market-widget/news-widget).
 */

import { motion } from "motion/react";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Bar,
  BarChart,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";

export type RangeKey = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "1d", label: "1D" },
  { key: "5d", label: "5D" },
  { key: "1mo", label: "1M" },
  { key: "3mo", label: "3M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
  { key: "max", label: "Max" },
];

type Candle = {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

type Quote = {
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  volume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number | null;
};

export function ChartCard({
  symbol,
  currency,
  quote,
  candles,
  range,
  onRangeChange,
  loading,
}: {
  symbol: string;
  currency: string;
  quote: Quote | null;
  candles: Candle[];
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  loading: boolean;
}) {
  const isUp = (quote?.change ?? 0) >= 0;
  const accent = isUp ? "#10b981" : "#f43f5e";
  const accentFaint = isUp ? "rgba(16,185,129,0.18)" : "rgba(244,63,94,0.18)";

  const data = useMemo(
    () =>
      candles.map((c) => ({
        ts: c.timestamp,
        date: c.date,
        close: c.adjClose || c.close,
        volume: c.volume,
      })),
    [candles],
  );

  // Domain for y-axis — clamp to visible range with some headroom.
  const yDomain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 1];
    let min = Infinity;
    let max = -Infinity;
    for (const d of data) {
      if (d.close < min) min = d.close;
      if (d.close > max) max = d.close;
    }
    const pad = (max - min) * 0.08 || max * 0.02 || 1;
    return [Math.max(0, min - pad), max + pad];
  }, [data]);

  const xTicks = useMemo(() => {
    if (data.length < 2) return [];
    const out: number[] = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const idx = Math.round((data.length - 1) * (i / (n - 1)));
      out.push(data[idx].ts);
    }
    return out;
  }, [data]);

  const formatTickDate = (ts: number) => {
    const d = new Date(ts);
    if (range === "1d" || range === "5d") {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
      className="mt-5 rounded-2xl border border-border/60 overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, #08090c 0%, #15161b 30%, #0d0e12 55%, #1c1d22 80%, #07080b 100%)",
      }}
    >
      {/* Price hero — left aligned, above the chart */}
      <div className="px-6 pt-5 pb-2 flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-[44px] md:text-[52px] leading-[0.95] font-semibold tabular-nums tracking-tight">
              {loading || !quote
                ? "—"
                : formatCurrency(quote.price, currency)}
            </p>
            <div
              className="mt-1 inline-flex items-center gap-2 text-[13px] font-medium tabular-nums"
              style={{ color: accent }}
            >
              <span>
                {quote
                  ? `${isUp ? "+" : ""}${formatCurrency(quote.change, currency)}`
                  : "—"}
              </span>
              <span className="opacity-70">
                {quote
                  ? `${isUp ? "+" : ""}${quote.changePercent.toFixed(2)}%`
                  : ""}
              </span>
              <span className="text-muted-foreground/60 text-[11px] uppercase tracking-[0.18em]">
                today
              </span>
            </div>
          </div>
        </div>

        {/* Range pills */}
        <div className="flex items-center gap-1 p-1 rounded-full border border-border/60 bg-background/40 backdrop-blur-md">
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <button
                key={r.key}
                onClick={() => onRangeChange(r.key)}
                className={cn(
                  "px-2.5 h-7 rounded-full text-[11px] font-medium tracking-wide transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-1 pb-2 h-[280px] relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground/60">
            {loading ? "Carregando…" : "Sem dados para este período"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 0, left: 16 }}
            >
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={xTicks}
                tickFormatter={formatTickDate}
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="price"
                domain={yDomain}
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => formatCurrencyShort(v, currency)}
                orientation="right"
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as { ts: number; close: number };
                  return (
                    <div className="px-2.5 py-1.5 rounded-md border border-border/60 bg-background/90 backdrop-blur-md text-[11px]">
                      <p className="text-muted-foreground">
                        {new Date(p.ts).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(p.close, currency)}
                      </p>
                    </div>
                  );
                }}
              />
              {quote?.prevClose ? (
                <ReferenceLine
                  yAxisId="price"
                  y={quote.prevClose}
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Prev close",
                    position: "insideTopRight",
                    fill: "rgba(255,255,255,0.35)",
                    fontSize: 9,
                  }}
                />
              ) : null}
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke={accent}
                strokeWidth={1.6}
                fill="url(#priceFill)"
                isAnimationActive={true}
                animationDuration={650}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Volume strip */}
      <div className="px-2 h-[60px] -mt-2">
        {data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 16, bottom: 4, left: 16 }}>
              <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} hide />
              <YAxis hide domain={[0, "dataMax"]} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as { ts: number; volume: number };
                  return (
                    <div className="px-2.5 py-1.5 rounded-md border border-border/60 bg-background/90 backdrop-blur-md text-[11px]">
                      <p className="text-muted-foreground">
                        {new Date(p.ts).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="font-medium tabular-nums">
                        Vol {(p.volume / 1_000_000).toFixed(2)}M
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="volume"
                fill={accentFaint}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 52w / day-range summary */}
      {quote && (
        <div className="px-6 py-3 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          <Stat label="Day range" value={`${formatCurrency(quote.dayLow, currency)} – ${formatCurrency(quote.dayHigh, currency)}`} />
          <Stat
            label="52w range"
            value={
              quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh
                ? `${formatCurrency(quote.fiftyTwoWeekLow, currency)} – ${formatCurrency(quote.fiftyTwoWeekHigh, currency)}`
                : "—"
            }
          />
          <Stat
            label="Volume"
            value={quote.volume ? `${(quote.volume / 1_000_000).toFixed(2)}M` : "—"}
          />
          <Stat
            label="Mkt Cap"
            value={
              quote.marketCap ? formatCompactBRL(quote.marketCap) : "—"
            }
          />
        </div>
      )}
    </motion.section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground/60 uppercase tracking-[0.16em] text-[10px]">
        {label}
      </p>
      <p className="mt-0.5 font-medium tabular-nums">{value}</p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────

function formatCurrency(v: number, currency: string): string {
  if (!Number.isFinite(v)) return "—";
  const symbol = currency === "USD" ? "$" : "R$";
  return `${symbol} ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCurrencyShort(v: number, currency: string): string {
  if (!Number.isFinite(v)) return "—";
  const symbol = currency === "USD" ? "$" : "R$";
  if (Math.abs(v) >= 1000) return `${symbol}${(v / 1000).toFixed(1)}k`;
  if (Math.abs(v) >= 1) return `${symbol}${v.toFixed(2)}`;
  return `${symbol}${v.toFixed(4)}`;
}

function formatCompactBRL(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "—";
  if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(0)}M`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}