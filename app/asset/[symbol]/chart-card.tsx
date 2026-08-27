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
  CartesianGrid,
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

  // Cap the volume-bar domain at the 95th-percentile volume * 1.2 so
  // a single outlier candle doesn't stretch the rest of the bars to a
  // sliver. Without this, a post-earnings spike or IPO surge makes
  // everyday bars invisible against the chart floor.
  const volumeMax = useMemo(() => {
    const volumes = candles
      .map((c) => c.volume)
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    if (volumes.length >= 20) {
      const p95 = volumes[Math.floor(volumes.length * 0.95)];
      return p95 * 1.2;
    }
    if (volumes.length > 0) {
      return volumes[volumes.length - 1] * 1.2;
    }
    return 1;
  }, [candles]);

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
    // Cadence of the candles for this range (matches what the API returns).
    // Used as the "expected intra-session spacing" so consecutive candles
    // inside the same session stay evenly spaced, while gaps between
    // sessions (weekends, holidays) collapse to a single tick.
    const cadenceMs: Record<RangeKey, number> = {
      "24h": 5 * 60 * 1000,        // 5m
      "7d": 5 * 60 * 1000,         // 5m
      "3m": 30 * 60 * 1000,        // 30m
      "1y": 4 * 3600 * 1000,       // 4h (after resample)
      "5y": 24 * 3600 * 1000,      // 1d
      "max": 24 * 3600 * 1000,     // 1d
    };
    const cadence = cadenceMs[range];
    let offset = 0;
    let prevTs: number | null = null;
    return candles.map((c) => {
      const ts = c.timestamp;
      if (prevTs != null) {
        const gap = ts - prevTs;
        if (gap > cadence) {
          // Gap exceeds intra-session spacing → session boundary
          // (weekend, holiday, or end-of-day). Compress the ENTIRE
          // gap so the next session's first candle sits immediately
          // to the right of the previous session's last candle. The
          // recharts curve connects them with a smooth line through
          // the real price change.
          offset += gap - cadence;
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

  // Volume bars are plotted on the price YAxis but at a small fraction of
  // the price range, so they sit at the bottom of the chart and never
  // overlap the price line. We compute a `volumeY` per candle that maps
  // volume → 0..0.15 of (priceMax - priceMin, measured against the
  // close-only yDomain above). Using close-only yDomain (no padding) so
  // the math is predictable.
  const dataWithVolumeY = useMemo<Array<{
    ts: number;
    ts_real: number;
    date: string;
    close: number;
    volume: number;
    volumeY: number;
  }>>(() => {
    if (data.length === 0 || volumeMax <= 0) {
      return data.map((d) => ({ ...d, volumeY: 0 }));
    }
    const closes = data.map((d) => d.close).filter((c): c is number => c != null);
    if (closes.length === 0) {
      return data.map((d) => ({ ...d, volumeY: 0 }));
    }
    const minC = Math.min(...closes);
    const maxC = Math.max(...closes);
    const rangeC = maxC - minC || maxC || 1;
    return data.map((d) => ({
      ts: d.ts,
      ts_real: d.ts_real,
      date: d.date,
      close: d.close,
      volume: d.volume,
      // Map volume → 0..0.15 of price range, starting from priceMin
      // (so bars rise from the bottom of the chart).
      volumeY: minC + (Math.min(d.volume, volumeMax) / volumeMax) * rangeC * 0.15,
    }));
  }, [data, volumeMax]);



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
    // Tighter padding (2%) so the price series fills the chart area and
        // intra-day variation reads as actual movement instead of a flat line.
        // The 8% we used before made low-volatility B3 stocks look monotone.
        const pad = (max - min) * 0.02 || max * 0.005 || 1;
        return [Math.max(0, min - pad), max + pad];
  }, [data]);

  // When yDomain is computed (with its 8% padding), shift each
  // volumeY by the same padding offset so the bars still anchor
  // visually at the bottom of the chart area. Without this, the
  // bars would float up away from the X-axis when the yDomain
  // extends below the actual minimum price.
  const finalData = useMemo<Array<{
    ts: number;
    ts_real: number;
    date: string;
    close: number;
    volume: number;
    volumeY: number;
  }>>(() => {
    const [yMin] = yDomain;
    const closes = data.map((d) => d.close).filter((c): c is number => c != null);
    if (closes.length === 0) return dataWithVolumeY;
    const minC = Math.min(...closes);
    const offset = yMin - minC; // how far below the min close the yDomain starts
    if (offset === 0) return dataWithVolumeY;
    return dataWithVolumeY.map((d) => ({
      ts: d.ts,
      ts_real: d.ts_real,
      date: d.date,
      close: d.close,
      volume: d.volume,
      volumeY: (d.volumeY ?? 0) + offset,
    }));
  }, [dataWithVolumeY, yDomain, data]);
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
      className="relative h-full flex flex-col"
    >
      {/* Price hero — left aligned, Fey-style tag + flat range pills on right */}
            <div className="px-2 pt-2 pb-3 flex items-end justify-between gap-4 flex-wrap">
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

              {/* Right column: currency/exchange pill on top, range pills below */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Currency / exchange pill — Fey-style tag in the top-right */}
                <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full border border-border/60 bg-foreground/5 text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="tabular-nums">{currency}</span>
                  <span aria-hidden className="opacity-50">·</span>
                  <span>B3</span>
                </span>

                {/* Range pills — flat, no container (Fey reference) */}
                <div className="flex items-center gap-0.5">
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
            </div>

      {/* Chart with embedded volume overlay */}
      <div className="px-0 pt-1 pb-2 flex-1 min-h-[320px] relative">
        {data.length === 0 ? (
<div className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground/70 px-6 text-center">
            {loading ? "Carregando…" : "Não temos informações desse ativo nesse tempo grafico, tente outro!"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={finalData}
              margin={{ top: 8, right: 16, bottom: 0, left: 16 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(255,255,255,0.05)"
                horizontal={true}
                vertical={false}
              />
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
                tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
                                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
              />
              <YAxis
yAxisId="price"
                domain={yDomain}
                tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => formatCurrencyShort(v, currency)}
                orientation="right"
              />
              {/* (Volume axis removed; volume bars now render on the
                  price YAxis via the volumeY data field, capped at 15%
                  of the price range to keep the price line clean.) */}
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as { ts: number; ts_real: number; close: number; volume: number };
                  return (
                    <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
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
                    fill: "rgba(200,200,210,0.4)",
                    fontSize: 10,
                  }}
                />
              ) : null}
              {/* Volume bars rendered on the price YAxis at a fixed
                  fraction (15%) of the price range. volumeY is computed
                  in dataWithVolumeY to land at minC..minC+15%·range so the
                  bars sit at the bottom of the chart. */}
              <Bar
                yAxisId="price"
                dataKey="volumeY"
                fill="rgba(156,163,175,0.25)"
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="#9ca3af"
                strokeWidth={1.5}
                fill="transparent"
                isAnimationActive={true}
                animationDuration={650}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Day-range / 52w / Volume / Mkt cap summary — flat stats below, no card */}
      {quote && (
        <div className="px-2 pt-4 pb-2 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-[11px]">
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
    </motion.div>
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