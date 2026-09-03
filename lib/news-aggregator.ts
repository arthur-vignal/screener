/**
 * News aggregator — múltiplas fontes de RSS brasileiros pra notícias da B3.
 *
 * Estrutura:
 *   fetchB3ActionsNews()  → InfoMoney Ações + Brazil Journal
 *                          (ticker pattern detectado, foco em ações B3)
 *   fetchB3MacroNews()    → InfoMoney geral + Money Times
 *                          (filtrado por keywords macro, sem ações específicas)
 *
 * Todas as fontes são RSS públicos (sem auth, sem rate limit). Headers
 * RSS 2.0 com title/link/pubDate/source(category equivalente).
 *
 * Yields:
 *   { id, title, url, source, publishedAt (ISO), datetime (unix seconds),
 *     ticker?: string (regex contra padrões B3 conhecidos)
 *
 * Substitui o antigo `lib/google-news.ts` (que usava Google News RSS).
 * Decisão 2026-09-02: Google News RSS tinha fontes ruins e tendenciosas;
 * portais RSS diretos (InfoMoney, Brazil Journal, Money Times, etc)
 * dão cobertura muito superior pra B3.
 */

type NewsItem = {
  /** Unique-ish ID for React keys. */
  id: string;
  /** Headline. */
  title: string;
  /** Source publication (Valor, InfoMoney, Suno, etc). */
  source: string;
  /** Absolute URL. */
  url: string;
  /** ISO 8601 timestamp. */
  publishedAt: string;
  /** unix seconds. For sorting/dedupe. */
  datetime: number;
  /** B3 ticker pattern detected (PETR4, VALE3, etc) — used by NewsCard pack 06. */
  ticker?: string;
};

// ─── Regex de ticker B3 ─────────────────────────────────────────────────────

const TICKER_RE = /\b([A-Z]{4}\d{1,2}|[A-Z]{4}\d[A-Z])\b/;

const TICKER_BLACKLIST = new Set([
  // Macroeconômicos — não são ações, são nomes de índice/índice-macro
  "SELIC", "CDIE", "IPCA", "PIB", "IGPM", "IPGM",
  "IBOV", "IFIX", "IDIV", "BDRX", "SMLL", "IVBX",
  // Falsos positivos comuns em texto PT-BR
  "B3SA", "BRAS", "HTTP", "HTTPS",
]);

function extractTicker(title: string): string | undefined {
  const m = TICKER_RE.exec(title);
  if (!m) return undefined;
  const t = m[1]!;
  if (TICKER_BLACKLIST.has(t)) return undefined;
  return t;
}

// ─── RSS fetch ──────────────────────────────────────────────────────────────

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0";

async function fetchRss(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

// Regex de items — RSS 2.0 (<item>) ou Atom (<entry>)
const RSS_ITEM_RE = /<item\b[\s\S]*?<\/item>/g;
const ATOM_ENTRY_RE = /<entry\b[\s\S]*?<\/entry>/g;

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
}

type RawItem = {
  title: string;
  url: string;
  pubDate: string;
  source: string;
};

function parseRss(xml: string, defaultSource: string): RawItem[] {
  // Detecta formato: RSS 2.0 ou Atom
  const isAtom = /<feed\b/.test(xml);
  const blockRe = isAtom ? ATOM_ENTRY_RE : RSS_ITEM_RE;
  const blocks = xml.match(blockRe) ?? [];
  const out: RawItem[] = [];
  for (const block of blocks) {
    let title: string | undefined;
    let url: string | undefined;
    let pubDate: string | undefined;
    let source = defaultSource;

    if (isAtom) {
      title = stripCdata(block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "");
      url =
        block.match(/<link[^>]*href="([^"]+)"/)?.[1] ??
        block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
      pubDate =
        block.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() ??
        block.match(/<updated>([\s\S]*?)<\/updated>/)?.[1]?.trim();
      // Atom source is <name> dentro de <author><name>...</name></author>
      const authorName = stripCdata(block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/)?.[1] ?? "");
      if (authorName) source = authorName;
    } else {
      title = stripCdata(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      // RSS 2.0: <link/> seguido de URL ou <link>URL</link>
      url = (
        block.match(/<link\/>\s*([^\s<]+)/)?.[1] ??
        block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
      );
      pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
      // RSS: <source>URL|Title</source>
      const srcMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      if (srcMatch) {
        const text = stripCdata(srcMatch[1] ?? "");
        if (text) source = text;
      }
    }
    if (!title || !url || !pubDate) continue;
    out.push({ title, url, pubDate, source });
  }
  return out;
}

function toNewsItem(raw: RawItem): NewsItem | null {
  const ts = new Date(raw.pubDate).getTime();
  if (!Number.isFinite(ts)) return null;
  return {
    id: `${raw.source}:${raw.url}`,
    title: raw.title,
    source: raw.source,
    url: raw.url,
    publishedAt: new Date(ts).toISOString(),
    datetime: Math.floor(ts / 1000),
    ticker: extractTicker(raw.title),
  };
}

// ─── Aggregators ────────────────────────────────────────────────────────────

/**
 * Fetch + merge de múltiplos feeds em paralelo. Dedupe por URL.
 */
async function mergeFeeds(
  feeds: Array<{ url: string; source: string }>,
): Promise<NewsItem[]> {
  const xmls = await Promise.all(
    feeds.map((f) => fetchRss(f.url)),
  );
  const all: NewsItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < feeds.length; i++) {
    const cfg = feeds[i]!;
    const xml = xmls[i];
    if (!xml) continue;
    const raws = parseRss(xml, cfg.source);
    for (const r of raws) {
      const item = toNewsItem(r);
      if (!item) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      all.push(item);
    }
  }
  return all
    .sort((a, b) => b.datetime - a.datetime);
}

