import { NextRequest, NextResponse } from "next/server";
import { getBrapiFundamentals } from "@/lib/brapi";

/**
 * /api/asset/[symbol] — single ticker bundle.
 *
 * Returns the quote + fundamentals + a default 1y candle series in
 * one round-trip. The client fetches additional ranges via
 * /api/asset/[symbol]/candles?range=… when the user picks a new
 * time-range pill.
 *
 * Cache: 60s for the bundle (quote can change intraday; fundamentals
 * are stable but we re-validate the ticker exists on every refresh).
 *
 * Returns 404 when the ticker doesn't exist (no Brapi results).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const data = await getBrapiFundamentals(symbol);
  if (!data) {
    return NextResponse.json({ error: "Ticker inválido" }, { status: 404 });
  }

  const q = data.quote;
  const ks = data.keyStatistics ?? {};
  const fd = data.financialData ?? {};
  const profile = data.profile ?? {};

  return NextResponse.json({
    symbol: q.symbol,
    shortName: q.shortName,
    longName: q.longName,
    sector: profile.sectorDisp ?? profile.sector ?? "—",
    industry: profile.industryDisp ?? profile.industry ?? "—",
    currency: q.currency,
    marketState: q.marketState,

    quote: {
      price: q.price,
      prevClose: q.prevClose,
      change: q.change,
      changePercent: q.changePercent,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      dayOpen: q.dayOpen,
      volume: q.volume,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      marketCap: q.marketCap,
      marketTime: q.marketTime,
    },

    metrics: {
      sector: profile.sectorDisp ?? profile.sector ?? "—",
      marketCap: q.marketCap,
      trailingPE: q.trailingPE,
      returnOnEquity: ks.returnOnEquity ?? fd.returnOnEquity ?? null,
      ebitda: fd.ebitda ?? null,
      freeCashflow: fd.freeCashflow ?? ks.freeCashflow ?? null,
      dividendYield: ks.trailingAnnualDividendYield ?? null,
    },

    // Default 1y candles included so the page can paint immediately
    // on first load. The client refetches when the user changes range.
    candles: data.candles,
  });
}