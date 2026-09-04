/**
 * /api/portfolio/[slug]/news — notícias filtradas pelos tickers do portfolio.
 *
 * Pega o portfolio (se for do user OU público), extrai os símbolos dos
 * holdings, e retorna news do /api/news/multi que mencionam esses
 * símbolos (match no campo `ticker` ou via `TICKER_KEYWORDS` em
 * `lib/news-aggregator.ts`).
 *
 * Returns: { news: NewsItem[] }
 *
 * Auth: obrigatório. Sem auth → 401.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fetchB3ActionsNews, TICKER_KEYWORDS } from "@/lib/news-aggregator";

export const dynamic = "force-dynamic";

type Holding = { symbol: string; weight: number };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1. Resolve o portfolio + holdings.
  const portfolioRows = await query<{ id: number }>(
    `SELECT id FROM portfolios
     WHERE slug = $1
       AND (owner_id = $2 OR is_public = TRUE)
     LIMIT 1`,
    [slug, user.userId],
  );
  if (portfolioRows.length === 0) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }
  const portfolioId = portfolioRows[0]!.id;

  const holdings = await query<Holding>(
    `SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = $1`,
    [portfolioId],
  );
  const symbols = new Set(holdings.map((h) => h.symbol));
  if (symbols.size === 0) {
    return NextResponse.json({ news: [] });
  }

  // 2. Constrói o set de keywords aceitos (símbolo + aliases).
  const acceptedKeywords = new Set<string>();
  for (const sym of symbols) {
    acceptedKeywords.add(sym);
    const kw = TICKER_KEYWORDS[sym];
    if (kw) for (const k of kw) acceptedKeywords.add(k.toLowerCase());
  }

  // 3. Pega news e filtra.
  const all = await fetchB3ActionsNews(50);
  const filtered = all.filter((n) => {
    // Match direto pelo campo ticker.
    if (n.ticker && symbols.has(n.ticker)) return true;
    // Match por keyword em title (summary pode não estar no tipo
    // exportado da home, então usamos só title pra evitar TS error).
    const text = n.title.toLowerCase();
    for (const kw of acceptedKeywords) {
      if (kw && text.includes(kw)) return true;
    }
    return false;
  });

  // Adapta pro shape do NewsItem da home (descarta campos extras).
  const out = filtered.map((n) => ({
    id: n.id,
    title: n.title,
    source: n.source,
    publishedAt: n.publishedAt,
    url: n.url,
    ticker: n.ticker,
  }));

  return NextResponse.json({ news: out });
}
