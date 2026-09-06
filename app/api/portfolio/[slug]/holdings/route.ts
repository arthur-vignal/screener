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
 *   - A coluna `weight` (NOT NULL legado) é recalculada como
 *     `qty × avg_price / SUM(qty × avg_price over portfolio)` após cada
 *     INSERT/UPDATE. Mantida pra retrocompat.
 *
 * DELETE `{ symbol }` → remove posição do portfolio.
 *
 * Auth: obrigatório, e o user tem que ser dono do portfolio.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type PortfolioRow = { id: number; owner_id: string };

const EARLIEST_PURCHASE_SEC = 1262304000; // 2010-01-01 00:00:00 UTC

/**
 * Recalcula `weight` (fração 0-1) de todas as posições do portfolio.
 * Necessário porque `weight = qty × avg_price / SUM(qty × avg_price)`
 * muda quando uma posição é inserida/atualizada/removida.
 *
 * Estratégia: 1 query de SELECT pra somar tudo + N updates.
 * Pra portfolios ≤50 holdings isso é barato (1 batch query).
 */
async function recalculateWeights(portfolioId: number): Promise<void> {
  const sb = (await import("@/lib/supabase")).supabaseAdmin();

  // Soma total de posição (qty × avg_price) — pode ser 0 se portfolio vazio.
  const sumRows = await query<{ total: number | null }>(
    `SELECT COALESCE(SUM(qty * avg_price), 0)::DOUBLE PRECISION AS total
     FROM portfolio_holdings WHERE portfolio_id = $1`,
    [portfolioId],
  );
  const total = sumRows[0]?.total ?? 0;

  // Pega todas as posições do portfolio.
  const positions = await query<{ symbol: string; qty: number; avg_price: number }>(
    `SELECT symbol, qty, avg_price FROM portfolio_holdings
     WHERE portfolio_id = $1`,
    [portfolioId],
  );

  if (total <= 0) {
    // Portfolio vazio ou todas as posições têm avg_price=0 (edge case):
    // zera todos os weights pra ficar consistente.
    const { error } = await sb
      .from("portfolio_holdings")
      .update({ weight: 0 })
      .eq("portfolio_id", portfolioId);
    if (error) {
      console.error("[recalculateWeights] zero-out failed:", error.message);
    }
    return;
  }

  // Update em batch — Supabase REST aceita array de updates via
  // upsert, mas é mais limpo fazer update um por um (≤50 holdings).
  for (const p of positions) {
    const weight = (p.qty * p.avg_price) / total;
    const { error } = await sb
      .from("portfolio_holdings")
      .update({ weight })
      .eq("portfolio_id", portfolioId)
      .eq("symbol", p.symbol);
    if (error) {
      console.error(`[recalculateWeights] update ${p.symbol} failed:`, error.message);
    }
  }
}

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
        // weight temporário, recalculado abaixo pra todas as posições.
        weight: 0,
      })
      .eq("portfolio_id", portfolioId)
      .eq("symbol", symbol);
    if (error) {
      return NextResponse.json(
        { error: `Falha ao atualizar: ${error.message}` },
        { status: 500 },
      );
    }
    await recalculateWeights(portfolioId);
    return NextResponse.json({
      symbol,
      qty,
      avg_price: avgPrice,
      purchased_at: purchasedAt,
      action: "updated",
    });
  }

  // INSERT: `weight` é NOT NULL legado — colocamos 0 e recalculamos depois
  // pra todas as posições do portfolio de uma vez (incluindo essa nova).
  const { error: insertError } = await sb
    .from("portfolio_holdings")
    .insert({
      portfolio_id: portfolioId,
      symbol,
      qty,
      avg_price: avgPrice,
      purchased_at: purchasedAt,
      weight: 0,
    });
  if (insertError) {
    return NextResponse.json(
      { error: `Falha ao adicionar: ${insertError.message}` },
      { status: 500 },
    );
  }

  await recalculateWeights(portfolioId);

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

  const { error: deleteError, count } = await (await import("@/lib/supabase"))
    .supabaseAdmin()
    .from("portfolio_holdings")
    .delete({ count: "exact" })
    .eq("portfolio_id", portfolioId)
    .eq("symbol", symbol);
  if (deleteError) {
    return NextResponse.json(
      { error: `Falha ao remover: ${deleteError.message}` },
      { status: 500 },
    );
  }
  // Recalcula weights das posições restantes.
  await recalculateWeights(portfolioId);
  return NextResponse.json({ symbol, deleted: count ?? 0 });
}