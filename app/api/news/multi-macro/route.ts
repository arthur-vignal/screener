import { NextResponse } from "next/server";

import { fetchB3MacroNews } from "@/lib/news-aggregator";

/**
 * GET /api/news/multi-macro
 *
 * News feed MACROECONÔMICO BR (sem ações específicas). Source: InfoMoney
 * geral + Money Times + Suno Notícias, filtrado por keywords macro
 * e com filtro anti-ação (rejeita tickers B3 não-listados no blacklist
 * de índices macro).
 *
 * Para a Macro tab do /analysis.
 *
 * Returns: { news: NewsItem[] } — mesmo shape do /api/news/multi.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") ?? "20")),
  );

  const items = await fetchB3MacroNews(limit);
  return NextResponse.json({ news: items });
}
