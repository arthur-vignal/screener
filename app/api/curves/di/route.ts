import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/curves/di?asset=DI1 — term structure of the Brazilian DI curve.
 *
 * Used by:
 *  - ROIC-WACC analysis on the asset page (Ke = curva DI interpolada pela
 *    duration do negócio + beta × prêmio de risco).
 *  - Analysis page (Ativo x Matéria): interactive overlay of ROIC vs the
 *    DI rate for the duration of the asset.
 *
 * Why a proxy: the upstream `/api/v2/futures/term-structure?asset=DI1`
 * returns 45 contracts (settlementRate %a.a. + expirationDate). We cache
 * it (60min — curve moves intraday) and expose a small `interpolate`
 * helper that picks the contract whose duration is closest to a given
 * target in years.
 *
 * Cache: 60min — curve updates during pregão.
 *
 * Response shape:
 *   {
 *     asset: "DI1",
 *     contracts: Array<{
 *       symbol: string,        // e.g. "DI1U26"
 *       expirationDate: string, // ISO YYYY-MM-DD
 *       daysToExpiry: number,
 *       settlementRate: number, // % a.a.
 *       yearsToExpiry: number,
 *       interpolated?: boolean  // true when this row is the interpolated match
 *     }>,
 *     fetchedAt: ISO,
 *     source: "brapi-curve-di",
 *
 *     // Helper — when ?years= is passed:
 *     matchedDurationYears?: number,
 *     matchedRatePercent?: number,
 *     matchedSymbol?: string
 *   }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const BRAPI_BASE = "https://brapi.dev/api/v2";

type RawContract = {
  symbol: string;
  assetDescription?: string;
  expirationDate: string;
  settlement?: number;
  settlementRate?: number;
};

type CurveContract = {
  symbol: string;
  expirationDate: string;
  daysToExpiry: number;
  settlementRate: number | null;
  yearsToExpiry: number;
  interpolated?: boolean;
};

type DiCurvePayload = {
  asset: string;
  contracts: CurveContract[];
  fetchedAt: string;
  source: "brapi-curve-di";
  matchedDurationYears?: number;
  matchedRatePercent?: number;
  matchedSymbol?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function buildContracts(raw: RawContract[], now: number): CurveContract[] {
  return raw
    .filter((c) => c.expirationDate && c.settlementRate != null)
    .map((c) => {
      const expiry = new Date(c.expirationDate).getTime();
      const days = Math.max(0, Math.round((expiry - now) / DAY_MS));
      return {
        symbol: c.symbol,
        expirationDate: c.expirationDate,
        daysToExpiry: days,
        settlementRate: c.settlementRate ?? null,
        yearsToExpiry: days / 365.25,
      };
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

function findClosest(
  contracts: CurveContract[],
  targetYears: number,
): { contract: CurveContract; abs: number } | null {
  if (contracts.length === 0 || !Number.isFinite(targetYears)) return null;
  let best = contracts[0];
  let bestAbs = Math.abs(best.yearsToExpiry - targetYears);
  for (let i = 1; i < contracts.length; i++) {
    const diff = Math.abs(contracts[i].yearsToExpiry - targetYears);
    if (diff < bestAbs) {
      best = contracts[i];
      bestAbs = diff;
    }
  }
  return { contract: best, abs: bestAbs };
}

async function fetchDi(asset: string): Promise<DiCurvePayload | null> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) return null;

  const url = `${BRAPI_BASE}/futures/term-structure?asset=${encodeURIComponent(asset)}&token=${encodeURIComponent(token)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) {
    console.error(`[curve-di] ${asset} ${r.status}`);
    return null;
  }
  const json = (await r.json()) as { contracts?: RawContract[] };
  const raw = json.contracts ?? [];
  if (raw.length === 0) return null;

  const now = Date.now();
  const contracts = buildContracts(raw, now);

  return {
    asset,
    contracts,
    fetchedAt: new Date().toISOString(),
    source: "brapi-curve-di",
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const asset = (url.searchParams.get("asset") ?? "DI1").toUpperCase();
  const yearsParam = url.searchParams.get("years");
  const targetYears = yearsParam != null ? Number(yearsParam) : null;

  const base = await cached<DiCurvePayload | null>(
    `brapi-curve:${asset}`,
    60 * 60,
    () => fetchDi(asset),
  );

  if (!base) {
    return NextResponse.json(
      { error: "curve unavailable" },
      { status: 502 },
    );
  }

  if (targetYears != null && Number.isFinite(targetYears)) {
    const match = findClosest(base.contracts, targetYears);
    if (match) {
      const enriched = base.contracts.map((c) =>
        c.symbol === match.contract.symbol
          ? { ...c, interpolated: true }
          : c,
      );
      return NextResponse.json({
        ...base,
        contracts: enriched,
        matchedDurationYears: Number(targetYears),
        matchedRatePercent: match.contract.settlementRate,
        matchedSymbol: match.contract.symbol,
      });
    }
  }

  return NextResponse.json(base);
}
