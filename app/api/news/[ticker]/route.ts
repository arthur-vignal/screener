import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

const BASE = "https://query2.finance.yahoo.com";

type YahooNews = {
  id: string;
  content?: {
    id?: string;
    title?: string;
    summary?: string;
    pubDate?: string;
    displayTime?: string;
    provider?: { displayName?: string };
    canonicalUrl?: { url?: string; host?: string };
    finance?: { stockTickers?: string[] };
  };
};

type NewsItem = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  relatedTickers?: string[];
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    const news = await cached(`news:${ticker}`, 300, async () => {
      const r = await fetch(`${BASE}/xhr/ncp?queryRef=newsAll&serviceKey=ncp_fin&tickers=${ticker}&count=30&lang=en-US&region=US`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!r.ok) return [];
      const data = (await r.json()) as {
        data?: {
          timeline?: {
            items?: YahooNews[];
          };
          stream?: YahooNews[];
        };
      };
      const items = data.data?.timeline?.items ?? data.data?.stream ?? [];
      return items.map((n): NewsItem => {
        const c = n.content ?? {};
        return {
          id: n.id ? parseInt(n.id, 10) || 0 : 0,
          headline: c.title ?? "",
          summary: c.summary ?? "",
          source: c.provider?.displayName ?? c.canonicalUrl?.host ?? "—",
          url: c.canonicalUrl?.url ?? "#",
          datetime: c.displayTime ? new Date(c.displayTime).getTime() / 1000 : 0,
          relatedTickers: c.finance?.stockTickers ?? [],
        };
      });
    });

    return NextResponse.json({ news });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
