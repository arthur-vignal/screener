import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
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
  symbol: string | null;
  weight: number | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  const rows = await query<Row>(
    `SELECT p.id, p.owner_id, p.is_public, p.initial_value, p.created_at, p.name, ph.symbol, ph.weight
     FROM portfolios p
     LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
     WHERE p.slug = ? OR p.id = ?`,
    [id, numericId],
  );
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const portfolio = rows[0];
  if (portfolio.is_public === 0 && !portfolio.owner_id) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  const holdings = rows
    .filter((r) => r.symbol && r.weight != null)
    .map((r) => ({ symbol: r.symbol!, weight: r.weight! }));

  const perf = await computePortfolioPerformance(
    holdings,
    portfolio.created_at,
    portfolio.initial_value,
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
      value: q ? portfolio.initial_value * h.weight * (q.price ?? 0) : null,
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
