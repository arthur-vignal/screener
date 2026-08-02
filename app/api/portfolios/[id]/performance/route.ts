import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { computePortfolioPerformance } from "@/lib/performance";
import { getAssetQuotes } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Row = {
  id: number;
  owner_id: number | null;
  is_public: number;
  initial_value: number;
  created_at: number;
  name: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const portfolio = db
    .prepare(
      "SELECT id, owner_id, is_public, initial_value, created_at, name FROM portfolios WHERE slug = ? OR id = ?",
    )
    .get(id, Number(id)) as Row | undefined;

  if (!portfolio) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (portfolio.is_public === 0 && !portfolio.owner_id) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  const holdings = db
    .prepare("SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = ?")
    .all(portfolio.id) as { symbol: string; weight: number }[];

  const perf = await computePortfolioPerformance(
    holdings,
    portfolio.created_at,
    portfolio.initial_value,
  );

  // Current value + quotes
  const symbols = holdings.map((h) => h.symbol);
  const quoteMap = await getAssetQuotes(symbols);
  const currentQuotes = holdings.map((h) => {
    const q = quoteMap.get(h.symbol);
    return {
      symbol: h.symbol,
      weight: h.weight,
      price: q?.price ?? null,
      changePercent: q?.changePercent ?? null,
      value: q ? (portfolio.initial_value * h.weight * (q.price ?? 0)) : null,
    };
  });

  return NextResponse.json({
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      createdAt: portfolio.created_at,
      initialValue: portfolio.initial_value,
    },
    performance: perf,
    currentQuotes,
  });
}
