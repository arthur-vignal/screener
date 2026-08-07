import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, remove, insert, update } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  owner_id: string | null;
  slug: string;
  name: string;
  description: string;
  initial_value: number;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  username: string | null;
  symbol: string | null;
  weight: number | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  const rows = await query<Row>(
    `SELECT p.id, p.owner_id, p.slug, p.name, p.description, p.initial_value, p.is_public, p.created_at, p.updated_at, pr.username, ph.symbol, ph.weight
     FROM portfolios p
     LEFT JOIN profiles pr ON p.owner_id = pr.id
     LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
     WHERE p.slug = $1 OR p.id = $2`,
    [id, numericId],
  );

  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const r = rows[0];
  const user = await getCurrentUser();
  if (!r.is_public && r.owner_id !== user?.userId) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  return NextResponse.json({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    initialValue: r.initial_value,
    isPublic: r.is_public,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    owner: r.username,
    ownerId: r.owner_id,
    holdings: rows
      .filter((x) => x.symbol && x.weight != null)
      .map((x) => ({ symbol: x.symbol!, weight: x.weight! })),
  });
}

/**
 * PATCH — mutate an existing portfolio. Supports two operations today:
 *   - `addHolding: { symbol, weight? }` — appends a ticker (rebalances existing
 *     weights equally so the sum stays 1.0).
 *   - `removeHolding: { symbol }` — removes a ticker (rebalances remaining).
 *
 * Auth: only the owner can mutate.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "login necessário" }, { status: 401 });
  }
  const { id } = await params;
  const numericId = Number(id);
  const rows = await query<{ id: number; owner_id: string | null }>(
    "SELECT id, owner_id FROM portfolios WHERE slug = $1 OR id = $2",
    [id, numericId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (rows[0].owner_id !== user.userId) {
    return NextResponse.json({ error: "not your portfolio" }, { status: 403 });
  }
  const portfolioId = rows[0].id;

  let body: {
    addHolding?: { symbol: string; weight?: number };
    removeHolding?: { symbol: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);

  if (body.addHolding) {
    const symbol = body.addHolding.symbol.toUpperCase();
    const existing = await query<{ symbol: string; weight: number }>(
      "SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = $1 ORDER BY symbol",
      [portfolioId],
    );
    if (existing.some((h) => h.symbol === symbol)) {
      return NextResponse.json(
        { error: `${symbol} já está no portfolio` },
        { status: 409 },
      );
    }
    const newCount = existing.length + 1;
    const equal = 1 / newCount;
    const next = [
      ...existing,
      {
        symbol,
        weight: body.addHolding.weight ?? equal,
      },
    ];
    // For all OTHER (pre-existing) holdings, rebalance to equal weight so the
    // total stays 1.0.
    const rebalancedExistingCount = existing.length;
    if (rebalancedExistingCount > 0) {
      const otherEqual = (1 - next[next.length - 1].weight) / rebalancedExistingCount;
      for (let i = 0; i < next.length - 1; i++) {
        next[i] = { ...next[i], weight: otherEqual };
      }
    }
    await remove("portfolio_holdings", { portfolio_id: portfolioId });
    await insert(
      "portfolio_holdings",
      next.map((h) => ({
        portfolio_id: portfolioId,
        symbol: h.symbol,
        weight: h.weight,
      })),
    );
    await update("portfolios", { updated_at: now }, { id: portfolioId });
    return NextResponse.json({ ok: true, added: symbol, holdings: next });
  }

  if (body.removeHolding) {
    const symbol = body.removeHolding.symbol.toUpperCase();
    const existing = await query<{ symbol: string; weight: number }>(
      "SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = $1 ORDER BY symbol",
      [portfolioId],
    );
    const filtered = existing.filter((h) => h.symbol !== symbol);
    if (filtered.length === existing.length) {
      return NextResponse.json(
        { error: `${symbol} não está no portfolio` },
        { status: 404 },
      );
    }
    if (filtered.length === 0) {
      await remove("portfolio_holdings", { portfolio_id: portfolioId });
    } else {
      const equal = 1 / filtered.length;
      const rebalanced = filtered.map((h) => ({ ...h, weight: equal }));
      await remove("portfolio_holdings", { portfolio_id: portfolioId });
      await insert(
        "portfolio_holdings",
        rebalanced.map((h) => ({
          portfolio_id: portfolioId,
          symbol: h.symbol,
          weight: h.weight,
        })),
      );
    }
    await update("portfolios", { updated_at: now }, { id: portfolioId });
    return NextResponse.json({ ok: true, removed: symbol });
  }

  return NextResponse.json(
    { error: "operação não suportada (addHolding | removeHolding)" },
    { status: 400 },
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login necessário" }, { status: 401 });
  const { id } = await params;
  const numericId = Number(id);
  const rows = await query<{ id: number; owner_id: string | null }>(
    "SELECT id, owner_id FROM portfolios WHERE slug = $1 OR id = $2",
    [id, numericId],
  );
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (rows[0].owner_id !== user.userId) {
    return NextResponse.json({ error: "not your portfolio" }, { status: 403 });
  }
  await remove("portfolios", { id: rows[0].id });
  return NextResponse.json({ ok: true });
}