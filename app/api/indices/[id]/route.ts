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
  const numericId = Number(id);
  const rows = await query<Row>(
    `SELECT i.id, i.owner_id, i.slug, i.name, i.description, i.universe, i.filters, i.ranking, i.top_n, i.is_public, i.created_at, i.updated_at, u.username
     FROM indices i LEFT JOIN users u ON i.owner_id = u.id
     WHERE i.slug = ? OR i.id = ?`,
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
    universe: r.universe,
    filters: JSON.parse(r.filters),
    ranking: r.ranking,
    topN: r.top_n,
    isPublic: r.is_public === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    owner: r.username,
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
  const rows = (await query(
    "SELECT id, owner_id FROM indices WHERE slug = ? OR id = ?",
    [id, numericId],
  )) as { id: number; owner_id: number | null }[];
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (rows[0].owner_id !== user.userId) {
    return NextResponse.json({ error: "not your index" }, { status: 403 });
  }
  await exec("DELETE FROM indices WHERE id = ?", [rows[0].id]);
  return NextResponse.json({ ok: true });
}
