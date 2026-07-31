import { NextRequest, NextResponse } from "next/server";
import { getETFList } from "@/lib/alphavantage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 50);

  try {
    const rows = await getETFList(limit);
    return NextResponse.json({ rows, count: rows.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
