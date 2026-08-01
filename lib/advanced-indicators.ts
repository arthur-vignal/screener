/**
 * Advanced technical indicators based on academic literature.
 * Sources referenced:
 *  - Wilder (1978) "New Concepts in Technical Trading Systems" — RSI, ATR, ADX, Parabolic SAR
 *  - Bollinger (1986) — Bollinger Bands
 *  - Kaufman (2013) "Trading Systems and Methods" — Keltner, multiple MAs
 *  - Achelis (2001) "Technical Analysis from A to Z" — Stochastic, Williams %R, CCI, MFI
 *  - Mandelbrot (1963) / Peters (1994) "Fractal Market Analysis" — Hurst exponent, fractal dim
 *  - Lo (1991) "Long-Term Memory in Stock Market Returns" — Hurst exponent estimator
 *  - Hurst (1951) — original rescaled range method
 *  - Sortino & Price (1994) — Sortino ratio
 *  - Magdon-Ismail et al. — Maximum Likelihood Estimation of Hurst exponent
 */

export type IndicatorResult = number | null;

// === TREND ===
export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number[] {
  if (highs.length < period + 1) return new Array(highs.length).fill(null);
  const out: number[] = new Array(highs.length).fill(null);
  const trs: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const up = highs[i] - highs[i - 1];
    const down = lows[i - 1] - lows[i];
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    trs.push(tr);
  }

  if (trs.length < period) return out;

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;
  for (let i = 0; i < period; i++) {
    smoothedTR += trs[i];
    smoothedPlusDM += plusDM[i];
    smoothedMinusDM += minusDM[i];
  }

  for (let i = period - 1; i < highs.length - 1; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trs[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i];
    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    if (i === period - 1) {
      out[i + 1] = dx;
    } else {
      out[i + 1] = (out[i]! * (period - 1) + dx) / period;
    }
  }
  return out;
}

export function aroon(prices: number[], period = 14): { aroonUp: number[]; aroonDown: number[] } {
  const aroonUp: number[] = new Array(prices.length).fill(null);
  const aroonDown: number[] = new Array(prices.length).fill(null);
  for (let i = period - 1; i < prices.length; i++) {
    let highIdx = 0;
    let lowIdx = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (prices[j]! > prices[i - highIdx]!) highIdx = i - j;
      if (prices[j]! < prices[i - lowIdx]!) lowIdx = i - j;
    }
    aroonUp[i] = ((period - highIdx) / period) * 100;
    aroonDown[i] = ((period - lowIdx) / period) * 100;
  }
  return { aroonUp, aroonDown };
}

// === MOMENTUM ===
export function stochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
): { k: number[]; d: number[] } {
  const k: number[] = new Array(closes.length).fill(null);
  const d: number[] = new Array(closes.length).fill(null);
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const ll = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    k[i] = hh === ll ? 50 : ((closes[i]! - ll) / (hh - ll)) * 100;
  }
  for (let i = kPeriod - 1 + dPeriod - 1; i < closes.length; i++) {
    const slice = k.slice(i - dPeriod + 1, i + 1);
    d[i] = slice.reduce((a, b) => a + (b ?? 0), 0) / dPeriod;
  }
  return { k, d };
}

export function williamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number[] {
  const r: number[] = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    r[i] = hh === ll ? -50 : ((hh - closes[i]!) / (hh - ll)) * -100;
  }
  return r;
}

export function cci(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20,
): number[] {
  const tp = closes.map((c, i) => (highs[i]! + lows[i]! + c) / 3);
  const sma = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const out: number[] = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const slice = tp.slice(i - period + 1, i + 1);
    const mean = sma(slice);
    const meanDeviation =
      slice.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    out[i] = meanDeviation === 0 ? 0 : (tp[i]! - mean) / (0.015 * meanDeviation);
  }
  return out;
}

export function mfi(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 14,
): number[] {
  const tp = closes.map((c, i) => (highs[i]! + lows[i]! + c) / 3);
  const rmf = tp.map((t, i) => t * (volumes[i] ?? 0));
  const out: number[] = new Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j]! > tp[j - 1]!) posFlow += rmf[j]!;
      else negFlow += rmf[j]!;
    }
    const total = posFlow + negFlow;
    out[i] = total === 0 ? 50 : 100 - 100 / (1 + posFlow / negFlow);
  }
  return out;
}

