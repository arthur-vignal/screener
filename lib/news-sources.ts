/**
 * Multi-source news aggregator for assets.
 *
 * Brazilian tickers (B3): Google News RSS filtered through a hard whitelist
 *   of verified B3/BR-market sources — InfoMoney, Valor, Money Times,
 *   NeoFeed, Brazil Journal, B3 official. No Yahoo, no generic Google.
 *
 * US tickers: SEC EDGAR filings only (10-K/10-Q/8-K). No Yahoo Finance.
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

/**
 * Whitelist of trusted Brazilian financial-news hosts. Host match is
 * substring-based on the <source url="..."> attribute of each RSS item
 * (the publisher that Google News attributes the story to), with a
 * fallback to the resolved <link> host. Anything outside this set is
 * discarded.
 */
const BR_VERIFIED_HOSTS: readonly string[] = [
  "infomoney.com.br",
  "valor.globo.com",
  "valor.com.br",
  "moneytimes.com.br",
  "neofeed.com.br",
  "braziljournal.com",
  "b3.com.br",
  // Additional trusted Brazilian financial outlets surfaced via
  // expanded news query. These all cover B3/macro and have editorial
  // standards comparable to the original six.
  "estadao.com.br",
  "suno.com.br",
  "investidor10.com.br",
  "bpmoney.com.br",
  "br.investing.com",
  "exame.com",
  "exame.invest",
];

function hostMatchesWhitelist(host: string): boolean {
  const h = host.toLowerCase();
  return BR_VERIFIED_HOSTS.some((w) => h === w || h.endsWith("." + w));
}

/**
 * Lightweight Portuguese-vs-English heuristic. Returns true when the
 * headline looks Portuguese (has any diacritic or common PT-BR token).
 * English headlines are discarded.
 */
function looksPortuguese(headline: string): boolean {
  // Diacritics common to PT-BR
  if (/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(headline)) return true;
  // Common PT-BR stopwords that don't overlap with English usage
  if (/\b(ações|ação|mercado|dividendo|balanço|faturamento|empresa|empresas|investidor|investidores|lucro|prejuízo|valor|negociação|negociações|ações|índices|índice|fii|fundos|imposto|juro|juros|selic|ibovespa|dólar|real|b3|brasil|brasileiro|brasileira|negociadas|negociado|cotação|cotacoes|fechamento|abertura|alta|baixa|queda|subida|recorde|máxima|mínima|saldo|resultado|resultados|trimestre|anual|semestral|estimativa|projeção|projeções|recomendação|recomendações|compra|venda|manutenção|peso|papel|papeis)\b/i.test(
    headline,
  ))
    return true;
  return false;
}

