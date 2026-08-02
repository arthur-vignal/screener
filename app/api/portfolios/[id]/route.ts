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
  initial_value: number;
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
      `SELECT p.id, p.owner_id, p.slug, p.name, p.description, p.initial_value, p.is_public, p.created_at, p.updated_at, u.username
       FROM portfolios p LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.slug = ? OR p.id = ?`,
    )
    .get(id, Number(id)) as Row | undefined;

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Check access
  const user = await getCurrentUser();
  if (row.is_public === 0 && row.owner_id !== user?.userId) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  const holdings = db
    .prepare("SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = ?")
    .all(row.id) as { symbol: string; weight: number }[];

  return NextResponse.json({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    initialValue: row.initial_value,
    isPublic: row.is_public === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: row.username,
    ownerId: row.owner_id,
    holdings,
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
    .prepare("SELECT owner_id FROM portfolios WHERE slug = ? OR id = ?")
    .get(id, Number(id)) as { owner_id: number | null } | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.owner_id !== user.userId) {
    return NextResponse.json({ error: "not your portfolio" }, { status: 403 });
  }
  db.prepare("DELETE FROM portfolios WHERE id = ?").run(row.owner_id);
  // re-delete by id
  const r = db.prepare("SELECT id FROM portfolios WHERE slug = ? OR id = ?").get(id, Number(id)) as { id: number } | undefined;
  if (r) db.prepare("DELETE FROM portfolios WHERE id = ?").run(r.id);
  return NextResponse.json({ ok: true });
}
