/**
 * /api/portfolio/summary — resumo agregado dos portfolios do user.
 *
 * Retorna o **portfolio mais recente** (updated_at DESC) com:
 *   - name, slug, holdings count
 *   - totalValue = soma (weight × preço atual) via brapi batch
 *   - changeToday = soma (weight × variação% hoje × valor posição)
 *
 * Se o user não tem portfolio, retorna `hasPortfolio: false` (a home
 * renderiza o empty state do PortfolioCard).
 *
 * Cache: preço vem via `lib/brapi-quote-batch.ts` (chunks de 19
 * símbolos, 1 req HTTP por chunk). Holdings ≤ 50, então 3 requests
 * máximo. Wrapper já tem cache 60s, então a home fica rápida.
 *
 * TODO: adicionar seletor de "portfolio ativo" via query param.
 * Por enquanto sempre retorna o mais recente.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";

export const dynamic = "force-dynamic";

type Holding = {
  symbol: string;
  weight: number;
};

type PortfolioRow = {
  id: number;
  slug: string;
  name: string;
  initial_value: number;
};

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ hasPortfolio: false, name: null });
  }

  // Pega o portfolio mais recente do user.
  const portfolios = await query<PortfolioRow>(
    `SELECT id, slug, name, initial_value
     FROM portfolios
     WHERE owner_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [user.userId],
  );

  if (portfolios.length === 0) {
    return NextResponse.json({ hasPortfolio: false, name: null });
  }

  const portfolio = portfolios[0]!;

  // Pega os holdings desse portfolio.
  const holdings = await query<Holding>(
    `SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = $1`,
    [portfolio.id],
  );

  if (holdings.length === 0) {
    return NextResponse.json({
      hasPortfolio: true,
      name: portfolio.name,
      slug: portfolio.slug,
      totalValue: portfolio.initial_value,
      changeToday: 0,
      changeTodayPercent: 0,
    });
  }

  // Busca cotação de todos os símbolos em batch.
  const symbols = holdings.map((h) => h.symbol);
  const quoteMap = await getBrapiQuoteBatch(symbols);

  let totalValue = 0;
  let changeToday = 0;
  for (const h of holdings) {
    const q = quoteMap.get(h.symbol);
    if (!q?.price) continue;
    // weight é fração 0-1; posição = weight × initial_value
    const positionValue = h.weight * portfolio.initial_value;
    totalValue += positionValue;
    if (q.change != null) {
      // Variação do dia em BRL = position × (change / price)
      // (change é absoluto, price é unitário)
      const posChange = (q.change / q.price) * positionValue;
      changeToday += posChange;
    }
  }

  // Se nenhum símbolo tinha cotação (todos falharam), usa initial.
  if (totalValue === 0) {
    totalValue = portfolio.initial_value;
  }

  const changeTodayPercent =
    totalValue > 0 ? (changeToday / totalValue) * 100 : 0;

  return NextResponse.json({
    hasPortfolio: true,
    name: portfolio.name,
    slug: portfolio.slug,
    totalValue,
    changeToday,
    changeTodayPercent,
  });
}
