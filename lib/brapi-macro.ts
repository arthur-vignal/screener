/**
 * brapi-macro.ts — single source of truth for Brazilian macro indicators.
 *
 * Fetches /v2/macro?symbols=... from Brapi and caches for 1 hour. Returns
 * a normalized shape with a small sparkline (last 6 observations).
 */

import { cached } from "./cache";

export type MacroSeries = {
  slug: string;
  name: string;
  unit: string;
  category: string;
  frequency: "daily" | "monthly" | "annual" | string;
  last: number;
  lastDate: string;
  sparkline: number[];
  description: string;
};

const SYMBOLS = [
  "selic",
  "cdi",
  "ipca12m",
  "igpm",
  "ibcbr",
  "pibmensal",
  "desemprego",
] as const;

const CACHE_KEY = "brapi:macro:v1";
const CACHE_TTL_SEC = 60 * 60; // 1 hour

function formatSeries(raw: any): MacroSeries | null {
  const series = raw?.series;
  const obs: Array<{ date: string; value: number }> = raw?.observations ?? [];
  if (!series || obs.length === 0) return null;
  const last = obs[obs.length - 1];
  const sparkline = obs.slice(-6).map((o) => o.value);
  return {
    slug: series.slug,
    name: series.name,
    unit: series.unit,
    category: series.category,
    frequency: series.frequency,
    last: last.value,
    lastDate: last.date,
    sparkline,
    description: series.description ?? "",
  };
}

export async function getMacroSeries(): Promise<MacroSeries[]> {
  return cached(CACHE_KEY, CACHE_TTL_SEC, async () => {
    const token = process.env.BRAPI_TOKEN ?? "rgaM31HZQkVunRuafvYgYy";
    const url =
      `https://brapi.dev/api/v2/macro?token=${token}` +
      `&symbols=${SYMBOLS.join(",")}`;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Sulfur/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) return [];
      const data = (await r.json()) as { results: any[] };
      const out: MacroSeries[] = [];
      for (const item of data.results ?? []) {
        const s = formatSeries(item);
        if (s) out.push(s);
      }
      return out;
    } catch {
      return [];
    }
  });
}

/** Format a value with its unit for display. */
export function formatMacroValue(s: MacroSeries): string {
  switch (s.unit) {
    case "percentPerYear":
    case "percent":
      return `${s.last.toFixed(2)}%`;
    case "percentPerMonth":
      return `${s.last.toFixed(2)}% m`;
    case "percentPerDay":
      return `${s.last.toFixed(4)}% d`;
    case "index":
      return s.last.toFixed(2);
    case "brlMillion":
      return `R$ ${(s.last / 1000).toFixed(2)} bi`;
    default:
      return s.last.toFixed(2);
  }
}
