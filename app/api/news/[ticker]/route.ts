import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

type NewsItem = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  relatedTickers?: string[];
};

/**
 * Fetch news for a ticker via Google News RSS.
 * Yahoo News routes are gone (404 from query2/query1/xhr/ncp).
 */
async function fetchGoogleNewsRSS(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return [];
  const xml = await r.text();

  // Parse RSS items. Avoid pulling in a heavy XML parser.
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
    const description = (block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").trim();
    const source = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "").trim();

    if (!title || !link) continue;

    // Strip HTML tags from description and source
    const cleanSummary = description
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;/g, (x) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" })[x] ?? x)
      .trim()
      .slice(0, 400);

    const ts = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000);

    items.push({
      id: i++,
      headline: title,
      summary: cleanSummary,
      source: source || "Google News",
      url: link,
      datetime: ts,
    });
  }
  return items;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    const news = await cached(`news:${ticker}`, 300, async () => {
      // Query Google News with multiple variants to get diverse results
      const queries = [
        `${ticker} stock`,
        `${ticker} news`,
      ];
      const allResults: NewsItem[] = [];
      const seen = new Set<string>();
      for (const q of queries) {
        try {
          const items = await fetchGoogleNewsRSS(q);
          for (const it of items) {
            if (!seen.has(it.url)) {
              seen.add(it.url);
              allResults.push({ ...it, relatedTickers: [ticker] });
            }
          }
        } catch {}
      }
      // Sort newest first
      allResults.sort((a, b) => b.datetime - a.datetime);
      return allResults.slice(0, 30);
    });
    return NextResponse.json({ news, ticker });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
