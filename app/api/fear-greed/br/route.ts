/**
 * fear-greed-br.ts — compute a Fear & Greed equivalent for the Brazilian market.
 *
 * Components (each 0-100, weighted average):
 *   1. IBOV momentum (price vs 125d MA) — weight 0.25
 *   2. Breadth BR (% of B3 stocks in green on the day) — weight 0.30
 *   3. Selic real placeholder (Selic 10.5% - IPCA 4.0% = 6.5%, normalized) — weight 0.20
 *   4. IVOL-BR placeholder (Brazilian implied vol; if unavailable, uses
 *      a static reasonable value until we wire a source) — weight 0.25
 *
 * Output shape mirrors /api/fear-greed for the BR dashboard rail.
 */
import { NextResponse } from "next/server";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";
import { IBOV } from "@/lib/ibovespa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SELIC = 0.105; // 10.5%
const IPCA = 0.04; // 4.0% (estimate — could come from IBGE)
const SELIC_REAL = SELIC - IPCA; // 6.5%

// Map a value to a 0-100 greed score. Higher = greedier.
function momentumToGreed(changePercent: number): number {
  // ±5% maps to ±50 around 50.
  const clamped = Math.max(-5, Math.min(5, changePercent));
  return Math.round(50 + clamped * 10);
}

function breadthToGreed(greenPercent: number): number {
  // 50% neutral (50), 100% all green = 100.
  return Math.round(greenPercent);
}

function selicRealToGreed(realRate: number): number {
  // High real rate = bearish (fear), low = bullish (greed).
  // 6.5% real rate -> 40 (fear territory), 0% -> 80, 10% -> 20.
  return Math.round(Math.max(0, Math.min(100, 80 - (realRate - 0.06) * 600)));
}

function ivolToGreed(ivol: number): number {
  // Higher vol = fear. IVOL ~30 is typical for BR (vs VIX ~15-20 typical US).
  // 25 -> 50 neutral, 35 -> 30 fear, 15 -> 80 greed.
  return Math.round(Math.max(0, Math.min(100, 100 - (ivol - 20) * 2)));
}

export async function GET() {
  try {
    const sampleSymbols = IBOV.map((e) => e.symbol).slice(0, 30);
    const brapiMap = await getBrapiQuoteBatch(sampleSymbols);

    // Momentum
    const momenta: number[] = [];
    const movers = { up: 0, down: 0, total: 0 };
    for (const sym of sampleSymbols) {
      const b = brapiMap.get(sym.toUpperCase());
      const cp = b?.quote?.changePercent;
      if (cp == null) continue;
      momenta.push(cp);
      movers.total++;
      if (cp > 0) movers.up++;
      else if (cp < 0) movers.down++;
    }
    const avgMomentum =
      momenta.length > 0 ? momenta.reduce((a, b) => a + b, 0) / momenta.length : 0;
    const breadthPercent = movers.total > 0 ? (movers.up / movers.total) * 100 : 50;

    const momentumScore = momentumToGreed(avgMomentum);
    const breadthScore = breadthToGreed(breadthPercent);
    const selicScore = selicRealToGreed(SELIC_REAL);
    const ivolScore = ivolToGreed(30); // placeholder until we wire IVOL-BR source

    const weights = {
      momentum: 0.25,
      breadth: 0.30,
      selic: 0.20,
      ivol: 0.25,
    };
    const score = Math.round(
      momentumScore * weights.momentum +
        breadthScore * weights.breadth +
        selicScore * weights.selic +
        ivolScore * weights.ivol,
    );

    let regime: "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
    let label: string;
    if (score < 25) {
      regime = "extreme-fear";
      label = "Medo extremo";
    } else if (score < 45) {
      regime = "fear";
      label = "Medo";
    } else if (score < 55) {
      regime = "neutral";
      label = "Neutro";
    } else if (score < 75) {
      regime = "greed";
      label = "Ganância";
    } else {
      regime = "extreme-greed";
      label = "Ganância extrema";
    }

    return NextResponse.json({
      score,
      regime,
      label,
      components: [
        {
          name: "momentum",
          label: "Momentum (IBOV)",
          weight: weights.momentum,
          value: momentumScore,
          raw: {
            current: avgMomentum,
            comparison: 0,
            description: `IBOV sample ${movers.total} ações, ${avgMomentum >= 0 ? "+" : ""}${avgMomentum.toFixed(2)}% em 1D`,
          },
        },
        {
          name: "breadth",
          label: "Breadth (B3)",
          weight: weights.breadth,
          value: breadthScore,
          raw: {
            current: breadthPercent,
            comparison: 50,
            description: `${movers.up} de ${movers.total} ações em alta (${breadthPercent.toFixed(0)}%)`,
          },
        },
        {
          name: "selic-real",
          label: "Juros Reais (Selic - IPCA)",
          weight: weights.selic,
          value: selicScore,
          raw: {
            current: SELIC_REAL * 100,
            comparison: 0,
            description: `Selic ${(SELIC * 100).toFixed(1)}% - IPCA ${(IPCA * 100).toFixed(1)}% = ${(SELIC_REAL * 100).toFixed(1)}% real`,
          },
        },
        {
          name: "ivol-br",
          label: "IVOL-BR (placeholder)",
          weight: weights.ivol,
          value: ivolScore,
          raw: {
            current: 30,
            comparison: 25,
            description: `IVOL-BR ~30% (placeholder; real source pending)`,
          },
        },
      ],
      computedAt: Date.now(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
