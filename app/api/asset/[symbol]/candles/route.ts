import { NextRequest, NextResponse } from "next/server";
import { brapiHistorical, type BrapiCandle } from "@/lib/brapi";

/**
 * /api/asset/[symbol]/candles?range=24h|7d|3m|1y|5y|max
 *
 * Brapi supports these ranges: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
 * And these intervals: 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
 *
 * Brapi does NOT support 4h or 6h intervals, so for 1y we resample
 * the 1d series into 4h buckets server-side. 5y and max use 1d
 * directly (~1,250 candles over 5y, well under Brapi's ~5,000 cap).
 *
 * Resolution policy ("B híbrido" — chosen 2026-08-24):
 *   24h   → range=5d, interval=5m   (~80 candles; intraday 5m is the
 *                                      smoothest we can get without
 *                                      fabricating data)
 *   7d    → range=1mo, interval=5m  (~600 candles; same logic)
 *   3m    → range=3mo, interval=30m (~330 candles; 5m over 3mo would
 *                                      blow past Brapi's ~5k cap and
 *                                      silently lose the early candles)
 *   1y    → range=1y, interval=1d   → resample to 4h buckets
 *                                      (~1,300 candles → ~6,500 buckets
 *                                      but resample collapses to ~1,300)
 *   5y    → range=5y, interval=1d   (native daily; ~1,250 candles)
 *   max   → range=5y, interval=1d   (native daily; brapi's max cap is
 *                                      ~5y for most tickers)
 *
 * Migrado pra v2 (2026-08-30): usa `brapiHistorical` (cache interno 5min)
 * em vez do antigo `/api/quote/{t}?range=...&interval=...` legacy.
 *
 * The chart on the client uses recharts type="monotone" to render a
 * smooth curve through these real candle points.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

const VALID_RANGES = ["24h", "7d", "3m", "ytd", "1y", "5y", "max"] as const;
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
      // Intraday 5m candles. Pull 5d so we get yesterday's session too,
      // then slice the last 24h.
      const all = await brapiHistorical(symbol, { range: "5d", interval: "5m" });
      const cutoff = Date.now() - 24 * HOUR;
      return sliceAndFormat(filterTradingHours(all.filter((c) => c.timestamp >= cutoff)));
    }

    case "7d": {
      // 5m candles over the last month; we slice the last 7 days.
      const all = await brapiHistorical(symbol, { range: "1mo", interval: "5m" });
      const cutoff = Date.now() - 7 * 24 * HOUR;
      return sliceAndFormat(filterTradingHours(all.filter((c) => c.timestamp >= cutoff)));
    }

    case "3m": {
      // 30m candles across 3 months (~330 candles; well under brapi's
      // ~5k cap). 5m over 3mo would blow past the cap and silently
      // lose early candles.
      const all = await brapiHistorical(symbol, { range: "3mo", interval: "30m" });
      return sliceAndFormat(filterTradingHours(all));
    }

    case "ytd": {
      // Year-to-date: pull 1y daily and slice candles since Jan 1 of
      // current year (Brasília time).
      const daily = await brapiHistorical(symbol, { range: "1y", interval: "1d" });
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      return sliceAndFormat(
        filterTradingHours(daily.filter((c) => c.timestamp >= yearStart.getTime())),
      );
    }

    case "1y": {
      // Daily candles over 1y resampled to 4h buckets.
      const daily = await brapiHistorical(symbol, { range: "1y", interval: "1d" });
      return sliceAndFormat(resample(filterTradingHours(daily), 4 * HOUR));
    }

    case "5y": {
      // Daily candles over 5y, native (no resample). ~1,250 candles.
      const daily = await brapiHistorical(symbol, { range: "5y", interval: "1d" });
      return sliceAndFormat(filterTradingHours(daily));
    }

    case "max": {
      // Brapi's "max" cap is ~5y for most tickers. If the asset has
      // less history than that, hide the 5y button (handled on the
      // client by inspecting candle count) and use the daily series.
      const daily = await brapiHistorical(symbol, { range: "5y", interval: "1d" });
      return sliceAndFormat(filterTradingHours(daily));
    }
  }
}

/**
 * Defensive filter — drops candles that fall outside B3 trading hours.
 * Brapi already returns candles within the trading window, so this is
 * a no-op for intraday data.
 *
 * Two regimes:
 *  - Intraday (5m, 15m, 1h): timestamp is the actual trade time, so
 *    we drop anything outside 10:00–17:45 BRT or on weekends.
 *  - Daily (1d): brapi timestamps the candle at 00:00 BRT = 03:00 UTC,
 *    which after our BRT shift becomes 00:00 UTC. That fails the
 *    10:00–17:45 hour check and would drop EVERY daily candle — so for
 *    daily candles we only filter weekends.
 *
 * We detect "daily" by checking if the BRT-aligned timestamp sits at
 * the 00:00 mark. If so, it's a daily bucket and we only skip weekends.
 */
function filterTradingHours<
  T extends { timestamp: number },
>(candles: T[]): T[] {
  // BRT is UTC-3 (no DST since 2019).
  const BRT_OFFSET_HOURS = -3;
  return candles.filter((c) => {
    const brt = new Date(c.timestamp + BRT_OFFSET_HOURS * 3600 * 1000);
    const day = brt.getUTCDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return false;
    const h = brt.getUTCHours();
    const m = brt.getUTCMinutes();
    // Daily candles land at 00:00 BRT (UTC after shift). Skip the hour
    // check for those — they're aggregated over the whole session.
    if (h === 0 && m === 0) return true;
    const t = h * 60 + m;
    return t >= 10 * 60 && t <= 17 * 60 + 45;
  });
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