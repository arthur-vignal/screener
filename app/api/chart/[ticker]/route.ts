import { NextRequest, NextResponse } from "next/server";
import { getYahooCandles } from "@/lib/yahoo";
import { isBrazilianTicker } from "@/lib/brapi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RANGE_MAP: Record<string, "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"> = {
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "2Y": "2y",
  "5Y": "5y",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase().replace(/\.SA$/, "");
  const { searchParams } = new URL(req.url);
  const rangeKey = searchParams.get("range") ?? "1Y";
  const range = RANGE_MAP[rangeKey] ?? "1y";

  // B3 tickers need the `.SA` suffix for Yahoo Finance.
  const yahooSymbol = isBrazilianTicker(ticker) ? `${ticker}.SA` : ticker;

  try {
    const candles = await getYahooCandles(yahooSymbol, range, "1d");
    return NextResponse.json({
      ticker,
      range: rangeKey,
      source: "yahoo",
      currency: isBrazilianTicker(ticker) ? "BRL" : "USD",
      points: candles,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
