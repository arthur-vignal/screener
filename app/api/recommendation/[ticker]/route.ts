import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getYahooCandles } from "@/lib/yahoo";
import { sma, rsi } from "@/lib/indicators";
import {
  adx,
  sharpeRatio,
  returns,
  maxDrawdown,
  zScore,
} from "@/lib/advanced-indicators";
import { quantRecommendation } from "@/lib/quant-recommendation";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    const result = await cached(`quant-rec:${ticker}`, 1800, async () => {
      const candles = await getYahooCandles(ticker, "1y", "1d");
      if (candles.length < 60) {
        return { error: "dados insuficientes" };
      }

      const closes = candles.map((c) => c.close);
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);

      const adxSeries = adx(highs, lows, closes, 14);
      const rsiSeries = rsi(closes, 14);
      const sma20Arr = sma(closes, 20);
      const sma50Arr = sma(closes, 50);
      const last20 = sma20Arr[sma20Arr.length - 1];
      const last50 = sma50Arr[sma50Arr.length - 1];
      const smaTrend: "up" | "down" | "unknown" =
        last20 != null && last50 != null
          ? last20 > last50
            ? "up"
            : "down"
          : "unknown";

      const rets = returns(closes);
      const sharpe = sharpeRatio(rets);
      const mddResult = maxDrawdown(closes);
      const mdd = mddResult?.pct ?? null;
      const z = zScore(closes, 20);

      const last = candles.length - 1;
      const rec = quantRecommendation({
        adx: adxSeries[last] ?? null,
        smaTrend,
        rsi: rsiSeries[last] ?? null,
        volatility: rets.length > 0
          ? Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / rets.length) * Math.sqrt(252) * 100
          : null,
        sharpe,
        maxDrawdown: mdd != null ? Number(mdd) : null,
        zScore: z[last] ?? null,
      });

      return { recommendation: rec };
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
