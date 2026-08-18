import { NextRequest, NextResponse } from "next/server";
import { getBrapiCandles, type BrapiCandle } from "@/lib/brapi";
import { cached } from "@/lib/cache";

/**
 * /api/asset/[symbol]/candles?range=24h|7d|3m|1y|5y|max
 *
 * Brapi supports these ranges: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
 * And these intervals: 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
 *
 * Brapi does NOT support 4h or 6h intervals, so we resample 1d candles
 * into 4h/6h buckets server-side. This keeps the client simple and the
 * cache key per-range.
 *
 * Resample rules:
 *   24h   → range=5d, interval=5m   (intraday, slice last 24h)
 *   7d    → range=1mo, interval=15m (slice last 7 days)
 *   3m    → range=3mo, interval=1h  (native)
 *   1y    → range=1y, interval=1d   → resample to 4h buckets
 *   5y    → range=5y, interval=1d   → resample to 6h buckets
 *   max   → range=5y, interval=1d   → resample to 6h buckets
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

const VALID_RANGES = ["24h", "7d", "3m", "1y", "5y", "max"] as const;
type Range = (typeof VALID_RANGES)[number];

const HOUR = 3600 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const rangeParam = (req.nextUrl.searchParams.get("range") ?? "1y").toLowerCase();
  if (!VALID_RANGES.includes(rangeParam as Range)) {
    return NextResponse.json(
      { error: `range must be one of: ${VALID_RANGES.join(", ")}` },
      { status: 400 },
    );
  }
  const range = rangeParam as Range;

  try {
    const candles = await fetchCandlesForRange(symbol, range);
    return NextResponse.json({ candles });
  } catch (err) {
    return NextResponse.json(
      { error: "Ticker inválido", detail: String(err) },
      { status: 404 },
    );
  }
}

async function fetchCandlesForRange(
  symbol: string,
  range: Range,
): Promise<Array<{
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}>> {
  switch (range) {
    case "24h": {
      // Intraday: brapi returns 5m candles for the current trading day.
      // Pull 5d so we get yesterday's session too, then slice last 24h.
      const all = await cached(`brapiIntraday:${symbol}`, 60, () =>
        getBrapiCandlesRaw(symbol, "5d", "5m"),
      );
      const cutoff = Date.now() - 24 * HOUR;
      return sliceAndFormat(all.filter((c) => c.timestamp >= cutoff));
    }

    case "7d": {
      // 15m candles, last 7 days.
      const all = await cached(`brapiIntraday15:${symbol}`, 60, () =>
        getBrapiCandlesRaw(symbol, "1mo", "15m"),
      );
      const cutoff = Date.now() - 7 * 24 * HOUR;
      return sliceAndFormat(all.filter((c) => c.timestamp >= cutoff));
    }

    case "3m": {
      const all = await cached(`brapiHourly:${symbol}`, 120, () =>
        getBrapiCandlesRaw(symbol, "3mo", "1h"),
      );
      return sliceAndFormat(all);
    }

    case "1y": {
      const daily = await cached(`brapiDaily1y:${symbol}`, 300, () =>
        getBrapiCandlesRaw(symbol, "1y", "1d"),
      );
      return sliceAndFormat(resample(daily, 4 * HOUR));
    }

    case "5y": {
      const daily = await cached(`brapiDaily5y:${symbol}`, 300, () =>
        getBrapiCandlesRaw(symbol, "5y", "1d"),
      );
      return sliceAndFormat(resample(daily, 6 * HOUR));
    }

    case "max": {
      // Brapi's "max" cap is ~5y for most tickers. If the asset has
      // less history than that, hide the 5y button (handled on the
      // client by inspecting candle count) and use the daily series
      // resampled to 6h.
      const daily = await cached(`brapiDailyMax:${symbol}`, 300, () =>
        getBrapiCandlesRaw(symbol, "5y", "1d"),
      );
      return sliceAndFormat(resample(daily, 6 * HOUR));
    }
  }
}

async function getBrapiCandlesRaw(
  symbol: string,
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max",
  interval: "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo",
): Promise<BrapiCandle[]> {
  // We bypass getBrapiCandles' own cache because we control the
  // cache key per range+interval above. But we DO need to include
  // the Brapi PRO token, otherwise the upstream returns 401.
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
  const params: Record<string, string> = { range, interval };
  if (token) params.token = token;
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(
    `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?${qs}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  const data = (await r.json()) as {
    results?: Array<{
      historicalDataPrice?: Array<{
        date: number;
        open: number;
        high: number;
        low: number;
        close: number;
        adjustedClose: number;
        volume: number;
      }>;
    }>;
  };
  const raw = data.results?.[0]?.historicalDataPrice ?? [];
  return raw.map((c) => ({
    date: new Date(c.date * 1000).toISOString().slice(0, 10),
    timestamp: c.date * 1000,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    adjClose: c.adjustedClose,
    volume: c.volume,
  }));
}

/**
 * Resample daily candles into N-hour buckets. Each bucket:
 *   open   = first open
 *   high   = max high
 *   low    = min low
 *   close  = last close
 *   volume = sum volume
 *   adjClose = last adjClose
 *   timestamp = last candle timestamp
 *   date = YYYY-MM-DD of last candle
 */
function resample(
  candles: BrapiCandle[],
  bucketMs: number,
): Array<{
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}> {
  const out: Array<{
    date: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
  }> = [];

  let bucketStart = -1;
  let bucket: {
    date: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
  } | null = null;

  for (const c of candles) {
    const bStart = Math.floor(c.timestamp / bucketMs) * bucketMs;
    if (bStart !== bucketStart) {
      if (bucket) out.push(bucket);
      bucketStart = bStart;
      bucket = {
        date: c.date,
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        adjClose: c.adjClose,
        volume: c.volume,
      };
    } else if (bucket) {
      bucket.high = Math.max(bucket.high, c.high);
      bucket.low = Math.min(bucket.low, c.low);
      bucket.close = c.close;
      bucket.adjClose = c.adjClose;
      bucket.volume += c.volume;
      bucket.timestamp = c.timestamp;
      bucket.date = c.date;
    }
  }
  if (bucket) out.push(bucket);
  return out;
}

function sliceAndFormat(candles: Array<{
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}>): Array<{
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}> {
  // Sort by timestamp ascending and trim invalid entries.
  return candles
    .filter((c) => Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}