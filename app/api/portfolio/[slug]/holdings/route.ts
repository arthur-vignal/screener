/**
 * /api/portfolio/[slug]/holdings — gerencia holdings do portfolio.
 *
 * POST { symbol, weight } → adiciona ou atualiza holding.
 *   - weight: fração 0-1 (ex: 0.20 = 20% do portfolio).
 *   - se holding já existe pra esse symbol, atualiza o weight.
 *   - valida que a soma dos weights não passa de 1.0 (100%).
 *
 * DELETE { symbol } → remove holding do portfolio.
 *
 * Auth: obrigatório, e o user tem que ser dono do portfolio.
 *
 * NOTA: holdings é uma modelo simples (symbol + weight). O schema
 * atual (`portfolio_holdings`) não tem qty/avg_price. Pra próxima
 * leva, adicionar tabela `positions` com qty/avg_price e migrar.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { insert, query, remove } from "@/lib/db";

export const dynamic = "force-dynamic";

type PortfolioRow = { id: number; owner_id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    symbol?: string;
    weight?: number;
  };
  const symbol = (body.symbol ?? "").toUpperCase().trim();
  const weight = typeof body.weight === "number" ? body.weight : NaN;

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json(
      { error: "Ticker inválido (4-12 chars alfanuméricos)" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1) {
    return NextResponse.json(
      { error: "Weight deve ser fração 0-1 (ex: 0.20 = 20%)" },
      { status: 400 },
    );
  }

  // Confirma que portfolio é do user.
  const portfolios = await query<PortfolioRow>(
    `SELECT id, owner_id FROM portfolios
     WHERE slug = $1 AND owner_id = $2 LIMIT 1`,
    [slug, user.userId],
  );
  if (portfolios.length === 0) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }
  const portfolioId = portfolios[0]!.id;

  // Soma atual dos weights (excluindo o symbol se já existe).
  const currentWeights = await query<{ weight: number }>(
    `SELECT weight FROM portfolio_holdings
     WHERE portfolio_id = $1 AND symbol != $2`,
    [portfolioId, symbol],
  );
  const currentSum = currentWeights.reduce((s, w) => s + w.weight, 0);
  if (currentSum + weight > 1.0001) {
    return NextResponse.json(
      {
        error: `Soma dos pesos passaria de 100% (atual: ${(currentSum * 100).toFixed(1)}% + ${(weight * 100).toFixed(1)}% = ${((currentSum + weight) * 100).toFixed(1)}%)`,
      },
      { status: 400 },
    );
  }

  // Upsert: se já existe, atualiza; senão, insere.
  const existing = await query<{ symbol: string }>(
    `SELECT symbol FROM portfolio_holdings
     WHERE portfolio_id = $1 AND symbol = $2 LIMIT 1`,
    [portfolioId, symbol],
  );
  if (existing.length > 0) {
    // Update direto via REST.
    const sb = (await import("@/lib/supabase")).supabaseAdmin();
    const { error } = await sb
      .from("portfolio_holdings")
      .update({ weight })
      .eq("portfolio_id", portfolioId)
      .eq("symbol", symbol);
    if (error) {
      return NextResponse.json(
        { error: `Falha ao atualizar: ${error.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json({ symbol, weight, action: "updated" });
  }

  await insert("portfolio_holdings", {
    portfolio_id: portfolioId,
    symbol,
    weight,
  });

  return NextResponse.json({ symbol, weight, action: "added" }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { symbol?: string };
  const symbol = (body.symbol ?? "").toUpperCase().trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol obrigatório" }, { status: 400 });
  }

  const portfolios = await query<PortfolioRow>(
    `SELECT id, owner_id FROM portfolios
     WHERE slug = $1 AND owner_id = $2 LIMIT 1`,
    [slug, user.userId],
  );
  if (portfolios.length === 0) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }
  const portfolioId = portfolios[0]!.id;

  const deleted = await remove("portfolio_holdings", {
    portfolio_id: portfolioId,
    symbol,
  });
  return NextResponse.json({ symbol, deleted });
}
