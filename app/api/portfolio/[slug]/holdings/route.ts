/**
 * /api/portfolio/[slug]/holdings — gerencia posições do portfolio.
 *
 * Modelo novo (migration 0006): cada holding é uma posição com
 * `qty` (quantidade) + `avg_price` (preço médio de compra) +
 * `purchased_at` (unix seconds UTC da compra).
 *
 * POST `{ symbol, qty, avg_price, purchased_at }` → adiciona posição
 *   - Se já existe posição pra esse symbol, **substitui** (não merge).
 *   - Validação: qty > 0, avg_price > 0, purchased_at válido (não futuro,
 *     não anterior a 2010).
 *
 * DELETE `{ symbol }` → remove posição do portfolio.
 *
 * Auth: obrigatório, e o user tem que ser dono do portfolio.
 *
 * NOTA: campo `weight` foi descontinuado como input. Continua existindo
 * na tabela (calculado: qty × avg_price / SUM over portfolio) pra
 * retrocompat com qualquer leitura existente.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { insert, query, remove } from "@/lib/db";

export const dynamic = "force-dynamic";

type PortfolioRow = { id: number; owner_id: string };

const EARLIEST_PURCHASE_SEC = 1262304000; // 2010-01-01 00:00:00 UTC

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
    qty?: number;
    avg_price?: number;
    purchased_at?: number;
  };

  const symbol = (body.symbol ?? "").toUpperCase().trim();
  const qty = typeof body.qty === "number" ? body.qty : NaN;
  const avgPrice = typeof body.avg_price === "number" ? body.avg_price : NaN;
  const purchasedAt =
    typeof body.purchased_at === "number" ? body.purchased_at : NaN;

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json(
      { error: "Ticker inválido (4-12 chars alfanuméricos)" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json(
      { error: "Quantidade deve ser maior que zero" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
    return NextResponse.json(
      { error: "Preço médio deve ser maior que zero" },
      { status: 400 },
    );
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(purchasedAt) || purchasedAt < EARLIEST_PURCHASE_SEC) {
    return NextResponse.json(
      { error: "Data de compra inválida (use após 2010)" },
      { status: 400 },
    );
  }
  if (purchasedAt > nowSec) {
    return NextResponse.json(
      { error: "Data de compra não pode ser no futuro" },
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

  // Upsert via REST do Supabase (mantém compat com RLS disabled).
  // Se já existe posição pra esse symbol, atualiza in-place.
  const sb = (await import("@/lib/supabase")).supabaseAdmin();

  const existing = await query<{ symbol: string }>(
    `SELECT symbol FROM portfolio_holdings
     WHERE portfolio_id = $1 AND symbol = $2 LIMIT 1`,
    [portfolioId, symbol],
  );

  if (existing.length > 0) {
    const { error } = await sb
      .from("portfolio_holdings")
      .update({
        qty,
        avg_price: avgPrice,
        purchased_at: purchasedAt,
      })
      .eq("portfolio_id", portfolioId)
      .eq("symbol", symbol);
    if (error) {
      return NextResponse.json(
        { error: `Falha ao atualizar: ${error.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json({
      symbol,
      qty,
      avg_price: avgPrice,
      purchased_at: purchasedAt,
      action: "updated",
    });
  }

  await insert("portfolio_holdings", {
    portfolio_id: portfolioId,
    symbol,
    qty,
    avg_price: avgPrice,
    purchased_at: purchasedAt,
  });

  return NextResponse.json(
    {
      symbol,
      qty,
      avg_price: avgPrice,
      purchased_at: purchasedAt,
      action: "added",
    },
    { status: 201 },
  );
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