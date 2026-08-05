/**
 * Correlation matrix — Pearson correlation between assets' daily returns.
 *
 * Uses 1Y of daily candles to compute percent returns, then pairwise Pearson.
 */

import { getYahooCandles } from "./yahoo";
import { cached } from "./cache";

export type CorrelationMatrix = {
  symbols: string[];
  /** matrix[i][j] = Pearson correlation between symbols[i] and symbols[j] */
  matrix: number[][];
  /** Range used in candles */
  range: "1Y";
  computedAt: number;
};

const DEFAULT_UNIVERSE = [
  "AAPL", "MSFT", "GOOGL", "NVDA", "TSLA",
  "AMZN", "META", "JPM", "BRK.B", "V",
  "BTC-USD", "ETH-USD", "SPY", "QQQ", "GLD",
];

async function loadReturns(symbol: string): Promise<number[] | null> {
  return cached(
    `corr:returns:${symbol}`,
    6 * 60 * 60 * 1000, // 6h cache
    async () => {
      try {
        const candles = await getYahooCandles(symbol, "1y", "1d");
        if (candles.length < 30) return null;
        const returns: number[] = [];
        for (let i = 1; i < candles.length; i++) {
          const prev = candles[i - 1].close;
          if (prev > 0) {
            returns.push((candles[i].close - prev) / prev);
          }
        }
        return returns;
      } catch {
        return null;
      }
    },
  );
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;
  let avgA = 0, avgB = 0;
  for (let i = 0; i < n; i++) {
    avgA += a[i];
    avgB += b[i];
  }
  avgA /= n;
  avgB /= n;
  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - avgA;
    const db = b[i] - avgB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA === 0 || varB === 0) return 0;
  return cov / Math.sqrt(varA * varB);
}

export async function computeCorrelationMatrix(
  symbols: string[] = DEFAULT_UNIVERSE,
): Promise<CorrelationMatrix> {
  const allReturns = await Promise.all(symbols.map((s) => loadReturns(s)));

  const matrix: number[][] = [];
  for (let i = 0; i < symbols.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        row.push(1);
      } else if (j < i) {
        row.push(matrix[j][i]); // symmetric
      } else {
        const a = allReturns[i];
        const b = allReturns[j];
        if (!a || !b) {
          row.push(0);
        } else {
          row.push(pearson(a, b));
        }
      }
    }
    matrix.push(row);
  }

  return {
    symbols,
    matrix,
    range: "1Y",
    computedAt: Date.now(),
  };
}

export const CORRELATION_UNIVERSE = DEFAULT_UNIVERSE;
