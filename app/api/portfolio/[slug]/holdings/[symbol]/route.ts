/**
 * /api/portfolio/[slug]/holdings/[symbol] — editar/remover 1 holding.
 *
 * PATCH `{ qty?, avg_price?, purchased_at? }` → atualiza posição específica.
 *   - Pelo menos 1 dos 3 campos deve ser fornecido.
 *   - Validações idênticas ao POST /api/portfolio/[slug]/holdings.
 *   - Recalcula weights das posições restantes após UPDATE.
 *
 * DELETE → remove a posição daquele symbol do portfolio.
 *   - Idempotente: se symbol não existe, retorna 200 com deleted=0.
 *   - Recalcula weights após DELETE.
 *
 * Auth: portfolio deve pertencer ao user logado. Caso contrário, 404
 * (não revelar existência pra outros users).
 *
 * Schema: tabela `portfolio_holdings` tem PK `(portfolio_id, symbol)` —
 * path param `[symbol]` identifica a posição; portfolio_id vem do slug.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Mesmo limite do POST: ano 2010 = ~unix 1262304000. Compra antes disso
// é improvável pra ativo B3 e geralmente é erro de typing.
const EARLIEST_PURCHASE_SEC = 1262304000;

type PortfolioRow = { id: number; owner_id: number };

type HoldingBody = {
  qty?: number;
  avg_price?: number;
  purchased_at?: number;
};

function validateHoldingBody(body: HoldingBody): {
  ok: true;
  qty?: number;
  avgPrice?: number;
  purchasedAt?: number;
} | { ok: false; status: number; message: string } {
  const out: { qty?: number; avgPrice?: number; purchasedAt?: number } = {};
  let hasAny = false;

  if (body.qty !== undefined) {
    if (!Number.isFinite(body.qty) || body.qty <= 0) {
      return {
        ok: false,
        status: 400,
        message: "Quantidade deve ser maior que zero",
      };
    }
    out.qty = body.qty;
    hasAny = true;
  }

  if (body.avg_price !== undefined) {
    if (!Number.isFinite(body.avg_price) || body.avg_price <= 0) {
      return {
        ok: false,
        status: 400,
        message: "Preço médio deve ser maior que zero",
      };
    }
    out.avgPrice = body.avg_price;
    hasAny = true;
  }

  if (body.purchased_at !== undefined) {
    if (
      !Number.isFinite(body.purchased_at) ||
      body.purchased_at < EARLIEST_PURCHASE_SEC
    ) {
      return {
        ok: false,
        status: 400,
        message: "Data de compra inválida (use após 2010)",
      };
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (body.purchased_at > nowSec) {
      return {
        ok: false,
        status: 400,
        message: "Data de compra não pode ser no futuro",
      };
    }
    out.purchasedAt = body.purchased_at;
    hasAny = true;
  }

  if (!hasAny) {
    return {
      ok: false,
      status: 400,
      message: "Forneça pelo menos um campo: qty, avg_price, purchased_at",
    };
  }

  return { ok: true, ...out };
}

/** Recalcula weight (= qty × avg_price / SUM) pra todas as posições do portfolio. */
async function recalculateWeights(portfolioId: number): Promise<void> {
  await query(
    `UPDATE portfolio_holdings ph
     SET weight = (
       SELECT CASE WHEN SUM(qty * avg_price) = 0 THEN 0
                   ELSE ph.qty * ph.avg_price / SUM(qty * avg_price)
              END
       FROM portfolio_holdings
       WHERE portfolio_id = $1
     )
     WHERE portfolio_id = $1`,
    [portfolioId],
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; symbol: string }> },
): Promise<NextResponse> {
  const { slug, symbol: rawSymbol } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const symbol = rawSymbol.toUpperCase().trim();
  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json(
      { error: "Ticker inválido (4-12 chars alfanuméricos)" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as HoldingBody;
  const validated = validateHoldingBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.message }, { status: validated.status });
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

  // Verifica que holding existe.
  const existing = await query<{ symbol: string }>(
    `SELECT symbol FROM portfolio_holdings
     WHERE portfolio_id = $1 AND symbol = $2 LIMIT 1`,
    [portfolioId, symbol],
  );
  if (existing.length === 0) {
    return NextResponse.json({ error: "ativo não está no portfolio" }, { status: 404 });
  }

  const sb = (await import("@/lib/supabase")).supabaseAdmin();

  const updateFields: Record<string, number> = {};
  if (validated.qty !== undefined) updateFields.qty = validated.qty;
  if (validated.avgPrice !== undefined) updateFields.avg_price = validated.avgPrice;
  if (validated.purchasedAt !== undefined) updateFields.purchased_at = validated.purchasedAt;
  updateFields.weight = 0; // recalculado abaixo

  const { error } = await sb
    .from("portfolio_holdings")
    .update(updateFields)
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
    qty: validated.qty,
    avg_price: validated.avgPrice,
    purchased_at: validated.purchasedAt,
    action: "updated",
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; symbol: string }> },
): Promise<NextResponse> {
  const { slug, symbol: rawSymbol } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const symbol = rawSymbol.toUpperCase().trim();
  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json(
      { error: "Ticker inválido (4-12 chars alfanuméricos)" },
      { status: 400 },
    );
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