export async function fetchBrazilianVerified(ticker: string): Promise<NewsItem[]> {
  const upper = ticker.toUpperCase();
  try {
    // Query Google News RSS restricted to Brazilian Portuguese sources.
    // We let Google return any source, then the host-whitelist filter
    // below drops anything that isn't one of the verified B3/BR outlets.
    // Using "OR site:..." in the q parameter causes Google News to
    // return very few results (the operator stack truncates the index),
    // so we keep the query simple and rely on the post-filter instead.
    const q = `${upper} B3 ações`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419&when=7d`;
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return [];
    const xml = await r.text();

    const items: NewsItem[] = [];
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
    for (const item of itemMatches.slice(0, 25)) {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch =
        item.match(/<link\/>\s*([^<\s]+)/) ??
        item.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceUrlMatch = item.match(
        /<source[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/,
      );

      if (!titleMatch) continue;
      const headline = titleMatch[1]
        .replace(/<!\[CDATA\[/g, "")
        .replace(/\]\]>/g, "")
        .trim();
      const link = linkMatch?.[1]?.trim() ?? "#";
      const pubDate = pubDateMatch?.[1]?.trim() ?? "";
      const datetime = pubDate ? new Date(pubDate).getTime() / 1000 : 0;
      const sourceDisplay =
        sourceUrlMatch?.[2]
          ?.replace(/<!\[CDATA\[/g, "")
          .replace(/\]\]>/g, "")
          .trim() ?? "Verificado";
      const sourceUrl = sourceUrlMatch?.[1] ?? link;

      // Whitelist filter — check the source url host first, then the link host.
      let sourceHost = "";
      try {
        sourceHost = new URL(sourceUrl).hostname.toLowerCase();
      } catch {
        sourceHost = "";
      }
      let linkHost = "";
      try {
        linkHost = new URL(link).hostname.toLowerCase();
      } catch {
        linkHost = "";
      }
      // Special case: Google News redirector link (news.google.com) — trust
      // the <source url> host in that case.
      const isGoogleRedirect =
        linkHost === "news.google.com" || linkHost.endsWith(".news.google.com");
      const candidateHost = isGoogleRedirect ? sourceHost : linkHost || sourceHost;
      if (!candidateHost || !hostMatchesWhitelist(candidateHost)) continue;

      // Drop English headlines (BR-only policy).
      if (!looksPortuguese(headline)) continue;

      items.push({
        id: `br:${candidateHost}:${link}`,
        headline,
        summary: "",
        source: sourceDisplay,
        url: isGoogleRedirect ? sourceUrl : link,
        datetime,
        category: "br-verified",
        relatedTickers: [upper],
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchGoogle(_ticker: string, _isCrypto: boolean): Promise<NewsItem[]> {
  // Disabled: BR-only verified-source policy. Generic Google News RSS is
  // intentionally not used to avoid leaking unverified publishers.
  return [];
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
 *
 * BR tickers (B3 suffix like PETR4, VALE3): only the 6 verified BR portals
 *   (InfoMoney, Valor, Money Times, NeoFeed, Brazil Journal, B3).
 * US tickers: SEC EDGAR filings only.
 *
 * Returns up to `limit` items, deduplicated, sorted by recency.
 */
export async function fetchNewsForTicker(
  ticker: string,
  limit = 25,
): Promise<NewsItem[]> {
  const upper = ticker.toUpperCase();
  const isBrazilian = /^[A-Z]{4}\d{1,2}$/.test(upper);

  return cached(`news-multi:${upper}`, 180, async () => {
    const items: NewsItem[] = isBrazilian
      ? await fetchBrazilianVerified(upper)
      : await fetchSEC(upper);
    return dedupeAndSort(items).slice(0, limit);
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



/**
 * Generic RSS fetch + parse for B3 news sources. Each source below has
 * a public RSS/Atom feed that returns items with title, link, pubDate,
 * and description. We do our own lightweight parsing here so the
 * feed schema differences (some use rss, some atom, some omit fields)
 * don't leak into the rest of the codebase.
 */
type RssFeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

async function fetchRssFeed(url: string, timeoutMs = 8000): Promise<RssFeedItem[]> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const items: RssFeedItem[] = [];

    // Detect <item> (rss2) or <entry> (atom)
    const isAtom = /<feed[^>]*xmlns=/.test(xml) || /<entry>/.test(xml);
    if (isAtom) {
      const entries = xml.match(/<entry[\s\S]*?<\/entry>/g) ?? [];
      for (const entry of entries) {
        const title = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
        const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1]
                    ?? entry.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
                    ?? "";
        const pubDate = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim()
                       ?? entry.match(/<updated>([\s\S]*?)<\/updated>/)?.[1]?.trim()
                       ?? "";
        const description = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1]?.trim()
                          ?? entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.trim()
                          ?? "";
        items.push({
          title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
          link,
          pubDate,
          description: description.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        });
      }
    } else {
      const blocks = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
      for (const it of blocks) {
        const title = it.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
        const link = it.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
                   ?? it.match(/<link\/>\s*([^<\s]+)/)?.[1]?.trim()
                   ?? "";
        const pubDate = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
        const description = it.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]?.trim() ?? "";
        items.push({
          title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
          link,
          pubDate,
          description: description.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Common post-processing: convert the raw RSS items to NewsItem shape
 * with stable source label and ISO-ish datetime.
 */
function rssItemsToNews(
  items: RssFeedItem[],
  source: string,
  category: string,
): NewsItem[] {
  return items
    .filter((it) => it.title && it.link)
    .map((it) => {
      const datetime = it.pubDate
        ? Math.floor(new Date(it.pubDate).getTime() / 1000)
        : 0;
      return {
        id: `${source}:${it.link}`,
        headline: it.title,
        // Keep description text-only; strip HTML tags for the inline card.
        summary: it.description.replace(/<[^>]+>/g, "").slice(0, 500),
        source,
        url: it.link,
        datetime,
        category,
        relatedTickers: [],
      };
    });
}

/**
 * Status Invest — análise fundamentalista de B3.
 * https://statusinvest.com.br/noticias/rss
 */
export async function fetchStatusInvest(): Promise<NewsItem[]> {
  const items = await fetchRssFeed("https://statusinvest.com.br/noticias/rss");
  return rssItemsToNews(items, "Status Invest", "br-analysis");
}

/**
 * Smallcaps — cobertura de small caps brasileiras.
 * https://smallcaps.com.br/feed
 */
export async function fetchSmallcaps(): Promise<NewsItem[]> {
  const items = await fetchRssFeed("https://smallcaps.com.br/feed");
  return rssItemsToNews(items, "Smallcaps", "br-smallcaps");
}

/**
 * (B3 oficial dropped — portal renders news client-side, no public
 * RSS. The other three fetchers carry enough coverage for now.)
 */
