import { NextRequest, NextResponse } from "next/server";
import { getYahooCandles } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Candle = {
  date: string;
  timestamp: number;
  close: number;
};

type Result = {
  ticker: string;
  points: { date: string; close: number }[];
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbolsParam = sp.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30); // safety cap

  if (symbols.length === 0) {
    return NextResponse.json({ results: {} });
  }

  try {
    const results: Record<string, Result> = {};

    // Fetch in parallel
    const all = await Promise.allSettled(
      symbols.map(async (s) => {
        const candles = await getYahooCandles(s, "1y", "1d");
        return { ticker: s, points: candles.map((c) => ({ date: c.date, close: c.close })) };
      }),
    );

    for (const r of all) {
      if (r.status === "fulfilled") {
        results[r.value.ticker] = r.value;
      }
    }

    return NextResponse.json({ results, timestamp: Date.now() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
