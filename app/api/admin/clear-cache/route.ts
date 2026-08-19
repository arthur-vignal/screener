import { NextRequest, NextResponse } from "next/server";
import { clearCache } from "@/lib/cache";

/**
 * POST /api/admin/clear-cache
 *
 * Invalidates the in-memory cache for brapi:full:* and brapi:quote:*
 * entries. Use when a ticker page is rendering empty/null fields even
 * though /api/asset/[symbol] returns fresh data on a direct probe.
 *
 * Auth: requires `Authorization: Bearer <ADMIN_TOKEN>` where
 * <ADMIN_TOKEN> must equal process.env.CACHE_PURGE_TOKEN. If the env
 * var is unset, the endpoint refuses all requests — we never allow
 * unauthenticated cache purge in production.
 *
 * Body (optional JSON): { "pattern": "brapi:full:PETR4" }
 *   - without body: clears all brapi:full:* and brapi:quote:* entries
 *   - with pattern: clears only entries matching that substring
 *
 * Returns: { "cleared": N } where N is the number of entries removed.
 */
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CACHE_PURGE_TOKEN;
  if (!expected) return false; // refuse if env not configured
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  return bearer === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let pattern: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    pattern = typeof body?.pattern === "string" ? body.pattern : undefined;
  } catch {
    pattern = undefined;
  }

  // Default: wipe the Brapi caches (the ones that have bitten us).
  // Pattern is OR'd across the two prefixes so one call covers both.
  if (!pattern) {
    const fullCount = clearCache("brapi:full:");
    const quoteCount = clearCache("brapi:quote:");
    return NextResponse.json({
      cleared: fullCount + quoteCount,
      detail: { brapiFull: fullCount, brapiQuote: quoteCount },
    });
  }

  const cleared = clearCache(pattern);
  return NextResponse.json({ cleared, pattern });
}