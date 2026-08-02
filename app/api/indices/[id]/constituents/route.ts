import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { computeConstituents } from "@/lib/index-calculator";
import type { Universe, IndexFilters, IndexRanking } from "@/lib/index-calculator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Row = {
  id: number;
  owner_id: number | null;
  universe: string;
  filters: string;
  ranking: string;
  top_n: number;
  is_public: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, owner_id, universe, filters, ranking, top_n, is_public FROM indices WHERE slug = ? OR id = ?",
    )
    .get(id, Number(id)) as Row | undefined;

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const constituents = await computeConstituents(
    row.universe as Universe,
    JSON.parse(row.filters) as IndexFilters,
    row.ranking as IndexRanking,
    row.top_n,
  );

  return NextResponse.json({ constituents });
}
