import { NextRequest, NextResponse } from "next/server";
import { getYahooCandles } from "@/lib/yahoo";
import { rsi, sma } from "@/lib/indicators";
import { cached } from "@/lib/cache";
import { vwap } from "@/lib/vwap";
import {
  adx,
  aroon,
  atr,
  bollingerBands,
  cci,
  chaikinMoneyFlow,
  cvar,
  hurstExponent,
  keltnerChannels,
  maxDrawdown,
  mfi,
  obv,
  returns,
  sharpeRatio,
  sortinoRatio,
  stochastic,
  valueAtRisk,
  williamsR,
  zScore,
} from "@/lib/advanced-indicators";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    const data = await cached(`analysis:${ticker}`, 3600, async () => {
      // Fetch 1Y of daily candles
      const candles = await getYahooCandles(ticker, "1y", "1d");
      if (candles.length < 60) {
        return { error: "dados insuficientes" };
      }

      const closes = candles.map((c) => c.close);
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);
      const volumes = candles.map((c) => c.volume);

      // Trend
      const adxSeries = adx(highs, lows, closes, 14);
      // SMA 20 vs SMA 50 pra determinar direção
      const sma20Arr = sma(closes, 20);
      const sma50Arr = sma(closes, 50);
      const last20 = sma20Arr[sma20Arr.length - 1];
      const last50 = sma50Arr[sma50Arr.length - 1];
      const smaTrend = last20 != null && last50 != null
        ? (last20 > last50 ? "up" : "down")
        : "unknown";
      const { aroonUp, aroonDown } = aroon(closes, 14);

      // Momentum
      const rsiSeries = rsi(closes, 14);
      const { k: stochK, d: stochD } = stochastic(highs, lows, closes, 14, 3);
      const williams = williamsR(highs, lows, closes, 14);
      const cciSeries = cci(highs, lows, closes, 20);
      const mfiSeries = mfi(highs, lows, closes, volumes, 14);

      // Volatility
      const bb = bollingerBands(closes, 20, 2);
      const atrSeries = atr(highs, lows, closes, 14);
      const keltner = keltnerChannels(highs, lows, closes, 20, 2);

      // Volume
      const obvSeries = obv(closes, volumes);
      const cmf = chaikinMoneyFlow(highs, lows, closes, volumes, 20);
      const vwapSeries = vwap(closes, volumes);

      // Advanced
      const hurst = hurstExponent(closes);
      const z = zScore(closes, 20);
      const rets = returns(closes);

      // Risk
      const { pct: maxDD } = maxDrawdown(closes);
      const sharpe = sharpeRatio(rets);
      const sortino = sortinoRatio(rets);
      const var95 = valueAtRisk(rets, 0.05);
      const cvar95 = cvar(rets, 0.05);

      return {
        bars: candles.length,
        // Latest values
        latest: {
          adx: adxSeries[adxSeries.length - 1],
          smaTrend,
          rsi: rsiSeries[rsiSeries.length - 1],
          aroonUp: aroonUp[aroonUp.length - 1],
          aroonDown: aroonDown[aroonDown.length - 1],
          stochK: stochK[stochK.length - 1],
          stochD: stochD[stochD.length - 1],
          williams: williams[williams.length - 1],
          cci: cciSeries[cciSeries.length - 1],
          mfi: mfiSeries[mfiSeries.length - 1],
          bbUpper: bb.upper[bb.upper.length - 1],
          bbLower: bb.lower[bb.lower.length - 1],
          bbMiddle: bb.middle[bb.middle.length - 1],
          bbWidth: bb.upper[bb.upper.length - 1] && bb.lower[bb.lower.length - 1] && bb.middle[bb.middle.length - 1]
            ? ((bb.upper[bb.upper.length - 1]! - bb.lower[bb.lower.length - 1]!) / bb.middle[bb.middle.length - 1]!) * 100
            : null,
          atr: atrSeries[atrSeries.length - 1],
          atrPct: atrSeries[atrSeries.length - 1] && closes[closes.length - 1]
            ? (atrSeries[atrSeries.length - 1]! / closes[closes.length - 1]!) * 100
            : null,
          keltnerUpper: keltner.upper[keltner.upper.length - 1],
          keltnerLower: keltner.lower[keltner.lower.length - 1],
          obv: obvSeries[obvSeries.length - 1],
          obvSlope: obvSeries.length > 5 ? obvSeries[obvSeries.length - 1]! - obvSeries[obvSeries.length - 6]! : null,
          cmf: cmf[cmf.length - 1],
          vwap: vwapSeries[vwapSeries.length - 1],
          hurst,
          zScore: z[z.length - 1],
          // Risk
          maxDrawdown: maxDD,
          sharpe,
          sortino,
          var95,
          cvar95,
          // Annualized volatility
          volatility: rets.length > 0 ? Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / rets.length) * Math.sqrt(252) * 100 : null,
        },
        // Recent series for sparkline (last 30 bars)
        series: {
          adx: adxSeries.slice(-30),
          stochK: stochK.slice(-30),
          williams: williams.slice(-30),
          cci: cciSeries.slice(-30),
          mfi: mfiSeries.slice(-30),
          zScore: z.slice(-30),
          obv: obvSeries.slice(-30),
        },
      };
    });

    return NextResponse.json({ ticker, analysis: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
