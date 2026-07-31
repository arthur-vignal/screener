/**
 * Stock screener with hardcoded list of major US tickers.
 *
 * Why hardcoded? Finnhub's /stock/screener endpoint requires a paid plan.
 * For free tier, we use a curated list of ~80 of the most-traded US stocks
 * and fetch metrics for each via /stock/metric and /quote.
 *
 * Future: if we want full S&P 500, replace this with a dynamic source
 * (e.g. /wigmatic/indexes/constituents or scraping Wikipedia).
 */

import { getFinancials, getProfile, getQuote } from "./finnhub";
import { getSP500Tickers } from "./sp500";
import { cached } from "./cache";

export type StockScreenerRow = {
  ticker: string;
  price: number;
  marketCap: number;
  peRatio: number | null;
  sector: string;
  industry: string;
  changePercent: number;
  yearHigh: number;
  yearLow: number;
  dividendYield: number | null;
  beta: number | null;
};

// S&P 500 constituents dynamically fetched from Wikipedia (cached 24h).
// Falls back to hardcoded list if Wikipedia is unreachable.
async function getTickerUniverse(): Promise<string[]> {
  const constituents = await getSP500Tickers();
  return constituents.map((c) => c.ticker);
}

export async function screenStocks(opts: {
  peMax?: number;
  mcapMin?: number; // in millions USD
  divYieldMin?: number; // in percent
  limit?: number;
}): Promise<StockScreenerRow[]> {
  const cacheKey = `screen:${opts.peMax ?? "any"}:${opts.mcapMin ?? "any"}:${opts.divYieldMin ?? "any"}:${opts.limit ?? "all"}`;

  return cached(cacheKey, 600, async () => {
    // Pega ate 100 tickers do S&P 500 (limite para nao bater rate limit da Finnhub: 60 req/min)
    const universe = (await getTickerUniverse()).slice(0, 100);
    const rows: (StockScreenerRow | null)[] = await Promise.all(
      universe.map(async (ticker): Promise<StockScreenerRow | null> => {
        try {
          const [quote, profile, fins] = await Promise.all([
            getQuote(ticker),
            getProfile(ticker),
            getFinancials(ticker),
          ]);
          if (!quote || !profile) return null;
          const m = fins?.metric ?? {};
          return {
            ticker,
            price: quote.c,
            marketCap: profile.marketCapitalization,
            peRatio: m.peBasicExtraTTM ?? null,
            sector: profile.finnhubIndustry || "—",
            industry: profile.finnhubIndustry || "—",
            changePercent: quote.dp,
            yearHigh: m["52WeekHigh"] ?? 0,
            yearLow: m["52WeekLow"] ?? 0,
            dividendYield: m.dividendYieldIndicatedAnnual ?? null,
            beta: m.beta ?? null,
          };
        } catch {
          return null;
        }
      }),
    );

    const valid = rows.filter((r): r is StockScreenerRow => r !== null);

    // Apply filters
    let filtered = valid;
    if (opts.peMax !== undefined) {
      filtered = filtered.filter((r) => r.peRatio !== null && r.peRatio <= opts.peMax!);
    }
    if (opts.mcapMin !== undefined) {
      filtered = filtered.filter((r) => r.marketCap >= opts.mcapMin!);
    }
    if (opts.divYieldMin !== undefined) {
      filtered = filtered.filter((r) => r.dividendYield !== null && r.dividendYield >= opts.divYieldMin!);
    }

    // Sort by market cap descending
    filtered.sort((a, b) => b.marketCap - a.marketCap);

    return opts.limit ? filtered.slice(0, opts.limit) : filtered;
  });
}
