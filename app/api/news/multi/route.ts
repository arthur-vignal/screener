import { NextResponse } from "next/server";
import { fetchBrazilianVerified, type NewsItem } from "@/lib/news-sources";

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

// IBOV top constituents + small/mid caps with the highest trading
// volume on B3. We pull news for each (deduped by URL) so the
// result is a market-wide pulse covering all major tickers, not
// just the most popular ones.
//
// The user has a Brapi PRO token, so we are not rate-limited by
// free-tier RSS throttling — we can pull aggressively.
const SEED_TICKERS = [
  // IBOV blue chips
  "PETR4", "PETR3", "VALE3", "ITUB4", "BBDC4", "ABEV3",
  "BBAS3", "WEGE3", "ITSA4", "B3SA3", "BBSE3", "CMIG4",
  "SANB11", "GGBR4", "CSAN3", "RAIL3", "SUZB3", "EQTL3",
  // IBOV mid caps
  "RDOR3", "PRIO3", "LREN3", "VIVT3", "TOTS3", "ENEV3",
  "BHIA3", "BRFS3", "VBBR3", "CCRO3", "UGPA3", "HAPV3",
  "MGLU3", "LWSA3", "ASAI3", "MULT3", "CYRE3", "TIMS3",
  // High-visibility B3 names (often covered in mainstream press)
  "XP", "VALE", "ITSA", "BRKM5", "USIM5", "CSNA3",
  "ELET3", "CPFE3", "SBSP3", "CMIN3", "EMBR3",
  // Small caps with strong sectoral narratives
  "STBP3", "BEEF3", "CVCB3", "MRFG3", "MOVI3", "POMO4",
  "RENT3", "POSI3", "QUAL3", "FLRY3",
];

export async function GET() {
  try {
    // Batch the ticker fetches to avoid hitting Google News rate limits.
    // 55 tickers all at once → IP-based throttle, half returning [].
    // 5 tickers at a time with a 250ms gap → manageable per chunk.
    const BATCH = 5;
    const perTicker: NewsItem[] = [];
    for (let i = 0; i < SEED_TICKERS.length; i += BATCH) {
      const slice = SEED_TICKERS.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        slice.map((t) => fetchBrazilianVerified(t).catch(() => [])),
      );
      perTicker.push(...batchResults.flat());
      if (i + BATCH < SEED_TICKERS.length) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    const merged = perTicker.flat();

    // Dedupe by URL so the same story is not listed twice.
    const seen = new Set<string>();
    const deduped = merged.filter((n) => {
      const key = n.url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Drop stale items older than 30 days. Google News doesn't always
    // honor the when=7d URL parameter, so we filter server-side.
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const recent = deduped.filter((n) => {
      const dt = (n.datetime ?? 0) * 1000;
      return dt === 0 || dt >= cutoff;
    });

    // Sort newest first. Cap at 60 — enough to fill the news column
    // without bloating the payload.
    recent.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
    return NextResponse.json({ news: recent.slice(0, 60) });
  } catch (err) {
    return NextResponse.json(
      { news: [], error: String(err) },
      { status: 500 },
    );
  }
}