// === VOLATILITY ===
export function bollingerBands(
  prices: number[],
  period = 20,
  stdDev = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(prices, period);
  const upper: number[] = new Array(prices.length).fill(null);
  const lower: number[] = new Array(prices.length).fill(null);
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = middle[i]!;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper[i] = mean + stdDev * std;
    lower[i] = mean - stdDev * std;
  }
  return { upper, middle, lower };
}

export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number[] {
  const trs: number[] = [0];
  for (let i = 1; i < highs.length; i++) {
    trs.push(
      Math.max(
        highs[i]! - lows[i]!,
        Math.abs(highs[i]! - closes[i - 1]!),
        Math.abs(lows[i]! - closes[i - 1]!),
      ),
    );
  }
  const out: number[] = new Array(trs.length).fill(null);
  if (trs.length < period) return out;
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]!) / period;
    out[i] = prev;
  }
  return out;
}

export function keltnerChannels(
  highs: number[],
  lows: number[],
  closes: number[],
  emaPeriod = 20,
  multiplier = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = ema(closes, emaPeriod);
  const a = atr(highs, lows, closes, emaPeriod);
  const upper: number[] = new Array(closes.length).fill(null);
  const lower: number[] = new Array(closes.length).fill(null);
  for (let i = emaPeriod - 1; i < closes.length; i++) {
    if (a[i] == null || middle[i] == null) continue;
    upper[i] = middle[i]! + multiplier * a[i]!;
    lower[i] = middle[i]! - multiplier * a[i]!;
  }
  return { upper, middle, lower };
}

// === VOLUME ===
export function obv(closes: number[], volumes: number[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i]! > closes[i - 1]!) out.push(out[i - 1]! + (volumes[i] ?? 0));
    else if (closes[i]! < closes[i - 1]!) out.push(out[i - 1]! - (volumes[i] ?? 0));
    else out.push(out[i - 1]!);
  }
  return out;
}

export function vwap(closes: number[], volumes: number[]): number[] {
  const out: number[] = [];
  let cumVol = 0;
  let cumPV = 0;
  for (let i = 0; i < closes.length; i++) {
    cumPV += closes[i]! * (volumes[i] ?? 0);
    cumVol += volumes[i] ?? 0;
    out.push(cumVol === 0 ? closes[i]! : cumPV / cumVol);
  }
  return out;
}

export function chaikinMoneyFlow(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 20,
): number[] {
  const mfv = closes.map((c, i) => {
    const range = highs[i]! - lows[i]!;
    if (range === 0) return 0;
    return ((closes[i]! - lows[i]!) - (highs[i]! - closes[i]!)) / range * (volumes[i] ?? 0);
  });
  return sma(mfv, period);
}

// === ADVANCED / FRACTAL ===
/**
 * Hurst exponent estimator via Rescaled Range (R/S) analysis.
 * H < 0.5: mean-reverting
 * H = 0.5: random walk
 * H > 0.5: trending
 */
export function hurstExponent(prices: number[], maxLag = 20): number {
  if (prices.length < maxLag * 2) return 0.5;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i]! / prices[i - 1]!));
  }
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  if (std === 0) return 0.5;

  // For each lag, compute R/S
  const points: { x: number; y: number }[] = [];
  for (let lag = 4; lag <= maxLag; lag++) {
    const numSegments = Math.floor(n / lag);
    if (numSegments < 2) continue;
    let rsSum = 0;
    for (let s = 0; s < numSegments; s++) {
      const segment = returns.slice(s * lag, (s + 1) * lag);
      const segMean = segment.reduce((a, b) => a + b, 0) / lag;
      const adjusted = segment.map((v) => v - segMean);
      let cumSum = 0;
      const cumSums: number[] = [];
      for (const a of adjusted) {
        cumSum += a;
        cumSums.push(cumSum);
      }
      const range = Math.max(...cumSums) - Math.min(...cumSums);
      const segStd = Math.sqrt(adjusted.reduce((a, b) => a + b ** 2, 0) / lag);
      if (segStd > 0) rsSum += range / segStd;
    }
    const rsAvg = rsSum / numSegments;
    points.push({ x: Math.log(lag), y: Math.log(rsAvg) });
  }

  if (points.length < 2) return 0.5;

  // Linear regression of log(R/S) on log(lag)
  const nPts = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (nPts * sumXY - sumX * sumY) / (nPts * sumXX - sumX * sumX);
  return Math.max(0, Math.min(1, slope));
}

