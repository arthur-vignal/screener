import { NextRequest, NextResponse } from "next/server";
import { fetchNewsForTickers } from "@/lib/news-sources";
import { tagNewsItem } from "@/lib/news-tagger";

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

    const limited = tickers.slice(0, 30);
    const news = await fetchNewsForTickers(limited, 10, 30);

    // Tag every item so the UI knows which tickers are mentioned
    // beyond the queried ones (relevant for "stocks also mentioned").
    // Expõe como `tickers` (não `relatedTickers`) pra alinhar com o
    // tipo client-side NewsItem compartilhado com /api/news/multi.
    const tagged = news.map((n) => ({
      ...n,
      tickers: tagNewsItem(n.headline ?? "", n.summary ?? ""),
    }));

    return NextResponse.json({ news: tagged });
  } catch (err) {
    return NextResponse.json(
      { news: [], error: String(err) },
      { status: 500 },
    );
  }
}
