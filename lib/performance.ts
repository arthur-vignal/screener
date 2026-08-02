/**
 * Performance tracking.
 *
 * Given a portfolio (created_at + holdings) or index (universe + filters + ranking),
 * fetch historical candles from each constituent, then compute weighted returns.
 *
 * Returns:
 *   - totalReturn (% from created_at to today)
 *   - annualizedReturn (%)
 *   - maxDrawdown (%)
 *   - bestDay / worstDay (%)
 *   - history: [{ date, value }] for chart
 */

import { getYahooCandles } from "./yahoo";
import { cached } from "./cache";

export type Candle = { date: string; close: number };

export type PerformanceResult = {
  startValue: number;
  endValue: number;
  totalReturn: number; // % from start
  annualizedReturn: number;
  maxDrawdown: number;
  bestDay: number;
  worstDay: number;
  daysHeld: number;
  history: { date: string; value: number }[];
};

/**
 * Fetch daily closes for one symbol since `sinceDate` (unix seconds).
 */
async function getClosesSince(
  symbol: string,
  sinceUnix: number,
): Promise<Candle[]> {
  return cached(
    `cl:${symbol}:${sinceUnix}`,
    6 * 3600, // 6h cache
    async () => {
      try {
        // Always fetch 5Y to ensure we cover sinceDate even for old portfolios
        const candles = await getYahooCandles(symbol, "5y", "1d");
        const filtered: Candle[] = [];
        for (const c of candles) {
          if (c.timestamp >= sinceUnix * 1000) {
            filtered.push({ date: c.date, close: c.close });
          }
        }
        return filtered;
      } catch {
        return [];
      }
    },
  );
}

function alignDates(...series: Candle[][]): string[] {
  // Intersection of all dates
  if (series.length === 0) return [];
  const sets = series.map((s) => new Set(s.map((c) => c.date)));
  const first = series[0];
  return first.filter((c) => sets.every((s) => s.has(c.date))).map((c) => c.date);
}

/**
 * Compute weighted performance of a portfolio.
 *
 * @param holdings - [{ symbol, weight }], weights should sum ~ 1.0 (not strictly required)
 * @param createdAtUnix - unix timestamp seconds of portfolio creation
 * @param initialValue - starting dollar value (default 10000)
 */
export async function computePortfolioPerformance(
  holdings: { symbol: string; weight: number }[],
  createdAtUnix: number,
  initialValue = 10000,
): Promise<PerformanceResult | null> {
  if (holdings.length === 0) return null;

  // Fetch all symbols in parallel
  const series = await Promise.all(
    holdings.map((h) => getClosesSince(h.symbol, createdAtUnix)),
  );

  // Align by date
  const dates = alignDates(...series);
  if (dates.length < 2) {
    return {
      startValue: initialValue,
      endValue: initialValue,
      totalReturn: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      bestDay: 0,
      worstDay: 0,
      daysHeld: 0,
      history: [],
    };
  }

  // Normalize weights to sum to 1
  const totalW = holdings.reduce((a, h) => a + h.weight, 0) || 1;
  const normW = holdings.map((h) => h.weight / totalW);

  // Compute value series
  const history: { date: string; value: number }[] = [];
  let peak = initialValue;
  let maxDD = 0;
  let bestDay = -Infinity;
  let worstDay = Infinity;
  let prevValue = initialValue;

  // Find initial prices (first available close for each symbol)
  const startPrices = series.map((s) => s.find((c) => c.date === dates[0])?.close ?? 0);
  // Skip days where any constituent has 0 price
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    let value = 0;
    let anyZero = false;
    for (let j = 0; j < series.length; j++) {
      const close = series[j].find((c) => c.date === date)?.close ?? 0;
      if (close === 0) {
        anyZero = true;
        break;
      }
      const ratio = startPrices[j] === 0 ? 0 : close / startPrices[j];
      value += normW[j] * initialValue * ratio;
    }
    if (anyZero) continue;
    history.push({ date, value });
    if (value > peak) peak = value;
    const dd = (peak - value) / peak;
    if (dd > maxDD) maxDD = dd;
    if (i > 0) {
      const daily = (value - prevValue) / prevValue;
      if (daily > bestDay) bestDay = daily;
      if (daily < worstDay) worstDay = daily;
    }
    prevValue = value;
  }

  if (history.length < 2) {
    return {
      startValue: initialValue,
      endValue: initialValue,
      totalReturn: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      bestDay: 0,
      worstDay: 0,
      daysHeld: 0,
      history: [],
    };
  }

  const startValue = history[0].value;
  const endValue = history[history.length - 1].value;
  const totalReturn = (endValue - startValue) / startValue;
  const daysHeld = Math.floor(
    (history[history.length - 1].date.localeCompare(history[0].date) !== 0
      ? (Date.parse(history[history.length - 1].date) - Date.parse(history[0].date)) / 86400000
      : 1),
  );
  const years = daysHeld / 365.25;
  const annualizedReturn =
    years > 0 && startValue > 0
      ? Math.pow(endValue / startValue, 1 / years) - 1
      : 0;

  return {
    startValue,
    endValue,
    totalReturn,
    annualizedReturn,
    maxDrawdown: maxDD,
    bestDay: isFinite(bestDay) ? bestDay : 0,
    worstDay: isFinite(worstDay) ? worstDay : 0,
    daysHeld,
    history,
  };
}

/**
 * Compute index performance: each "constituent" is equal-weighted (top N from index).
 * Requires the constituents array to be passed in (from /api/indices/[id]/constituents).
 */
export async function computeIndexPerformance(
  constituents: string[],
  createdAtUnix: number,
): Promise<PerformanceResult | null> {
  if (constituents.length === 0) return null;
  const holdings = constituents.map((s) => ({ symbol: s, weight: 1 / constituents.length }));
  return computePortfolioPerformance(holdings, createdAtUnix, 10000);
}
