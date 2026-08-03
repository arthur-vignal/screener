import { NextRequest, NextResponse } from "next/server";
import { getSeedPortfolio, getSeedIndex } from "@/lib/seed-data";
import { computePortfolioPerformance } from "@/lib/performance";
import { getAssetQuotes } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string; slug: string }> },
) {
  const { kind, slug } = await params;

  const isPortfolio = kind === "portfolio";
  const isIndex = kind === "index";

  if (!isPortfolio && !isIndex) {
    return NextResponse.json({ error: "kind must be portfolio or index" }, { status: 400 });
  }

  const seed = isPortfolio ? getSeedPortfolio(slug) : getSeedIndex(slug);
  if (!seed) return NextResponse.json({ error: "seed not found" }, { status: 404 });

  const holdings = isPortfolio
    ? (seed as { constituents: { symbol: string; weight: number }[] }).constituents
    : (seed as { constituents: string[] }).constituents.map((s) => ({
        symbol: s,
        weight: 1 / (seed as { constituents: string[] }).constituents.length,
      }));

  const initialValue = isPortfolio
    ? (seed as { initialValue: number }).initialValue
    : 10000;

  const perf = await computePortfolioPerformance(
    holdings,
    seed.createdAt,
    initialValue,
  );

  const symbols = holdings.map((h) => h.symbol);
  const quoteMap = await getAssetQuotes(symbols);

  const currentQuotes = holdings.map((h) => {
    const q = quoteMap.get(h.symbol);
    return {
      symbol: h.symbol,
      weight: h.weight,
      price: q?.price ?? null,
      changePercent: q?.changePercent ?? null,
      value: q ? initialValue * h.weight * (q.price ?? 0) : null,
    };
  });

  return NextResponse.json({
    name: seed.name,
    description: seed.description,
    performance: perf,
    currentQuotes,
  });
}
