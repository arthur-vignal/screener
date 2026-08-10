/**
 * brapi-correlation.ts — pairwise correlation matrix over historical close
 * prices. Uses Brapi's quote?range=1y&interval=1d historical series.
 */

import { cached } from "./cache";

const CACHE_TTL_SEC = 60 * 60; // 1h

export type CorrelationSeries = {
  symbol: string;
  closes: Array<{ t: number; v: number }>;
};

async function getSeries(symbol: string): Promise<CorrelationSeries | null> {
  return cached(`brapi:corr:series:${symbol}`, CACHE_TTL_SEC, async () => {
    const token = process.env.BRAPI_TOKEN ?? "rgaM31HZQkVunRuafvYgYy";
    const url =
      `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}` +
      `?token=${token}&range=1y&interval=1d`;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Sulfur/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return null;
      const d = (await r.json()) as {
        results?: Array<{ historicalDataPrice?: Array<{ date: number; close: number }> }>;
      };
      const hist = d.results?.[0]?.historicalDataPrice ?? [];
      const closes = hist
        .filter((p) => typeof p.close === "number")
        .map((p) => ({ t: p.date, v: p.close }));
      return closes.length >= 30 ? { symbol, closes } : null;
    } catch {
      return null;
    }
  });
}

function returns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    r.push(closes[i] / closes[i - 1] - 1);
  }
  return r;
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 10) return 0;
  const sa = a.slice(0, n);
  const sb = b.slice(0, n);
  const ma = sa.reduce((s, v) => s + v, 0) / n;
  const mb = sb.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = sa[i] - ma;
    const xb = sb[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export async function getCorrelationMatrix(symbols: string[]): Promise<{
  symbols: string[];
  matrix: number[][]; // matrix[i][j] = pearson(symbols[i], symbols[j])
}> {
  return cached(
    `brapi:corr:matrix:${symbols.sort().join(",")}`,
    CACHE_TTL_SEC,
    async () => {
      const seriesList = await Promise.all(symbols.map((s) => getSeries(s)));
      const valid = seriesList.filter((s): s is CorrelationSeries => s != null);
      if (valid.length === 0) {
        return { symbols: [], matrix: [] };
      }
      // Build return series aligned to the most recent common dates.
      const returnsBySymbol = new Map<string, number[]>();
      for (const s of valid) {
        returnsBySymbol.set(
          s.symbol,
          returns(s.closes.map((p) => p.v)),
        );
      }
      const matrix: number[][] = [];
      for (const a of valid) {
        const row: number[] = [];
        const ra = returnsBySymbol.get(a.symbol)!;
        for (const b of valid) {
          const rb = returnsBySymbol.get(b.symbol)!;
          row.push(pearson(ra, rb));
        }
        matrix.push(row);
      }
      return {
        symbols: valid.map((s) => s.symbol),
        matrix,
      };
    },
  );
}
