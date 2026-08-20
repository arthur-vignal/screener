// noop: force rebuild
"use client";

/**
 * ChartCard — price + line chart + time-range pills + previous close
 * reference line + embedded volume overlay.
 *
 * Layout:
 *   [ PRICE (smaller) | +/- VAR ............... | RANGE PILLS ]
 *   [ LINE CHART with VOLUME OVERLAY (single SVG, ~340px) ]
 *   [ Day range | 52w range | Volume | Mkt Cap ]
 *
 * Volume is rendered inside the price chart as a low-opacity Bar
 * pinned to the bottom 25% of the chart area. Y-axis on the right is
 * the price; volume doesn't get its own axis.
 *
 * Time ranges + intervals (server side handles the resample):
 *   24h  → 5m   (intraday, last 24h)
 *   7d   → 15m  (last 7 days)
 *   3m   → 1h   (last 3 months)
 *   1y   → 4h   (last year)
 *   5y   → 6h   (last 5 years)
 *   max  → 6h   (max available)
 *
 * If the asset has < 5y history the client hides the 5y pill.
 */

import { motion } from "motion/react";
import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";

export type RangeKey = "24h" | "7d" | "3m" | "1y" | "5y" | "max";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "3m", label: "3M" },
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
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  dayOpen: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
};

