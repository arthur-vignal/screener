import { NextResponse } from "next/server";

import { fetchB3ActionsNews } from "@/lib/news-aggregator";

/**
 * GET /api/news/multi
 *
 * News feed de AÇÕES B3 (sem macro). Source: InfoMoney Ações + Brazil Journal
 * via `lib/news-aggregator.ts`.
 *
 * Query params:
 *   - limit: number, default 20, max 50
 *   - cursor: optional datetime (unix seconds). Returns items older than this.
 *     Used by infinite scroll on the home page.
 *
 * Returns: { news: NewsItem[] }
 *
 * NOTA: macro tab usa /api/news/multi-macro (não este endpoint).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") ?? "20")),
  );
  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? Number(cursorRaw) : null;

  const all = await fetchB3ActionsNews(50);
  if (all.length === 0) {
    return NextResponse.json({ news: [] });
  }

  let sliced = all;
  if (cursor && Number.isFinite(cursor)) {
    sliced = all.filter((n) => n.datetime < cursor);
  }
  return NextResponse.json({ news: sliced.slice(0, limit) });
}
