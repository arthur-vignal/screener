import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, exec } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  owner_id: number | null;
  slug: string;
  name: string;
  description: string;
  initial_value: number;
  is_public: number;
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
    `SELECT p.id, p.owner_id, p.slug, p.name, p.description, p.initial_value, p.is_public, p.created_at, p.updated_at, u.username, ph.symbol, ph.weight
     FROM portfolios p
     LEFT JOIN users u ON p.owner_id = u.id
     LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
     WHERE p.slug = ? OR p.id = ?`,
    [id, numericId],
  );

  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const r = rows[0];
  const user = await getCurrentUser();
  if (r.is_public === 0 && r.owner_id !== user?.userId) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  return NextResponse.json({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    initialValue: r.initial_value,
    isPublic: r.is_public === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    owner: r.username,
    ownerId: r.owner_id,
    holdings: rows
      .filter((x) => x.symbol && x.weight != null)
      .map((x) => ({ symbol: x.symbol!, weight: x.weight! })),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login necessário" }, { status: 401 });
  const { id } = await params;
  const numericId = Number(id);
  const row = (await query(
    "SELECT id, owner_id FROM portfolios WHERE slug = ? OR id = ?",
    [id, numericId],
  )) as { id: number; owner_id: number | null }[];
  if (row.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row[0].owner_id !== user.userId) {
    return NextResponse.json({ error: "not your portfolio" }, { status: 403 });
  }
  await exec("DELETE FROM portfolios WHERE id = ?", [row[0].id]);
  return NextResponse.json({ ok: true });
}
