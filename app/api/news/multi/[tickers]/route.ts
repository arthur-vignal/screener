import { NextRequest, NextResponse } from "next/server";
import { fetchNewsForTickers } from "@/lib/news-sources";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tickers: string }> },
) {
  try {
    const { tickers: raw } = await params;
    const tickersParam = new URL(req.url).searchParams.get("tickers") ?? raw;

    const tickers = tickersParam
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    if (tickers.length === 0) {
      return NextResponse.json({ news: [] });
    }

    // Limit per request
    const limited = tickers.slice(0, 30);
    const news = await fetchNewsForTickers(limited, 3, 30);
    return NextResponse.json({ news });
  } catch (err) {
    return NextResponse.json(
      { news: [], error: String(err) },
      { status: 500 },
    );
  }
}
