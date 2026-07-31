import { NextRequest, NextResponse } from "next/server";
import { getYahooSummary } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  try {
    const summary = await getYahooSummary(ticker);
    if (!summary) {
      return NextResponse.json({ error: `${ticker} não encontrado` }, { status: 404 });
    }
    return NextResponse.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
