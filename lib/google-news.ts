/**
 * Google News RSS — fonte única de notícias da B3.
 *
 * Endpoint público `https://news.google.com/rss/search?q=...`. Sem auth,
 * sem bloqueio, sem rate limit. Retorna RSS 2.0 com <item> padrão.
 *
 * Usa query `"status invest" OR "valor investe" B3 ações` que puxa conteúdo
 * desses dois portais (mais InfoMoney, Suno, Money Times via cobertura
 * cruzada do Google News), todos com cobertura editorial da B3.
 *
 * Yields:
 *   { title, url, source, publishedAt (ISO), datetime (unix seconds) }
 */

export type GoogleNewsItem = {
  /** Unique-ish ID for React keys. */
  id: string;
  /** Headline. */
  title: string;
  /** Source publication (Valor, InfoMoney, Suno, etc). */
  source: string;
  /** Absolute URL. Google News redirects are unwrapped when possible. */
  url: string;
  /** ISO 8601 timestamp. */
  publishedAt: string;
  /** unix seconds. For sorting/dedupe. */
  datetime: number;
};

const QUERY = '"status invest" OR "valor investe" B3 ações';
const URL = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
}

function parseRss(xml: string, limit: number): GoogleNewsItem[] {
  const itemRe = /<item[\s\S]*?<\/item>/g;
  const titleRe = /<title>([\s\S]*?)<\/title>/;
  const linkEmptyRe = /<link\/>\s*([^\s<]+)/;
  const linkWrapRe = /<link>([\s\S]*?)<\/link>/;
  const pubRe = /<pubDate>([\s\S]*?)<\/pubDate>/;
  const sourceRe = /<source[^>]*>([\s\S]*?)<\/source>/;

  const blocks = xml.match(itemRe) ?? [];
  const items: GoogleNewsItem[] = [];
  for (const block of blocks) {
    if (items.length >= limit) break;
    const title = stripCdata(block.match(titleRe)?.[1] ?? "");
    // Google News RSS uses <link/> followed by the URL, not <link>URL</link>
    const link = (block.match(linkEmptyRe)?.[1]
      ?? block.match(linkWrapRe)?.[1]
      ?? "").trim();
    const pub = block.match(pubRe)?.[1]?.trim() ?? "";
    const sourceName = stripCdata(
      block.match(sourceRe)?.[1] ?? "Google News",
    );
    if (!title || !link || !pub) continue;

    const ts = new Date(pub).getTime();
    if (!Number.isFinite(ts)) continue;
    items.push({
      id: `${sourceName}:${link}`,
      title,
      source: sourceName,
      url: link,
      publishedAt: new Date(ts).toISOString(),
      datetime: Math.floor(ts / 1000),
    });
  }
  return items;
}

/**
 * Fetch the B3 news feed from Google News RSS.
 *
 * Returns up to `limit` items (default 20), sorted newest-first by the RSS
 * order (which is already chrono-descending).
 *
 * Never throws — returns an empty array if anything fails (network, parse,
 * rate-limit). Errors are logged to stderr for observability but the UI
 * degrades gracefully to "Sem notícias".
 */
export async function fetchB3News(limit = 20): Promise<GoogleNewsItem[]> {
  try {
    const r = await fetch(URL, {
      headers: {
        "User-Agent": "Sulfur-news/1.0 (+https://screener-app.example)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) {
      console.error(`[google-news] HTTP ${r.status}`);
      return [];
    }
    const xml = await r.text();
    return parseRss(xml, limit);
  } catch (err) {
    console.error(`[google-news] ${(err as Error).message ?? "fetch failed"}`);
    return [];
  }
}
