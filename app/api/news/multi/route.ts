import { NextResponse } from "next/server";
import { fetchBrazilianVerified } from "@/lib/news-sources";

/**
 * GET /api/news/multi
 *
 * Top B3 news from the six verified BR portals (InfoMoney, Valor,
 * Money Times, NeoFeed, Brazil Journal, B3 oficial). Returns up
 * to 14 of the latest items, already filtered to Portuguese and
 * to the verified-source whitelist (see lib/news-sources.ts).
 *
 * Mirrors the shape returned by /api/news/multi/[tickers] but
 * without requiring a ticker filter. The home page news widget
 * and day-highlight card both fetch from this URL.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 25;

// Common B3 reference tickers used as a search seed. We pull the
// news for each (deduped by URL) so the result is a market-wide
// pulse, not a single-ticker feed.
const SEED_TICKERS = [
  "PETR4",
  "VALE3",
  "ITUB4",
  "BBDC4",
  "ABEV3",
  "BBAS3",
  "WEGE3",
];

export async function GET() {
  try {
    // Fetch each seed ticker in parallel, then merge + dedupe.
    const perTicker = await Promise.all(
      SEED_TICKERS.map((t) =>
        fetchBrazilianVerified(t).catch(() => []),
      ),
    );
    const merged = perTicker.flat();

    // Dedupe by URL so the same story is not listed twice.
    const seen = new Set<string>();
    const news = merged.filter((n) => {
      const key = n.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort newest first and cap at 14 items.
    news.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
    return NextResponse.json({ news: news.slice(0, 14) });
  } catch (err) {
    return NextResponse.json(
      { news: [], error: String(err) },
      { status: 500 },
    );
  }
}