const FIVE_YEARS_MS = 5 * 365 * 24 * 3600 * 1000;

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
  // Brapi PRO returns different shapes per ticker — some return
  // just {52wHigh, 52wLow, marketCap} with no live price. Treat any
  // missing numeric field as null and let the renderer show "—".
  const change = quote?.change ?? null;
  const changePercent = quote?.changePercent ?? null;
  const price = quote?.price ?? null;
  const isUp = (change ?? 0) >= 0;
  const accent = isUp ? "#10b981" : "#f43f5e";
  const accentFaint = isUp ? "rgba(16,185,129,0.10)" : "rgba(244,63,94,0.10)";

  const data = useMemo(() => {
    // Build chart data with a COMPRESSED time axis.
    //
    // Brapi returns candles only inside B3 trading hours (10:00–17:45 BRT,
    // weekdays). The raw timestamps leave gaps for after-hours, weekends,
    // and holidays; on a linear time axis those gaps stretch the line
    // across what looks like a flat horizontal segment (e.g. Fri 17:45 →
    // Mon 10:00 = 65h of "no price change" drawn as a level line).
    //
    // To match Google Finance / TradingView ("Aug 17 → Aug 18 → Aug 19"
    // ticks evenly spaced, no gap, no flat line), we compress gaps
    // larger than ONE trading day's worth of intra-day spacing. We
    // subtract (gap - intraDaySpan) from each subsequent timestamp so
    // consecutive trading days sit visually adjacent.
    //
    // `intraDaySpan` is the largest expected gap between two candles
    // within the same session. For intraday (5m/15m) it's 15min cadence
    // so we use 1h to be safe; for the daily-resampled ranges (1y/5y/max)
    // it's 1 day, so we use 24h. This means weekends and holidays
    // collapse to a single "next-session" point — no empty space, no
    // artificial flat line.
    const intraDaySpanMs: Record<RangeKey, number> = {
      "24h": 1 * 3600 * 1000,
      "7d": 1 * 3600 * 1000,
      "3m": 4 * 3600 * 1000,
      "1y": 24 * 3600 * 1000,
      "5y": 24 * 3600 * 1000,
      "max": 24 * 3600 * 1000,
    };
    const span = intraDaySpanMs[range];
    let offset = 0;
    let prevTs: number | null = null;
    return candles.map((c) => {
      const ts = c.timestamp;
      if (prevTs != null) {
        const gap = ts - prevTs;
        if (gap > span) {
          // Subtract the over-gap so next session sitts right after the prev.
          offset += gap - span;
        }
      }
      prevTs = ts;
      return {
        ts: ts - offset, // compressed X coordinate
        ts_real: ts,     // real timestamp for the tooltip / tick formatter
        date: c.date,
        close: c.adjClose || c.close,
        volume: c.volume,
      };
    });
  }, [candles, range]);

  // Detect ticker history length so we can hide 5Y pill for short
  // histories (< 5 years since first available candle). Use the REAL
  // timestamps, not the compressed-X coordinate, because the latter
  // collapses weekends/holidays and is not a fair "history length".
  const tickerSpanMs =
    data.length > 1
      ? data[data.length - 1].ts_real - data[0].ts_real
      : 0;
  const hide5y = tickerSpanMs > 0 && tickerSpanMs < FIVE_YEARS_MS;
  const visibleRanges = RANGES.filter((r) => !(hide5y && r.key === "5y"));

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
    // Pick 5 evenly spaced candles by index and use the compressed ts
    // for the tick position. The tickFormatter receives the real ts
    // (via the candle's ts_real) so the label shows the actual date.
    for (let i = 0; i < n; i++) {
      const dataIdx = Math.round((data.length - 1) * (i / (n - 1)));
      out.push(data[dataIdx].ts);
    }
    return out;
  }, [data]);

  const formatTickDate = (ts: number) => {
    const d = new Date(ts);
    if (range === "24h") {
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (range === "7d") {
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }
    if (range === "3m") {
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
    }
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
      className="rounded-2xl border border-border/60 overflow-hidden relative h-full min-h-[480px] flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, #08090c 0%, #15161b 30%, #0d0e12 55%, #1c1d22 80%, #07080b 100%)",
      }}
    >
      {/* Price hero — left aligned, ~40% smaller than v1 */}
      <div className="px-6 pt-5 pb-2 flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-[26px] md:text-[31px] leading-[0.95] font-semibold tabular-nums tracking-tight">
              {loading || price == null
                ? "—"
                : formatCurrency(price, currency)}
            </p>
            <div
              className="mt-1 inline-flex items-center gap-2 text-[12px] font-medium tabular-nums"
              style={{ color: accent }}
            >
              <span>
                {change == null
                  ? "—"
                  : `${isUp ? "+" : ""}${formatCurrency(change, currency)}`}
              </span>
              <span className="opacity-70">
                {changePercent == null
                  ? ""
                  : `${isUp ? "+" : ""}${changePercent.toFixed(2)}%`}
              </span>
              <span className="text-muted-foreground/60 text-[10px] uppercase tracking-[0.18em]">
                today
              </span>
            </div>
          </div>
        </div>

        {/* Range pills */}
        <div className="flex items-center gap-1 p-1 rounded-full border border-border/60 bg-background/40 backdrop-blur-md">
          {visibleRanges.map((r) => {
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

      {/* Chart with embedded volume overlay */}
      <div className="px-2 pt-1 pb-2 flex-1 min-h-[320px] relative">
        {data.length === 0 ? (
<div className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground/70 px-6 text-center">
            {loading ? "Carregando…" : "Não temos informações desse ativo nesse tempo grafico, tente outro!"}
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
                tickFormatter={(compressedTs) => {
                  // Look up the candle by compressed ts to recover the real ts.
                  const d = data.find((x) => x.ts === compressedTs);
                  return formatTickDate(d?.ts_real ?? compressedTs);
                }}
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
              {/* Hidden volume axis: scales so volume bars stay in the
                  bottom 25% of the chart. Declared BEFORE the <Bar>
                  so Recharts has the axis when the bar mounts. */}
              <YAxis
                yAxisId="volume"
                orientation="right"
                hide
                domain={[0, "dataMax"]}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as { ts: number; ts_real: number; close: number; volume: number };
                  return (
                    <div className="px-2.5 py-1.5 rounded-md border border-border/60 bg-background/90 backdrop-blur-md text-[11px]">
                      <p className="text-muted-foreground">
                        {new Date(p.ts_real).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(p.close, currency)}
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        Vol {(p.volume / 1_000_000).toFixed(2)}M
                      </p>
                    </div>
                  );
                }}
              />
              {quote?.prevClose != null ? (
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
              {/* Volume bars at the bottom 25% of the chart */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill={accentFaint}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
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

      {/* Day-range / 52w / Volume / Mkt cap summary */}
      {quote && (
        <div className="px-6 py-3 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          <Stat label="Day range" value={quote.dayLow != null && quote.dayHigh != null ? `${formatCurrency(quote.dayLow, currency)} – ${formatCurrency(quote.dayHigh, currency)}` : "—"} />
          <Stat
            label="52w range"
            value={
              quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null
                ? `${formatCurrency(quote.fiftyTwoWeekLow, currency)} – ${formatCurrency(quote.fiftyTwoWeekHigh, currency)}`
                : "—"
            }
          />
          <Stat
            label="Volume"
            value={quote.volume != null && quote.volume > 0 ? `${(quote.volume / 1_000_000).toFixed(2)}M` : "—"}
          />
          <Stat
            label="Mkt Cap"
            value={quote.marketCap ? formatCompactBRL(quote.marketCap) : "—"}
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

function formatCurrency(v: number | null | undefined, currency: string): string {
  if (v == null || !Number.isFinite(v)) return "—";
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