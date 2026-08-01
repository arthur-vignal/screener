import { NextRequest, NextResponse } from "next/server";
import { getYahooHoldings } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  try {
    const holdings = await getYahooHoldings(ticker);
    if (holdings.length === 0) {
      return NextResponse.json(
        { error: "Holdings indisponíveis (pode não ser ETF)" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ticker, holdings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
