import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  owner_id: number | null;
  slug: string;
  name: string;
  description: string;
  universe: string;
  filters: string;
  ranking: string;
  top_n: number;
  is_public: number;
  created_at: number;
  updated_at: number;
  username: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.id, i.owner_id, i.slug, i.name, i.description, i.universe, i.filters, i.ranking, i.top_n, i.is_public, i.created_at, i.updated_at, u.username
       FROM indices i LEFT JOIN users u ON i.owner_id = u.id
       WHERE i.slug = ? OR i.id = ?`,
    )
    .get(id, Number(id)) as Row | undefined;

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const user = await getCurrentUser();
  if (row.is_public === 0 && row.owner_id !== user?.userId) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  return NextResponse.json({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    universe: row.universe,
    filters: JSON.parse(row.filters),
    ranking: row.ranking,
    topN: row.top_n,
    isPublic: row.is_public === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: row.username,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login necessário" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT id, owner_id FROM indices WHERE slug = ? OR id = ?")
    .get(id, Number(id)) as { id: number; owner_id: number | null } | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.owner_id !== user.userId) {
    return NextResponse.json({ error: "not your index" }, { status: 403 });
  }
  db.prepare("DELETE FROM indices WHERE id = ?").run(row.id);
  return NextResponse.json({ ok: true });
}
