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
 *   { title, url, source, publishedAt (ISO), datetime (unix seconds),
 *     ticker?: string }  // B3 ticker pattern detectado (PETR4, VALE3, etc)
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
  /** B3 ticker detected (PETR4, VALE3, etc) — used by NewsCard pack 06. */
  ticker?: string;
};

/**
 * Regex usada pra extrair ticker B3 (PETR4, VALE3, BBDC4) ou ativo
 * 4 letras tipo BDR (AAPL, MSFT mas vamos ignorar fora B3). Ordem:
 *
 *   1. Ticker B3 clássico: 4 letras + 1-2 dígitos (PETR4, VALE3, BBDC4)
 *   2. Ticker BDR: 4 letras + 2 dígitos + letra (AAPL34)
 *
 * Lookbehind em palavras evita capturar "B3B3" tipo coincidência e
 * `CEO`, "EUA", "IPO" que são comuns em texto PT-BR.
 */
const TICKER_RE = /\b([A-Z]{4}\d{1,2}|[A-Z]{4}\d[A-Z])\b/;

const TICKER_BLACKLIST = new Set([
  "B3SA", // false positive comum (B3 + SA de Razão Social)
  "BRAS", // "BRASil" (não tem mas defensivo)
  "HTTP", "HTTPS",
  // Macroeconômicos comuns em manchetes que não são ações
  "SELIC", "CDIE", "IPCA", "PIB", "IGPM", "IPGM",
  "IBOV", "IFIX", "IDIV", "BDRX", "SMLL", "IVBX",
]);

function extractTicker(title: string): string | undefined {
  const m = TICKER_RE.exec(title);
  if (!m) return undefined;
  const ticker = m[1]!;
  if (TICKER_BLACKLIST.has(ticker)) return undefined;
  return ticker;
}

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
      ticker: extractTicker(title),
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
