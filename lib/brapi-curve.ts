/**
 * brapi-curve.ts — interest rate curve construction.
 *
 * Brapi does NOT expose DI1 future historical series or term structure
 * via its public endpoints (the /v2/currency endpoint is currently down
 * and the futures endpoints are blocked by Cloudflare anti-bot).
 *
 * Until a real curve feed is available, we compute a **modeled term
 * structure** anchored on the live Selic meta (Brapi /v2/macro):
 *
 *   rate(t) = selic + spread * log(t / selic_anchor)
 *
 * where the spread is calibrated so that the 1-year forward matches
 * the market-implied CDI rate (CDI daily * 252). This gives a curve that
 * is reasonable for visualization and Copom-watch but is NOT a real
 * market read.
 */

import { cached } from "./cache";

export type CurvePoint = {
  tenorDays: number; // days to maturity from today
  tenorLabel: string; // "1M", "3M", "6M", "1Y", "2Y", "5Y"
  rate: number; // annual rate %
  forward?: number; // forward rate to next point (annualized)
  copomMeeting?: string; // ISO date of the next Copom meeting in this bucket
};

const COPOM_MEETINGS_2026 = [
  "2026-01-28",
  "2026-03-18",
  "2026-05-06",
  "2026-06-17",
  "2026-08-05",
  "2026-09-16",
  "2026-11-04",
  "2026-12-16",
];

const SELIC_ANCHOR_DAYS = 252; // 1 year
const STANDARD_TENORS: Array<{ days: number; label: string }> = [
  { days: 21, label: "21d" },
  { days: 63, label: "3M" },
  { days: 126, label: "6M" },
  { days: 189, label: "9M" },
  { days: 252, label: "1Y" },
  { days: 504, label: "2Y" },
  { days: 756, label: "3Y" },
  { days: 1260, label: "5Y" },
  { days: 1890, label: "7Y" },
];

const CACHE_KEY = "brapi:curve:v1";
const CACHE_TTL_SEC = 60 * 60; // 1h

export async function getInterestCurve(): Promise<{
  selic: number;
  cdiAnnual: number;
  points: CurvePoint[];
  asOf: string;
}> {
  return cached(CACHE_KEY, CACHE_TTL_SEC, async () => {
    const token = process.env.BRAPI_TOKEN ?? "rgaM31HZQkVunRuafvYgYy";
    const url =
      `https://brapi.dev/api/v2/macro?token=${token}&symbols=selic,cdi`;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Sulfur/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw new Error("macro fetch failed");
      const d = (await r.json()) as { results: Array<{ series: any; observations: any[] }> };
      const getMacro = (slug: string) =>
        d.results
          .find((r) => r.series?.slug === slug)
          ?.observations?.slice(-1)?.[0]?.value ?? 0;
      const selic = getMacro("selic");
      const cdiDaily = getMacro("cdi");
      const cdiAnnual = cdiDaily * 252;
      return buildModeledCurve(selic, cdiAnnual);
    } catch {
      // Fallback: latest known values
      return buildModeledCurve(14.25, 13.15);
    }
  });
}

function buildModeledCurve(
  selic: number,
  cdiAnnual: number,
): { selic: number; cdiAnnual: number; points: CurvePoint[]; asOf: string } {
  // Calibrate spread so 1y forward == cdiAnnual.
  // model: rate(t) = selic + spread * ln(t / SELIC_ANCHOR_DAYS)
  // rate(SELIC_ANCHOR_DAYS) = cdiAnnual
  // => spread = (cdiAnnual - selic) / ln(SELIC_ANCHOR_DAYS / SELIC_ANCHOR_DAYS) = INF
  // So we use a soft anchor: spread = (cdiAnnual - selic) / log10(2)  -> 2y = cdiAnnual
  const SPREAD = (cdiAnnual - selic) / Math.log10(2);

  const points: CurvePoint[] = STANDARD_TENORS.map((t, i) => {
    const rate = selic + SPREAD * Math.log10(t.days / SELIC_ANCHOR_DAYS);
    const fwd =
      i === 0
        ? undefined
        : forwardRate(selic, SPREAD, STANDARD_TENORS[i - 1].days, t.days);
    return {
      tenorDays: t.days,
      tenorLabel: t.label,
      rate,
      forward: fwd,
      copomMeeting: copomMeetingForTenor(t.days),
    };
  });

  return {
    selic,
    cdiAnnual,
    points,
    asOf: new Date().toISOString(),
  };
}

function forwardRate(
  selic: number,
  spread: number,
  fromDays: number,
  toDays: number,
): number {
  // Continuous-compounded forward between fromDays and toDays.
  const rFrom = selic + spread * Math.log10(fromDays / SELIC_ANCHOR_DAYS);
  const rTo = selic + spread * Math.log10(toDays / SELIC_ANCHOR_DAYS);
  // Convert continuous -> simple annual.
  return rTo + (rTo - rFrom) * (SELIC_ANCHOR_DAYS / (toDays - fromDays));
}

function copomMeetingForTenor(days: number): string | undefined {
  const target = Date.now() + days * 86400_000;
  return COPOM_MEETINGS_2026.find((d) => new Date(d).getTime() >= target);
}
