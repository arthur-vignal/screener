/**
 * brapi-history.ts — fetch historical close series for a single symbol.
 * Cached 1h via the standard cache helper. Used by feature-preview
 * components on the landing page.
 */

import { cached } from "./cache";

export type HistoryPoint = { t: number; v: number };

export async function getHistory(
  symbol: string,
  range = "3mo",
): Promise<HistoryPoint[]> {
  return cached(`brapi:history:${symbol}:${range}`, 3600, async () => {
    const token = process.env.BRAPI_TOKEN ?? "rgaM31HZQkVunRuafvYgYy";
    const url =
      `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}` +
      `?token=${token}&range=${range}&interval=1d`;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Sulfur/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return [];
      const d = (await r.json()) as {
        results?: Array<{ historicalDataPrice?: Array<{ date: number; close: number }> }>;
      };
      const hist = d.results?.[0]?.historicalDataPrice ?? [];
      return hist
        .filter((p) => typeof p.close === "number")
        .map((p) => ({ t: p.date, v: p.close }));
    } catch {
      return [];
    }
  });
}
