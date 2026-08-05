import { NextRequest, NextResponse } from "next/server";
import { computeCorrelationMatrix } from "@/lib/correlation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbolsParam = sp.get("symbols");
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : undefined;

  try {
    const result = await computeCorrelationMatrix(symbols);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
