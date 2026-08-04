import { NextRequest, NextResponse } from "next/server";
import { getTopCryptos, getGlobalMetrics } from "@/lib/cmc";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10)));
  const convert = sp.get("convert") ?? "USD";

  const [quotes, global] = await Promise.all([
    getTopCryptos(limit, convert),
    getGlobalMetrics(convert),
  ]);

  return NextResponse.json({ quotes, global, timestamp: Date.now() });
}