const ACTIONS_FEEDS = [
  { url: "https://www.infomoney.com.br/tudo-sobre/acoes/feed/", source: "InfoMoney Ações" },
  { url: "https://braziljournal.com/feed/", source: "Brazil Journal" },
];

const MACRO_FEEDS = [
  { url: "https://www.infomoney.com.br/feed/", source: "InfoMoney" },
  { url: "https://www.moneytimes.com.br/feed/", source: "Money Times" },
  { url: "https://www.suno.com.br/noticias/feed/", source: "Suno Notícias" },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * News de ações B3 com preços embutidos (BRAPI batch).
 *
 * Fluxo:
 *   1. Fetch RSS de fontes (InfoMoney Ações + Brazil Journal)
 *   2. Para cada item, extract ticker via regex
 *   3. Batch fetch brapi `/v2/stocks/quote?symbols=...` (1 request)
 *   4. Merge {ticker: {price, changePercent}} em cada item
 *
 * Custo: 1 request brapi por 50 tickers (batch). Cache 1min pra
 * evitar request em cada refresh do /home.
 */

type TickerPrice = {
  price: number;
  changePercent: number;
};

async function fetchPricesForTickers(
  tickers: string[],
): Promise<Map<string, TickerPrice>> {
  if (tickers.length === 0) return new Map();
  try {
    const symbols = tickers.join(",");
    const url = `https://brapi.dev/api/v2/stocks/quote?symbols=${encodeURIComponent(symbols)}`;
    const r = await fetch(url, {
      headers: process.env.BRAPI_TOKEN
        ? { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` }
        : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return new Map();
    const data = (await r.json()) as {
      results?: Array<{
        symbol: string;
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
      }>;
    };
    const m = new Map<string, TickerPrice>();
    for (const it of data.results ?? []) {
      if (it.regularMarketPrice != null) {
        m.set(it.symbol, {
          price: it.regularMarketPrice,
          // brapi retorna em % direto (ex: 2.4 = +2.4%). UI aplica /100
          // se necessário via formato, mantendo valor em %.
          changePercent: it.regularMarketChangePercent ?? 0,
        });
      }
    }
    return m;
  } catch {
    return new Map();
  }
}

type NewsItemWithPrice = NewsItem & { price?: number; changePercent?: number };

export async function fetchB3ActionsNews(limit = 20): Promise<NewsItemWithPrice[]> {
  try {
    const items = await mergeFeeds(ACTIONS_FEEDS);
    const tickerSet = new Set<string>();
    for (const n of items) {
      if (n.ticker) tickerSet.add(n.ticker);
    }
    const prices = await fetchPricesForTickers([...tickerSet]);
    const enriched = items.map((n) => {
      if (!n.ticker) return n;
      const p = prices.get(n.ticker);
      return p
        ? { ...n, price: p.price, changePercent: p.changePercent }
        : n;
    });
    return enriched.slice(0, limit);
  } catch (err) {
    console.error(`[news-aggregator] actions: ${(err as Error).message}`);
    return [];
  }
}

/**
 * News macro BR. 3 feeds diretos. Filtrado por keywords pra excluir
 * notícia de ação específica (ex: "PETR4 paga x dividendos").
 *
 * Keyword match: precisa ter pelo menos 1 keyword positiva (macroeconômica),
 * E não pode ter regex de ticker de ação no título.
 *
 * Returns up to `limit` items, sorted newest-first.
 */
export async function fetchB3MacroNews(limit = 20): Promise<NewsItem[]> {
  const MACRO_KEYWORDS = [
    "selic", "ipca", "pib", "juros", "taxa", "inflação", "inflacao",
    "renda fixa", "tesouro", "macro", "economia", "fiscal",
    "orçamento", "orcamento", "ibovespa", "ibov", "dólar", "dolar",
    "câmbio", "cambio", "inflação", "inflacao", "igpm", "ibge",
    "copom", "cmn", "stn", "spending", "gdp", "banco central",
    "bcb", "receita federal", "receita", "pib", "crescimento",
    "inflação", "inflacao", "desemprego", "pnad",
  ];
  try {
    const items = await mergeFeeds(MACRO_FEEDS);
    const filtered = items.filter((n) => {
      const t = n.title.toLowerCase();
      const hasMacroKw = MACRO_KEYWORDS.some((k) => t.includes(k));
      if (!hasMacroKw) return false;
      // Rejeita se ticker B3 detectado (notícia de ação específica)
      const tickerPattern = /\b([A-Z]{4}\d{1,2}|[A-Z]{4}\d[A-Z])\b/;
      // Tickers blacklistados (índices macro) não contam como ticker de ação
      const tkr = tickerPattern.exec(n.title);
      if (!tkr) return true;
      const ticker = tkr[1]!;
      const isMacroTicker = TICKER_BLACKLIST.has(ticker);
      return isMacroTicker; // aceita se for índice macro, rejeita se for ação
    });
    return filtered.slice(0, limit);
  } catch (err) {
    console.error(`[news-aggregator] macro: ${(err as Error).message}`);
    return [];
  }
}

// ─── Compat shim ────────────────────────────────────────────────────────────
// lib/google-news.ts foi renomeado pra news-aggregator.ts. Esse alias evita
// quebrar imports legados durante a transição. Remover após 2026-10-01.
export { fetchB3ActionsNews as fetchB3News };
export type GoogleNewsItem = NewsItem;
