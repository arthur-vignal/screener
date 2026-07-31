/**
 * Simple Moving Average.
 */
export function sma(prices: number[], period: number): number[] {
  const out: number[] = new Array(prices.length).fill(NaN);
  if (prices.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  out[period - 1] = sum / period;
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    out[i] = sum / period;
  }
  return out;
}

/**
 * Relative Strength Index (0-100). >70 overbought, <30 oversold.
 */
export function rsi(prices: number[], period: number = 14): number[] {
  const out: number[] = new Array(prices.length).fill(NaN);
  if (prices.length <= period) return out;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}
