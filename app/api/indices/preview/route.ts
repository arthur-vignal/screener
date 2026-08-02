import { NextRequest, NextResponse } from "next/server";
import { computeConstituents } from "@/lib/index-calculator";
import type { Universe, IndexFilters, IndexRanking } from "@/lib/index-calculator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      universe?: Universe;
      ranking?: IndexRanking;
      topN?: number;
      filters?: IndexFilters;
    };
    if (!body.universe || !body.ranking || !body.topN) {
      return NextResponse.json(
        { error: "universe, ranking, topN obrigatórios" },
        { status: 400 },
      );
    }
    const constituents = await computeConstituents(
      body.universe,
      body.filters ?? {},
      body.ranking,
      body.topN,
    );
    return NextResponse.json({ constituents });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
