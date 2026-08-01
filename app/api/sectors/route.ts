import { NextRequest, NextResponse } from "next/server";
import { getSectorPerformance } from "@/lib/sector-heatmap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "1mo") as "1mo" | "3mo" | "6mo" | "1y";
  try {
    const sectors = await getSectorPerformance(100, range);
    return NextResponse.json({ sectors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
