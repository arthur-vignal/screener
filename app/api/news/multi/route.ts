import { NextResponse } from "next/server";

import { fetchB3ActionsNews } from "@/lib/news-aggregator";

/**
 * GET /api/news/multi
 *
 * News feed de AÇÕES B3 com preço embutido (campo `price` + `changePercent`
 * do brapi `/v2/stocks/quote` em batch).
 *
 * Each item agora tem shape:
 *   { id, title, source, url, publishedAt, datetime, ticker?,
 *     price?, changePercent? }
 *
 * Query params:
 *   - limit: number, default 20, max 50
 *   - cursor: optional datetime (unix seconds). Returns items older than this.
 *
 * Returns: { news: NewsItemWithPrice[] }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 15; // brapi batch pode adicionar 1-2s

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
