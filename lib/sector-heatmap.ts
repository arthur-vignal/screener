/**
 * Sector performance aggregator.
 * Groups top stocks by sector and computes average performance.
 */

import { cached } from "./cache";
import { screenStocks } from "./screener";
import { getYahooCandles } from "./yahoo";

export type SectorPerformance = {
  sector: string;
  count: number;
  avgChangePct: number;
  bestTicker: string;
  bestChangePct: number;
  worstTicker: string;
  worstChangePct: number;
};

export async function getSectorPerformance(
  limit = 100,
  range: "1mo" | "3mo" | "6mo" | "1y" = "1mo",
): Promise<SectorPerformance[]> {
  return cached(`sectorperf:${limit}:${range}`, 600, async () => {
    const stocks = await screenStocks({ limit });
    if (stocks.length === 0) return [];

    // Group by sector
    const bySector = new Map<string, typeof stocks>();
    for (const s of stocks) {
      const key = s.industry || "Outros";
      if (!bySector.has(key)) bySector.set(key, []);
      bySector.get(key)!.push(s);
    }

    const out: SectorPerformance[] = [];
    for (const [sector, members] of bySector) {
      // Limit to top 10 members per sector to keep API calls reasonable
      const sample = members.slice(0, 10);
      const results = await Promise.allSettled(
        sample.map(async (s) => {
          const candles = await getYahooCandles(s.ticker, range, "1d");
          if (candles.length < 2) return { ticker: s.ticker, changePct: 0 };
          const first = candles[0].close;
          const last = candles[candles.length - 1].close;
          return {
            ticker: s.ticker,
            changePct: first === 0 ? 0 : ((last / first - 1) * 100),
          };
        }),
      );
      const valid = results
        .filter((r): r is PromiseFulfilledResult<{ ticker: string; changePct: number }> => r.status === "fulfilled")
        .map((r) => r.value);
      if (valid.length === 0) continue;
      const avg = valid.reduce((s, r) => s + r.changePct, 0) / valid.length;
      const best = valid.reduce((a, b) => (b.changePct > a.changePct ? b : a));
      const worst = valid.reduce((a, b) => (b.changePct < a.changePct ? b : a));
      out.push({
        sector,
        count: members.length,
        avgChangePct: avg,
        bestTicker: best.ticker,
        bestChangePct: best.changePct,
        worstTicker: worst.ticker,
        worstChangePct: worst.changePct,
      });
    }

    out.sort((a, b) => b.avgChangePct - a.avgChangePct);
    return out;
  });
}
