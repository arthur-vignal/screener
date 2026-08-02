import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, exec } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  owner_id: string | null;
  slug: string;
  name: string;
  description: string;
  universe: string;
  filters: string;
  ranking: string;
  top_n: number;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  username: string | null;
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const scope = req.nextUrl.searchParams.get("scope") ?? "public";

  let rows: Row[];
  if (user && scope === "mine") {
    rows = await query<Row>(
      `SELECT i.id, i.owner_id, i.slug, i.name, i.description, i.universe, i.filters::text, i.ranking, i.top_n, i.is_public, i.created_at, i.updated_at, pr.username
       FROM indices i LEFT JOIN profiles pr ON i.owner_id = pr.id
       WHERE i.owner_id = $1
       ORDER BY i.created_at DESC`,
      [user.userId],
    );
  } else {
    rows = await query<Row>(
      `SELECT i.id, i.owner_id, i.slug, i.name, i.description, i.universe, i.filters::text, i.ranking, i.top_n, i.is_public, i.created_at, i.updated_at, pr.username
       FROM indices i LEFT JOIN profiles pr ON i.owner_id = pr.id
       WHERE i.is_public = TRUE
       ORDER BY i.created_at DESC`,
    );
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
    isPublic: r.is_public,
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
      universe?: string;
      filters?: Record<string, unknown>;
      ranking?: string;
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
        .slice(0, 40) +
      "-" +
      Math.random().toString(36).slice(2, 6);

    const createdAt = body.createdAt ?? Math.floor(Date.now() / 1000);
    const r = await exec(
      `INSERT INTO indices (owner_id, slug, name, description, universe, filters, ranking, top_n, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11) RETURNING id`,
      [
        user.userId,
        slug,
        body.name.trim(),
        (body.description ?? "").trim(),
        body.universe,
        JSON.stringify(body.filters ?? {}),
        body.ranking,
        body.topN,
        body.isPublic ?? false,
        createdAt,
        Math.floor(Date.now() / 1000),
      ],
    );

    return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid), slug });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
