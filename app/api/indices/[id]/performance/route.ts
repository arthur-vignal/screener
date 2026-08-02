import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { computeConstituents } from "@/lib/index-calculator";
import { computeIndexPerformance } from "@/lib/performance";
import type { Universe, IndexFilters, IndexRanking } from "@/lib/index-calculator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Row = {
  id: number;
  owner_id: number | null;
  is_public: number;
  universe: string;
  filters: string;
  ranking: string;
  top_n: number;
  created_at: number;
  name: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const idx = db
    .prepare(
      "SELECT id, owner_id, is_public, universe, filters, ranking, top_n, created_at, name FROM indices WHERE slug = ? OR id = ?",
    )
    .get(id, Number(id)) as Row | undefined;

  if (!idx) return NextResponse.json({ error: "not found" }, { status: 404 });

  const constituents = await computeConstituents(
    idx.universe as Universe,
    JSON.parse(idx.filters) as IndexFilters,
    idx.ranking as IndexRanking,
    idx.top_n,
  );

  const symbols = constituents.map((c) => c.symbol);
  const perf = await computeIndexPerformance(symbols, idx.created_at);

  return NextResponse.json({
    index: { id: idx.id, name: idx.name, createdAt: idx.created_at },
    constituents,
    performance: perf,
  });
}
