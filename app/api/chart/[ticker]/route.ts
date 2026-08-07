import { NextRequest, NextResponse } from "next/server";
import { getYahooCandles } from "@/lib/yahoo";
import { getBrapiCandles, isBrazilianTicker } from "@/lib/brapi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RANGE_MAP: Record<string, "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"> = {
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "2Y": "2y",
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

  // Brazilian B3 tickers (PETR4, VALE3, ITUB4, etc.) -> Brapi.
  // Yahoo often 404s for raw BR tickers, so we route them explicitly.
  if (isBrazilianTicker(ticker)) {
    try {
      const candles = await getBrapiCandles(ticker, range, "1d");
      return NextResponse.json({
        ticker,
        range: rangeKey,
        source: "brapi",
        currency: "BRL",
        points: candles,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  try {
    const candles = await getYahooCandles(ticker, range, "1d");
    return NextResponse.json({
      ticker,
      range: rangeKey,
      source: "yahoo",
      points: candles,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
