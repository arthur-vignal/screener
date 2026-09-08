import { NextRequest, NextResponse } from "next/server";
import { brapiHistorical } from "@/lib/brapi";

/**
 * /api/forecast/[symbol]/history — últimos 90 pregões do ticker.
 *
 * Alimenta o histórico do PriceForecastChart (linha branca sólida antes do
 * ponto "agora"). Cache 24h (dado histórico não muda).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 20;

type HistoryPoint = {
  date: string; // YYYY-MM-DD
  close: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  // Pede 6mo e pega os últimos 90 pregões (~ 4.5 meses úteis).
  const candles = await brapiHistorical(symbol, {
    range: "6mo",
    interval: "1d",
  });

  const series: HistoryPoint[] = candles
    .slice(-90)
    .map((c) => ({ date: c.date, close: c.close }))
    .filter((p) => p.close > 0 && Number.isFinite(p.close));

  return NextResponse.json(
    { symbol, history: series },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}