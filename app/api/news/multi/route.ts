import { NextRequest, NextResponse } from "next/server";
import {
  fetchStatusInvest,
  fetchSmallcaps,
  fetchBrazilianVerified,
  type NewsItem,
} from "@/lib/news-sources";
import { tagNewsItem } from "@/lib/news-tagger";
import { cached } from "@/lib/cache";

/**
 * GET /api/news/multi
 *
 * Multi-source B3 news across two high-quality portals:
 *  - Status Invest (análise fundamentalista)
 *  - Smallcaps (small caps brasileiras)
 *  - Plus a Google News tail from the seed tickers to keep
 *    fresh coverage of the most-active B3 names.
 *
 * Each item has been tagged for B3 ticker mentions server-side, so
 * the UI can render clickable ticker chips inside the headline.
 *
 * Cache: 3min server-side via `cached()`. 3 fontes RSS + 12 Google News
 * = 15 fetches upstream por chamada; sem cache, cada revalidate do
 * SWR cliente (focus, mount, reconnect) trava 2-3s. Cache curto porque
 * news é sensível a freshness.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 25;

// Lightweight seed of high-volume B3 tickers for the Google News tail.
const SEED_TICKERS = [
  "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3", "BBAS3",
  "WEGE3", "B3SA3", "BBSE3", "CMIG4", "EQTL3", "RDOR3",
];

const CACHE_TTL_SECONDS = 3 * 60;

export async function GET(_req: NextRequest) {
  return cached("news:multi:v3", CACHE_TTL_SECONDS, async () => {
    const news = await fetchMultiSource();
    return NextResponse.json({ news });
  });
}

async function fetchMultiSource(): Promise<NewsItem[]> {
  // Fetch the three dedicated portals in parallel.
  const [statusNews, smallcapsNews] = await Promise.all([
    fetchStatusInvest().catch(() => []),
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
  // keeps the client fast). Expõe como `tickers` (não
  // `relatedTickers`) pra alinhar com o tipo client-side NewsItem.
  const tagged = recent.map((n) => ({
    ...n,
    tickers: tagNewsItem(n.headline ?? "", n.summary ?? ""),
  }));

  // Sort newest first, cap at 60. Inclui `publishedAt` ISO junto com
  // `datetime` unix — clientes client-side preferem ISO (compat com
  // `new Date()`); outros lugares ainda olham `datetime`. Custo zero.
  tagged.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
  return tagged.slice(0, 60).map((n) => ({
    ...n,
    publishedAt:
      typeof n.datetime === "number" && n.datetime > 0
        ? new Date(n.datetime * 1000).toISOString()
        : new Date().toISOString(),
  }));
}