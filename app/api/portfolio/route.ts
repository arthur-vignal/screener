/**
 * /api/portfolio — lista portfolios do user (GET) ou cria novo (POST).
 *
 * Auth: obrigatório (sessão via cookie screener_session).
 *
 * GET → `{ portfolios: PortfolioSummary[] }`
 *   Cada portfolio: id, slug, name, description, initial_value,
 *                   holdings_count, current_value (soma weight × preço),
 *                   total_return_pct, is_public, created_at
 *
 * POST `{ name, description?, initialValue?, isPublic? }` → `{ portfolio }`
 *
 * NOTA: tabela `portfolios` e `portfolio_holdings` já existem (migration
 * 0001). Para esta leva, mantemos o modelo de holdings por WEIGHT (%)
 * definido no schema. Adicionar tabela `positions` (qty + avg_price) é
 * a próxima leva — registrado em TODO.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { insert, query, update } from "@/lib/db";

export const dynamic = "force-dynamic";

type PortfolioRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initial_value: number;
  is_public: boolean;
  created_at: number;
  updated_at: number;
};

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Lista portfolios do user. Holdings count via subquery.
  // Current value/return ficam pra rota /api/portfolio/[slug] (precisa
  // puxar cotação de cada símbolo, mais pesado).
  const rows = await query<PortfolioRow & { holdings_count: number }>(
    `SELECT p.id, p.slug, p.name, p.description, p.initial_value,
            p.is_public, p.created_at, p.updated_at,
            COALESCE((SELECT COUNT(*) FROM portfolio_holdings h
                       WHERE h.portfolio_id = p.id), 0)::int AS holdings_count
     FROM portfolios p
     WHERE p.owner_id = $1
     ORDER BY p.updated_at DESC`,
    [user.userId],
  );

  return NextResponse.json({ portfolios: rows });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    initialValue?: number;
    isPublic?: boolean;
  };

  const name = (body.name ?? "").trim();
  if (name.length < 2 || name.length > 60) {
    return NextResponse.json(
      { error: "Nome deve ter 2-60 caracteres" },
      { status: 400 },
    );
  }

  const description = (body.description ?? "").trim().slice(0, 280);
  const initialValue =
    typeof body.initialValue === "number" && body.initialValue > 0
      ? body.initialValue
      : 10_000;
  const isPublic = body.isPublic === true;

  // Gera slug único a partir do nome (kebab-case, sem acentos).
  // Se colidir, anexa sufixo numérico até virar único.
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "portfolio";

  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const existing = await query<{ id: number }>(
      "SELECT id FROM portfolios WHERE slug = $1 LIMIT 1",
      [slug],
    );
    if (existing.length === 0) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
    if (attempt > 99) {
      return NextResponse.json(
        { error: "Não foi possível gerar um slug único" },
        { status: 500 },
      );
    }
  }

  const inserted = await insert("portfolios", {
    owner_id: user.userId,
    slug,
    name,
    description,
    initial_value: initialValue,
    is_public: isPublic,
  });
  if (!inserted[0]) {
    return NextResponse.json(
      { error: "Falha ao criar portfólio" },
      { status: 500 },
    );
  }

  return NextResponse.json({ portfolio: inserted[0] }, { status: 201 });
}

// PATCH: atualiza um portfolio existente (name/description/isPublic).
// Body: { id: number, name?, description?, isPublic? }
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    id?: number;
    name?: string;
    description?: string;
    isPublic?: boolean;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }
  // Confirma ownership.
  const own = await query<{ id: number }>(
    "SELECT id FROM portfolios WHERE id = $1 AND owner_id = $2",
    [body.id, user.userId],
  );
  if (own.length === 0) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const set: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length < 2 || n.length > 60) {
      return NextResponse.json({ error: "nome inválido" }, { status: 400 });
    }
    set.name = n;
  }
  if (typeof body.description === "string") {
    set.description = body.description.trim().slice(0, 280);
  }
  if (typeof body.isPublic === "boolean") {
    set.is_public = body.isPublic;
  }
  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: "nada a atualizar" }, { status: 400 });
  }
  set.updated_at = Math.floor(Date.now() / 1000);
  const updated = await update("portfolios", set, { id: body.id });
  return NextResponse.json({ portfolio: updated[0] ?? null });
}
