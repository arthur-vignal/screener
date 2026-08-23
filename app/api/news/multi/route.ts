import { NextResponse } from "next/server";
import {
  fetchStatusInvest,
  fetchFundsExplorer,
  fetchSmallcaps,
  fetchBrazilianVerified,
  type NewsItem,
} from "@/lib/news-sources";
import { tagNewsItem } from "@/lib/news-tagger";

/**
 * GET /api/news/multi
 *
 * Multi-source B3 news across three high-quality portals:
 *  - Status Invest (análise fundamentalista)
 *  - Funds Explorer (análise de FIIs)
 *  - Smallcaps (small caps brasileiras)
 *  - Plus a Google News tail from the seed tickers to keep
 *    fresh coverage of the most-active B3 names.
 *
 * Each item has been tagged for B3 ticker mentions server-side, so
 * the UI can render clickable ticker chips inside the headline.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 25;

// Lightweight seed of high-volume B3 tickers for the Google News tail.
const SEED_TICKERS = [
  "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3", "BBAS3",
  "WEGE3", "B3SA3", "BBSE3", "CMIG4", "EQTL3", "RDOR3",
];

export async function GET() {
  try {
    // Fetch the three dedicated portals in parallel.
    const [statusNews, fundsNews, smallcapsNews] = await Promise.all([
      fetchStatusInvest().catch(() => []),
      fetchFundsExplorer().catch(() => []),
      fetchSmallcaps().catch(() => []),
    ]);

    // Fetch a Google News tail, batched to avoid throttle.
    const BATCH = 4;
    const googleNews: NewsItem[] = [];
    for (let i = 0; i < SEED_TICKERS.length; i += BATCH) {
      const slice = SEED_TICKERS.slice(i, i + BATCH);
      const batch = await Promise.all(
        slice.map((t) => fetchBrazilianVerified(t).catch(() => [])),
      );
      googleNews.push(...batch.flat());
      if (i + BATCH < SEED_TICKERS.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const merged: NewsItem[] = [
      ...statusNews,
      ...fundsNews,
      ...smallcapsNews,
      ...googleNews,
    ];

    // Dedupe by URL.
    const seen = new Set<string>();
    const deduped = merged.filter((n) => {
      if (!n.url || seen.has(n.url)) return false;
      seen.add(n.url);
      return true;
    });

    // Drop items older than 90 days — three portals, we can be more
    // generous with the recency window than the general feed.
    const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
    const recent = deduped.filter((n) => {
      const dt = (n.datetime ?? 0) * 1000;
      return dt === 0 || dt >= cutoff;
    });

    // Tag each item with the tickers it mentions (server-side work,
    // keeps the client fast).
    const tagged = recent.map((n) => ({
      ...n,
      relatedTickers: tagNewsItem(n.headline ?? "", n.summary ?? ""),
    }));

    // Sort newest first, cap at 60.
    tagged.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
    return NextResponse.json({ news: tagged.slice(0, 60) });
  } catch (err) {
    return NextResponse.json(
      { news: [], error: String(err) },
      { status: 500 },
    );
  }
}
