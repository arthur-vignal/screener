import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const ALLOWED_DOMAINS = [
  "yahoo.com",
  "finance.yahoo.com",
  "news.google.com",  // Google News redirect URLs
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

/**
 * Extract readable text from HTML using simple heuristics:
 * - Strip <script>, <style>, <nav>, <header>, <footer>, <aside>
 * - Prefer <article> content if present
 * - Otherwise collect all <p> tags
 */
function extractContent(html: string): string | null {
  // Strip scripts and styles (including content)
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Try to find <article> first
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  let content = articleMatch ? articleMatch[0] : cleaned;

  // Strip remaining tags but keep <p> as paragraph breaks
  // Convert <p>, <br>, </p> to newlines
  content = content.replace(/<\s*br\s*\/?>/gi, "\n");
  content = content.replace(/<\s*\/\s*p\s*>/gi, "\n\n");
  content = content.replace(/<\s*p[^>]*>/gi, "");

  // Strip remaining HTML tags
  content = content.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  content = content
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Normalize whitespace
  content = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");

  // Drop if too short (means extraction failed)
  if (content.length < 200) return null;

  // Truncate to reasonable size
  if (content.length > 30000) {
    content = content.slice(0, 30000) + "...";
  }

  return content;
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
      const r = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
        redirect: "follow",
      });
      // For Google News, the final URL is what we should report
      // (but we keep using the original URL for the "open in source" link)
      if (!r.ok) return null;
      const html = await r.text();
      return extractContent(html);
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
