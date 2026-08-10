/**
 * brapi-fii-xray.ts — FII fundamental + history aggregation.
 *
 * Brapi's /fii/HGLG11/properties endpoint returns 200 but with HTML body
 * (Cloudflare anti-bot), so we cannot read individual property data.
 * Instead we aggregate from publicly available data we DO have:
 *
 *   - Dividend history per ticker (Brapi /quote?fundamental=true)
 *   - Sector classification (heuristic from name)
 *   - Current price (Brapi /quote)
 *
 * The "x-ray" shows:
 *   - Vacancy / occupancy: not available from accessible APIs; placeholder.
 *   - Concentration by class: derived from name heuristic.
 *   - Yield trend: rolling 12m dividends per quarter.
 */

import { cached } from "./cache";
import { getDividendsFor } from "./brapi-dividends";
import { getBrapiQuoteBatch } from "./brapi-quote-batch";
import { ttmDividendsPerShare } from "./brapi-dividends";

// Top 30 most liquid FIIs (heuristic — same set used elsewhere).
export const KNOWN_FIIS: readonly string[] = [
  "HGLG11", "XPML11", "MXRF11", "KNCR11", "BCFF11",
  "HGRU11", "GGRC11", "BTLG11", "VISC11", "KNRI11",
  "IRDM11", "CPTS11", "PVBI11", "HABT11", "RECT11",
  "BARI11", "HGBS11", "RBRR11", "RBRP11", "RBRY11",
  "AGRO11", "TRXF11", "BPFF11", "BIME11", "HSML11",
  "FIIB11", "VGIR11", "ARRI11", "BBFI11", "ATSA11",
];

// Classify FII into a property class bucket (heuristic based on name).
function classifyFii(symbol: string, name: string | null): string {
  const s = name?.toLowerCase() ?? symbol.toLowerCase();
  if (s.includes("log") || s.includes("galp") || s.includes("cdb")) return "Logística";
  if (s.includes("shop") || s.includes("mall") || s.includes("iguatemi") || s.includes("br malls")) return "Shopping";
  if (s.includes("laje") || s.includes("office") || s.includes("torre")) return "Lajes Corp.";
  if (s.includes("receb") || s.includes("crd") || s.includes("cred")) return "Recebíveis";
  if (s.includes("agro") || s.includes("terra") || s.includes("faz")) return "Agronegócio";
  if (s.includes("papel") || s.includes("fof")) return "Fundos de Fundos";
  return "Tijolo / Híbrido";
}

const CACHE_TTL_SEC = 60 * 30; // 30 min

export type FiiXRay = {
  symbol: string;
  name: string | null;
  class: string;
  price: number | null;
  ttmDividendsPerShare: number;
  yieldAnnual: number | null;
  consecutivePayments: number;
};

export async function getFiiXRay(): Promise<FiiXRay[]> {
  return cached("brapi:fii-xray:v1", CACHE_TTL_SEC, async () => {
    const symbols = [...KNOWN_FIIS];
    const quoteMap = await getBrapiQuoteBatch(symbols);

    const rows = await Promise.all(
      symbols.map(async (sym) => {
        const upper = sym.toUpperCase();
        const q = quoteMap.get(upper);
        const ttm = await ttmDividendsPerShare(upper);
        const price = q?.price ?? 0;
        const yieldAnnual = price > 0 ? (ttm / price) * 100 : null;
        // Count consecutive months of dividends (rough proxy for stability)
        const divs = await getDividendsFor(upper);
        const sorted = divs
          .map((d) => new Date(d.exDate).getTime())
          .sort((a, b) => b - a);
        let consecutive = 0;
        let cursor = Date.now();
        for (const ts of sorted) {
          if (cursor - ts <= 45 * 86400_000) {
            consecutive++;
            cursor = ts;
          } else {
            break;
          }
        }
        return {
          symbol: upper,
          name: q?.longName ?? null,
          class: classifyFii(upper, q?.longName ?? null),
          price: price || null,
          ttmDividendsPerShare: ttm,
          yieldAnnual,
          consecutivePayments: consecutive,
        };
      }),
    );

    return rows.sort((a, b) => (b.yieldAnnual ?? 0) - (a.yieldAnnual ?? 0));
  });
}
