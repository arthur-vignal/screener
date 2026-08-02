import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const ALLOWED_DOMAINS = [
  "yahoo.com",
  "finance.yahoo.com",
  "news.google.com",
  "reuters.com",
  "bloomberg.com",
  "wsj.com",
  "ft.com",
  "cnbc.com",
  "marketwatch.com",
  "forbes.com",
  "morningstar.com",
  "investopedia.com",
  "seekingalpha.com",
  "fool.com",
  "benzinga.com",
  "zacks.com",
  "nasdaq.com",
  "sec.gov",
  "coindesk.com",
  "cointelegraph.com",
  "decrypt.co",
  "bitcoinmagazine.com",
];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_DOMAINS.some((d) => u.hostname.endsWith(d));
  } catch {
    return false;
  }
}

function extractContent(html: string): string | null {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  let content = articleMatch ? articleMatch[0] : cleaned;

  content = content.replace(/<\s*br\s*\/?>/gi, "\n");
  content = content.replace(/<\s*\/\s*p\s*>/gi, "\n\n");
  content = content.replace(/<\s*p[^>]*>/gi, "");

  content = content.replace(/<[^>]+>/g, "");

  content = content
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  content = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");

  if (content.length < 200) return null;

  if (content.length > 30000) {
    content = content.slice(0, 30000) + "...";
  }

  return content;
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!r.ok) return null;
    const text = await r.text();
    return extractContent(text);
  } catch {
    return null;
  }
}

async function fetchWithWaybackFallback(url: string): Promise<string | null> {
  // Try direct first
  const direct = await tryFetch(url);
  if (direct) return direct;

  // Google News URLs are tricky — server-side blocks 400
  // Fall back to Wayback Machine for any URL that fails direct fetch
  try {
    const wbUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const r = await fetch(wbUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      archived_snapshots?: { closest?: { available?: boolean; url?: string } };
    };
    const snapshot = data.archived_snapshots?.closest;
    if (!snapshot?.available || !snapshot.url) return null;
    // Fetch the wayback snapshot (rewrites to original)
    return await tryFetch(snapshot.url.replace(/^http:/, "https:"));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ content: null, error: "url required" }, { status: 400 });
  }

  if (!isAllowed(url)) {
    return NextResponse.json(
      { content: null, error: "domain not in allowlist" },
      { status: 403 },
    );
  }

  try {
    const content = await cached(`article:${url}`, 3600, async () => {
      return await fetchWithWaybackFallback(url);
    });

    if (!content) {
      return NextResponse.json({ content: null });
    }
    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json(
      { content: null, error: String(err) },
      { status: 500 },
    );
  }
}
