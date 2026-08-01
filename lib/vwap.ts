/**
 * VWAP (Volume-Weighted Average Price) — intraday style cumulative.
 * Note: This is a simplified daily-candle VWAP, not true tick-by-tick.
 */

export function vwap(prices: number[], volumes: number[]): number[] {
  const out: number[] = [];
  let cumVol = 0;
  let cumPV = 0;
  for (let i = 0; i < prices.length; i++) {
    cumPV += prices[i] * (volumes[i] ?? 0);
    cumVol += volumes[i] ?? 0;
    out.push(cumVol === 0 ? prices[i] : cumPV / cumVol);
  }
  return out;
}
