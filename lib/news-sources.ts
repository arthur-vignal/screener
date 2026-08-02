/**
 * Multi-source news aggregator for assets.
 * Sources (in priority order):
 *   1. Yahoo Finance News (aggregates Reuters, AP, Bloomberg, CNBC, WSJ, FT, MarketWatch)
 *   2. Google News RSS (raw query, no API key required)
 *   3. SEC EDGAR filings (for US stocks)
 *
 * Designed to fetch in parallel with timeouts and de-dup by headline URL.
 */

import { cached } from "./cache";

export type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category?: string;
  relatedTickers?: string[];
};

const YAHOO_HOST = "https://query2.finance.yahoo.com";

async function fetchYahoo(ticker: string): Promise<NewsItem[]> {
  try {
    const r = await fetch(
      `${YAHOO_HOST}/xhr/ncp?queryRef=newsAll&serviceKey=ncp_fin&tickers=${encodeURIComponent(ticker)}&count=20&lang=en-US&region=US`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!r.ok) return [];
    const data = await r.json();
    type YahooItem = {
      id?: string;
      content?: {
        title?: string;
        summary?: string;
        pubDate?: string;
        displayTime?: string;
        provider?: { displayName?: string };
        canonicalUrl?: { url?: string; host?: string };
        finance?: { stockTickers?: string[] };
      };
    };
    const items: YahooItem[] =
      data?.data?.timeline?.items ?? data?.data?.stream ?? [];
    return items.map((n) => {
      const c = n.content ?? {};
      return {
        id: `yahoo:${n.id ?? ""}:${c.canonicalUrl?.url ?? Math.random()}`,
        headline: c.title ?? "",
        summary: c.summary ?? "",
        source: c.provider?.displayName ?? c.canonicalUrl?.host ?? "Yahoo",
        url: c.canonicalUrl?.url ?? "#",
        datetime: c.displayTime ? new Date(c.displayTime).getTime() / 1000 : 0,
        category: "yahoo",
        relatedTickers: c.finance?.stockTickers ?? [],
      };
    });
  } catch {
    return [];
  }
}

async function fetchGoogle(ticker: string, isCrypto: boolean): Promise<NewsItem[]> {
  try {
    // Google News RSS — query like "AAPL stock" or "bitcoin"
    const q = isCrypto
      ? `${ticker.replace("-USD", "")} cryptocurrency`
      : `${ticker} stock news`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return [];
    const xml = await r.text();

    // Simple regex-based XML parse — RSS is well-formed
    const items: NewsItem[] = [];
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
    for (const item of itemMatches.slice(0, 15)) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link\/>(.*?)<\/link>/) ?? item.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      if (!titleMatch) continue;
      const headline = titleMatch[1]
        .replace(/<!\[CDATA\[/g, "")
        .replace(/\]\]>/g, "")
        .trim();
      const link = linkMatch?.[1]?.trim() ?? "#";
      const pubDate = pubDateMatch?.[1]?.trim() ?? "";
      const datetime = pubDate ? new Date(pubDate).getTime() / 1000 : 0;
      const sourceRaw = sourceMatch?.[1]?.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim() ?? "Google News";

      items.push({
        id: `google:${link}`,
        headline,
        summary: "",
        source: sourceRaw,
        url: link,
        datetime,
        category: "google",
        relatedTickers: [ticker],
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchSEC(ticker: string): Promise<NewsItem[]> {
  // SEC only makes sense for US tickers (no -USD suffix)
  if (ticker.includes("-") || ticker.includes(".")) return [];
  try {
    const cikUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=&dateb=&owner=include&count=10&output=atom`;
    const r = await fetch(cikUrl, {
      headers: {
        "User-Agent": "Screener screener-app@example.com",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const items: NewsItem[] = [];
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/g) ?? [];
    for (const entry of entries.slice(0, 5)) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
      const updatedMatch = entry.match(/<updated>([\s\S]*?)<\/updated>/);
      if (!titleMatch || !linkMatch) continue;
      const title = titleMatch[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
      const link = linkMatch[1];
      const datetime = updatedMatch ? new Date(updatedMatch[1]).getTime() / 1000 : 0;
      items.push({
        id: `sec:${link}`,
        headline: title,
        summary: "",
        source: "SEC EDGAR",
        url: link,
        datetime,
        category: "sec",
        relatedTickers: [ticker],
      });
    }
    return items;
  } catch {
    return [];
  }
}

function dedupeAndSort(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    // dedupe key: URL or headline (URL is canonical)
    const key = item.url || item.headline;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  out.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
  return out;
}

/**
 * Fetch news from all sources for a ticker.
 * Returns up to `limit` items, deduplicated, sorted by recency.
 */
export async function fetchNewsForTicker(
  ticker: string,
  limit = 25,
): Promise<NewsItem[]> {
  const upper = ticker.toUpperCase();
  const isCrypto = upper.includes("-USD");

  // Try cache first
  return cached(`news-multi:${upper}`, 180, async () => {
    const [yahoo, google, sec] = await Promise.all([
      fetchYahoo(upper),
      fetchGoogle(upper, isCrypto),
      isCrypto ? Promise.resolve([]) : fetchSEC(upper),
    ]);

    const merged = [...yahoo, ...google, ...sec];
    return dedupeAndSort(merged).slice(0, limit);
  });
}

/**
 * Fetch news for multiple tickers (used by /news feed).
 * Returns one combined list, sorted by recency.
 */
export async function fetchNewsForTickers(
  tickers: string[],
  perTicker = 3,
  totalLimit = 30,
): Promise<(NewsItem & { ticker: string })[]> {
  const results = await Promise.all(
    tickers.map(async (t) => {
      try {
        const items = await fetchNewsForTicker(t, perTicker * 2);
        return items.slice(0, perTicker).map((it) => ({ ...it, ticker: t }));
      } catch {
        return [] as Array<NewsItem & { ticker: string }>;
      }
    }),
  );
  const all: Array<NewsItem & { ticker: string }> = results.flat();
  return (dedupeAndSort(all) as Array<NewsItem & { ticker: string }>).slice(0, totalLimit);
}

/**
 * Map of common source names to "tier" for UI display.
 * Tier 1: Bloomberg, Reuters, WSJ, FT, NYT (most established)
 * Tier 2: CNBC, MarketWatch, Yahoo Finance, Forbes
 * Tier 3: Others
 */
export function classifySource(source: string): 1 | 2 | 3 {
  const s = source.toLowerCase();
  if (
    /bloomberg|reuters|wsj|wall street|financial times|nytimes|new york times|barron|cnbc|associated press/.test(s)
  ) {
    return 1;
  }
  if (/marketwatch|yahoo|forbes|business insider|cnn|morningstar|investopedia/.test(s)) {
    return 2;
  }
  return 3;
}
