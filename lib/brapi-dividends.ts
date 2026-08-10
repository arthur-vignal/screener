/**
 * brapi-dividends.ts — fetch cash-dividend history for any ticker via
 * Brapi's quote endpoint with fundamental=true&dividends=true. Cached
 * per ticker for 24h.
 */

import { cached } from "./cache";

export type CashDividend = {
  exDate: string; // ISO date — last day with right to receive
  paymentDate: string;
  rate: number; // R$ per share
  label: string; // "JCP" | "RENDIMENTO" | "DIVIDENDO"
  approvedOn: string | null;
};

const CACHE_TTL_SEC = 24 * 60 * 60; // 24h

export async function getDividendsFor(
  symbol: string,
): Promise<CashDividend[]> {
  return cached(`brapi:dividends:${symbol}`, CACHE_TTL_SEC, async () => {
    const token = process.env.BRAPI_TOKEN ?? "rgaM31HZQkVunRuafvYgYy";
    const url =
      `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}` +
      `?token=${token}&fundamental=true&dividends=true`;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Sulfur/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return [];
      const d = (await r.json()) as { results?: Array<{ dividendsData?: { cashDividends?: any[] } }> };
      const cash: any[] = d.results?.[0]?.dividendsData?.cashDividends ?? [];
      return cash.map((c) => ({
        exDate: c.lastDatePrior,
        paymentDate: c.paymentDate,
        rate: Number(c.rate),
        label: c.label ?? "DIVIDENDO",
        approvedOn: c.approvedOn,
      }));
    } catch {
      return [];
    }
  });
}

/** Sum trailing-12-month dividends per share for a symbol. */
export async function ttmDividendsPerShare(
  symbol: string,
): Promise<number> {
  const divs = await getDividendsFor(symbol);
  const oneYearAgo = new Date(Date.now() - 365 * 86400_000);
  let total = 0;
  for (const d of divs) {
    const ex = new Date(d.exDate);
    if (ex >= oneYearAgo) total += d.rate;
  }
  return total;
}
