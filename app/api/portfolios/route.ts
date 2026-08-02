import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initial_value: number;
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
        `SELECT p.id, p.slug, p.name, p.description, p.initial_value, p.is_public, p.created_at, p.updated_at, u.username
         FROM portfolios p LEFT JOIN users u ON p.owner_id = u.id
         WHERE p.owner_id = ?
         ORDER BY p.created_at DESC`,
      )
      .all(user.userId) as Row[];
  } else {
    rows = db
      .prepare(
        `SELECT p.id, p.slug, p.name, p.description, p.initial_value, p.is_public, p.created_at, p.updated_at, u.username
         FROM portfolios p LEFT JOIN users u ON p.owner_id = u.id
         WHERE p.is_public = 1
         ORDER BY p.created_at DESC`,
      )
      .all() as Row[];
  }

  // Attach constituents summary
  const stmt = db.prepare(
    "SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = ?",
  );
  const result = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    initialValue: r.initial_value,
    isPublic: r.is_public === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    owner: r.username,
    constituents: stmt.all(r.id) as { symbol: string; weight: number }[],
  }));

  return NextResponse.json({ portfolios: result });
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
      isPublic?: boolean;
      initialValue?: number;
      holdings?: { symbol: string; weight: number }[];
      createdAt?: number; // optional backdate (unix seconds)
    };

    if (!body.name || !body.holdings || body.holdings.length === 0) {
      return NextResponse.json(
        { error: "name e holdings (>=1) obrigatórios" },
        { status: 400 },
      );
    }

    // Validate weights sum
    const totalW = body.holdings.reduce((a, h) => a + (h.weight ?? 0), 0);
    if (totalW < 0.99 || totalW > 1.01) {
      return NextResponse.json(
        { error: `weights devem somar 1.0 (atual: ${totalW.toFixed(2)})` },
        { status: 400 },
      );
    }

    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);

    const db = getDb();
    const createdAt = body.createdAt ?? Math.floor(Date.now() / 1000);
    const insert = db.transaction(() => {
      const r = db
        .prepare(
          `INSERT INTO portfolios (owner_id, slug, name, description, initial_value, is_public, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          user.userId,
          slug,
          (body.name ?? "").trim(),
          (body.description ?? "").trim(),
          body.initialValue ?? 10000,
          body.isPublic ? 1 : 0,
          createdAt,
          Math.floor(Date.now() / 1000),
        );
      const id = Number(r.lastInsertRowid);
      const insertHold = db.prepare(
        "INSERT INTO portfolio_holdings (portfolio_id, symbol, weight) VALUES (?, ?, ?)",
      );
      for (const h of (body.holdings ?? [])) {
        insertHold.run(id, h.symbol.toUpperCase(), h.weight);
      }
      return id;
    });

    const id = insert();
    return NextResponse.json({ ok: true, id, slug });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
