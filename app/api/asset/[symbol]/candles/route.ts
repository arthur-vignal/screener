import { NextRequest, NextResponse } from "next/server";
import { getBrapiCandles, type BrapiCandle } from "@/lib/brapi";

/**
 * /api/asset/[symbol]/candles?range=1mo|3mo|6mo|1y|5y|max
 *
 * Returns just the candle series for the requested range. Used by
 * the chart when the user picks a different time pill.
 *
 * Cache: 5min per (symbol, range).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"] as const;
type Range = (typeof VALID_RANGES)[number];

// Brapi only supports these ranges natively; map the rest.
const BRAPI_RANGE: Record<Range, "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | undefined> = {
  "1d": undefined, // intraday: brapi returns 1d data anyway
  "5d": undefined,
  "1mo": "1mo",
  "3mo": "3mo",
  "6mo": "6mo",
  "1y": "1y",
  "2y": "2y",
  "5y": "5y",
  "max": "5y", // brapi caps at 5y for daily; sample longer by chaining if needed later
};

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
    // For intraday ranges, hit brapi with 1mo interval=1d then slice;
    // for monthly+ ranges, use the mapped value.
    const brapiRange = BRAPI_RANGE[range];

    if (!brapiRange) {
      // 1d/5d — fetch last 5 days daily and slice
      const all = await getBrapiCandles(symbol, "1mo", "1d");
      const cutoff =
        range === "1d"
          ? Date.now() - 24 * 3600 * 1000
          : Date.now() - 5 * 24 * 3600 * 1000;
      const candles = all.filter((c: BrapiCandle) => c.timestamp >= cutoff);
      return NextResponse.json({ candles });
    }

    const candles = await getBrapiCandles(symbol, brapiRange, "1d");
    return NextResponse.json({ candles });
  } catch (err) {
    return NextResponse.json(
      { error: "Ticker inválido", detail: String(err) },
      { status: 404 },
    );
  }
}