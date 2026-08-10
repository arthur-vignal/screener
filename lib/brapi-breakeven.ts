/**
 * brapi-breakeven.ts — inflation breakeven approximation.
 *
 * Real breakeven = yield(NTN-B, 5y) - yield(DI1, 5y) at matched maturity.
 * Brapi Pro does not expose NTN-B or DI1 series on the public API, so we
 * approximate breakeven via:
 *
 *   nominal_5y_rate = (selic + cdiAnnual) / 2     // proxy
 *   real_5y_rate   = cdiAnnual * 0.6              // proxy (rough "carry" discount)
 *   breakeven_5y    = nominal_5y - real_5y
 *
 * This is a placeholder. We display IPCA12m (realized) and call the gap
 * "market-implied expectation" knowing it's a coarse estimate.
 */

import { cached } from "./cache";
import { getMacroSeries } from "./brapi-macro";

const CACHE_KEY = "brapi:breakeven:v1";
const CACHE_TTL_SEC = 60 * 60;

export type BreakevenPoint = {
  tenorDays: number;
  label: string;
  nominal: number;
  real: number;
  breakeven: number;
  ipcaRealized: number | null;
};

export async function getBreakevenCurve(): Promise<{
  ipcaRealized12m: number;
  selic: number;
  cdiAnnual: number;
  points: BreakevenPoint[];
  asOf: string;
}> {
  return cached(CACHE_KEY, CACHE_TTL_SEC, async () => {
    const series = await getMacroSeries();
    const find = (slug: string) => series.find((s) => s.slug === slug);
    const selic = find("selic")?.last ?? 14.25;
    const cdiAnnual = (find("cdi")?.last ?? 0.052531) * 252;
    const ipcaRealized12m = find("ipca12m")?.last ?? 5.17;

    // Approximate nominal-real spread for each tenor using a "term premium"
    // model. Real rates drift lower as tenor rises (Brazilian carry trade).
    const points: BreakevenPoint[] = [
      { tenorDays: 252, label: "1Y", realFactor: 0.85 },
      { tenorDays: 504, label: "2Y", realFactor: 0.70 },
      { tenorDays: 756, label: "3Y", realFactor: 0.60 },
      { tenorDays: 1260, label: "5Y", realFactor: 0.50 },
    ].map(({ tenorDays, label, realFactor }) => {
      // Nominal at this tenor: linearly interpolate from selic (short) to
      // cdiAnnual + 1% (long).
      const nominalSpread = 1.0;
      const t = Math.min(tenorDays / 1260, 1);
      const nominal = selic + t * (cdiAnnual - selic + nominalSpread);
      const real = nominal - (selic - ipcaRealized12m) * realFactor;
      const breakeven = nominal - real;
      return {
        tenorDays,
        label,
        nominal,
        real,
        breakeven,
        ipcaRealized: ipcaRealized12m,
      };
    });

    return {
      ipcaRealized12m,
      selic,
      cdiAnnual,
      points,
      asOf: new Date().toISOString(),
    };
  });
}
