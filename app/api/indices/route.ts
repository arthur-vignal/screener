import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Universe, IndexFilters, IndexRanking } from "@/lib/index-calculator";

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

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const scope = req.nextUrl.searchParams.get("scope") ?? "public";

  const db = getDb();
  let rows: Row[];
  if (user && scope === "mine") {
    rows = db
      .prepare(
        `SELECT i.id, i.owner_id, i.slug, i.name, i.description, i.universe, i.filters, i.ranking, i.top_n, i.is_public, i.created_at, i.updated_at, u.username
         FROM indices i LEFT JOIN users u ON i.owner_id = u.id
         WHERE i.owner_id = ?
         ORDER BY i.created_at DESC`,
      )
      .all(user.userId) as Row[];
  } else {
    rows = db
      .prepare(
        `SELECT i.id, i.owner_id, i.slug, i.name, i.description, i.universe, i.filters, i.ranking, i.top_n, i.is_public, i.created_at, i.updated_at, u.username
         FROM indices i LEFT JOIN users u ON i.owner_id = u.id
         WHERE i.is_public = 1
         ORDER BY i.created_at DESC`,
      )
      .all() as Row[];
  }

  const result = rows.map((r) => ({
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
  }));

  return NextResponse.json({ indices: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "login necessário" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      universe?: Universe;
      filters?: IndexFilters;
      ranking?: IndexRanking;
      topN?: number;
      isPublic?: boolean;
      createdAt?: number;
    };

    if (!body.name || !body.universe || !body.ranking || !body.topN) {
      return NextResponse.json(
        { error: "name, universe, ranking, topN obrigatórios" },
        { status: 400 },
      );
    }

    const slug =
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);

    const db = getDb();
    const createdAt = body.createdAt ?? Math.floor(Date.now() / 1000);
    const r = db
      .prepare(
        `INSERT INTO indices (owner_id, slug, name, description, universe, filters, ranking, top_n, is_public, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.userId,
        slug,
        body.name.trim(),
        (body.description ?? "").trim(),
        body.universe,
        JSON.stringify(body.filters ?? {}),
        body.ranking,
        body.topN,
        body.isPublic ? 1 : 0,
        createdAt,
        Math.floor(Date.now() / 1000),
      );

    return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid), slug });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
