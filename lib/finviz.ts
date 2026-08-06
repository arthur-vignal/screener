import { cached } from "./cache";

const FINVIZ_BASE = "https://finviz.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type FinvizSnapshot = Record<string, string>;

export type FinvizNewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category: "finviz";
  relatedTickers: string[];
};

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function text(html: string): string {
  return decodeHtml(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

async function fetchStockPage(ticker: string): Promise<string> {
  const response = await fetch(
    `${FINVIZ_BASE}/stock?t=${encodeURIComponent(ticker)}&p=d`,
    {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 300 },
    },
  );
  if (!response.ok) throw new Error(`Finviz ${response.status}`);
  return response.text();
}

function parseSnapshot(html: string): FinvizSnapshot {
  const start = html.search(/<table[^>]*class="[^"]*(?:js-snapshot-table|snapshot-table2)/i);
  if (start < 0) return {};
  const section = html.slice(start, start + 80000);
  const result: FinvizSnapshot = {};
  const pairs = section.matchAll(
    /<div class="snapshot-td-label">([\s\S]*?)<\/div>[\s\S]*?<div class="snapshot-td-content">([\s\S]*?)<\/div>/gi,
  );
  for (const pair of pairs) {
    const label = text(pair[1]);
    const value = text(pair[2]);
    if (label) result[label] = value || "-";
  }
  return result;
}

function parseFinvizDate(raw: string, previousDate: Date): { date: Date; base: Date } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const full = cleaned.match(/^(Today|[A-Z][a-z]{2}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})(AM|PM)$/);
  const timeOnly = cleaned.match(/^(\d{1,2}:\d{2})(AM|PM)$/);
  let base = new Date(previousDate);
  let time = "12:00";
  let meridiem = "PM";
  if (full) {
    time = full[2];
    meridiem = full[3];
    if (full[1] === "Today") base = new Date();
    else {
      const [month, day, year] = full[1].split("-");
      base = new Date(`${month} ${day}, 20${year}`);
    }
  } else if (timeOnly) {
    time = timeOnly[1];
    meridiem = timeOnly[2];
  }
  const [hourRaw, minute] = time.split(":").map(Number);
  let hour = hourRaw;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  base.setHours(hour, minute, 0, 0);
  return { date: base, base };
}

function parseNews(html: string, ticker: string): FinvizNewsItem[] {
  const table = html.match(/<table[^>]*id="news-table"[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) return [];
  const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  let baseDate = new Date();
  const items: FinvizNewsItem[] = [];
  for (const row of rows) {
    const anchor = row.match(/<a[^>]*class="[^"]*tab-link-news[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    const rawDate = cells[0] ? text(cells[0][1]) : "";
    const parsed = parseFinvizDate(rawDate, baseDate);
    baseDate = parsed.base;
    const source = text(row.match(/<div class="news-link-right">([\s\S]*?)<\/div>/i)?.[1] ?? "")
      .replace(/^\(|\)$/g, "") || new URL(decodeHtml(anchor[1])).hostname.replace(/^www\./, "");
    const url = decodeHtml(anchor[1]);
    items.push({
      id: `finviz:${ticker}:${url}`,
      headline: text(anchor[2]),
      summary: "",
      source,
      url,
      datetime: Math.floor(parsed.date.getTime() / 1000),
      category: "finviz",
      relatedTickers: [ticker],
    });
  }
  return items;
}

export async function getFinvizStock(ticker: string): Promise<{
  snapshot: FinvizSnapshot;
  news: FinvizNewsItem[];
}> {
  const upper = ticker.toUpperCase();
  return cached(`finviz:stock:${upper}`, 300, async () => {
    const html = await fetchStockPage(upper);
    return { snapshot: parseSnapshot(html), news: parseNews(html, upper) };
  });
}