/**
 * Z-score (standardized residual from rolling mean).
 * |Z| > 2 = significant deviation from trend.
 */
export function zScore(prices: number[], period = 20): number[] {
  const mean = sma(prices, period);
  const out: number[] = new Array(prices.length).fill(null);
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const m = mean[i]!;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - m) ** 2, 0) / period);
    out[i] = std === 0 ? 0 : (prices[i]! - m) / std;
  }
  return out;
}

/**
 * Pearson correlation between two return series.
 */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);
  const aMean = aSlice.reduce((s, v) => s + v, 0) / n;
  const bMean = bSlice.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let aSq = 0;
  let bSq = 0;
  for (let i = 0; i < n; i++) {
    const aDiff = aSlice[i]! - aMean;
    const bDiff = bSlice[i]! - bMean;
    num += aDiff * bDiff;
    aSq += aDiff * aDiff;
    bSq += bDiff * bDiff;
  }
  const denom = Math.sqrt(aSq * bSq);
  return denom === 0 ? 0 : num / denom;
}

// === RISK METRICS ===
/**
 * Sharpe ratio (annualized): assumes risk-free rate of 0 for simplicity.
 */
export function sharpeRatio(returns: number[], annualizationFactor = 252): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length);
  return std === 0 ? 0 : (mean / std) * Math.sqrt(annualizationFactor);
}

/**
 * Sortino ratio (uses downside deviation only).
 */
export function sortinoRatio(returns: number[], annualizationFactor = 252): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downside = returns.filter((r) => r < 0);
  if (downside.length === 0) return mean > 0 ? Infinity : 0;
  const downDev = Math.sqrt(
    downside.reduce((a, b) => a + b ** 2, 0) / downside.length,
  );
  return downDev === 0 ? 0 : (mean / downDev) * Math.sqrt(annualizationFactor);
}

/**
 * Maximum drawdown: largest peak-to-trough decline.
 */
export function maxDrawdown(prices: number[]): { value: number; pct: number } {
  if (prices.length === 0) return { value: 0, pct: 0 };
  let peak = prices[0]!;
  let maxDd = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return { value: maxDd * peak, pct: maxDd * 100 };
}

/**
 * Calmar ratio: annualized return / max drawdown.
 */
export function calmarRatio(prices: number[], annualizationFactor = 252): number {
  if (prices.length < 2) return 0;
  const totalReturn = (prices[prices.length - 1]! - prices[0]!) / prices[0]!;
  const days = prices.length;
  const annualized = totalReturn * (annualizationFactor / days);
  const { pct } = maxDrawdown(prices);
  return pct === 0 ? 0 : annualized / (pct / 100);
}

/**
 * Historical Value at Risk (VaR) at a confidence level.
 * E.g. VaR(0.05) = the loss that is exceeded 5% of the time.
 */
export function valueAtRisk(returns: number[], confidence = 0.05): number {
  if (returns.length < 2) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor(confidence * sorted.length);
  return -sorted[idx]! * 100; // positive number = loss %
}

/**
 * Conditional VaR (CVaR / Expected Shortfall):
 * average loss in the worst (1-confidence) tail.
 */
export function cvar(returns: number[], confidence = 0.05): number {
  if (returns.length < 2) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.floor(confidence * sorted.length);
  if (cutoff === 0) return 0;
  const tail = sorted.slice(0, cutoff);
  const avg = tail.reduce((a, b) => a + b, 0) / tail.length;
  return -avg * 100;
}

// === HELPERS ===
function sma(prices: number[], period: number): number[] {
  const out: number[] = new Array(prices.length).fill(null);
  if (prices.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i]!;
  out[period - 1] = sum / period;
  for (let i = period; i < prices.length; i++) {
    sum += prices[i]! - prices[i - period]!;
    out[i] = sum / period;
  }
  return out;
}

function ema(prices: number[], period: number): number[] {
  const out: number[] = new Array(prices.length).fill(null);
  if (prices.length < period) return out;
  const k = 2 / (period + 1);
  let prev = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < prices.length; i++) {
    prev = prices[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function returns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    out.push((prices[i]! - prices[i - 1]!) / prices[i - 1]!);
  }
  return out;
}
