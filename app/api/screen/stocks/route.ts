import { NextRequest, NextResponse } from "next/server";
import { screenStocks } from "@/lib/screener";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const peMax = searchParams.get("peMax");
  const mcapMin = searchParams.get("mcapMin");
  const divYieldMin = searchParams.get("divYieldMin");
  const limit = searchParams.get("limit");

  try {
    const rows = await screenStocks({
      peMax: peMax ? Number(peMax) : undefined,
      mcapMin: mcapMin ? Number(mcapMin) : undefined,
      divYieldMin: divYieldMin ? Number(divYieldMin) : undefined,
      limit: limit ? Number(limit) : 30,
    });
    return NextResponse.json({ rows, count: rows.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
