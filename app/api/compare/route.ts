import { NextRequest, NextResponse } from "next/server";
import { getYahooCandles, YahooCandle } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RANGE_MAP: Record<string, "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"> = {
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "2Y": "2y",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);
  const rangeKey = searchParams.get("range") ?? "1Y";
  const range = RANGE_MAP[rangeKey] ?? "1y";

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  try {
    const series: Record<string, YahooCandle[]> = {};
    // Fetch in parallel with a small concurrency limit
    const limit = 4;
    for (let i = 0; i < symbols.length; i += limit) {
      const batch = symbols.slice(i, i + limit);
      const results = await Promise.allSettled(
        batch.map(async (sym) => ({ sym, data: await getYahooCandles(sym, range, "1d") })),
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          series[r.value.sym] = r.value.data;
        }
      }
    }
    return NextResponse.json({ series });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
