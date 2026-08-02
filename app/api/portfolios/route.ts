import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, exec, batch } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
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

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const scope = req.nextUrl.searchParams.get("scope") ?? "public";

  let rows: Row[];
  if (user && scope === "mine") {
    rows = await query<Row>(
      `SELECT p.id, p.slug, p.name, p.description, p.initial_value, p.is_public, p.created_at, p.updated_at, pr.username, ph.symbol, ph.weight
       FROM portfolios p
       LEFT JOIN profiles pr ON p.owner_id = pr.id
       LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
       WHERE p.owner_id = $1
       ORDER BY p.created_at DESC`,
      [user.userId],
    );
  } else {
    rows = await query<Row>(
      `SELECT p.id, p.slug, p.name, p.description, p.initial_value, p.is_public, p.created_at, p.updated_at, pr.username, ph.symbol, ph.weight
       FROM portfolios p
       LEFT JOIN profiles pr ON p.owner_id = pr.id
       LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
       WHERE p.is_public = TRUE
       ORDER BY p.created_at DESC`,
    );
  }

  const byPortfolio = new Map<number, typeof rows>();
  for (const r of rows) {
    if (!byPortfolio.has(r.id)) byPortfolio.set(r.id, []);
    byPortfolio.get(r.id)!.push(r);
  }

  const result = Array.from(byPortfolio.entries()).map(([id, ps]) => ({
    id,
    slug: ps[0].slug,
    name: ps[0].name,
    description: ps[0].description,
    initialValue: ps[0].initial_value,
    isPublic: ps[0].is_public,
    createdAt: ps[0].created_at,
    updatedAt: ps[0].updated_at,
    owner: ps[0].username,
    constituents: ps
      .filter((p) => p.symbol && p.weight != null)
      .map((p) => ({ symbol: p.symbol!, weight: p.weight! })),
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
      createdAt?: number;
    };

    if (!body.name || !body.holdings || body.holdings.length === 0) {
      return NextResponse.json(
        { error: "name e holdings (>=1) obrigatórios" },
        { status: 400 },
      );
    }

    const totalW = body.holdings.reduce((a, h) => a + (h.weight ?? 0), 0);
    if (totalW < 0.99 || totalW > 1.01) {
      return NextResponse.json(
        { error: `weights devem somar 1.0 (atual: ${totalW.toFixed(2)})` },
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

    const result = await exec(
      `INSERT INTO portfolios (owner_id, slug, name, description, initial_value, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        user.userId,
        slug,
        body.name.trim(),
        (body.description ?? "").trim(),
        body.initialValue ?? 10000,
        body.isPublic ?? false,
        createdAt,
        Math.floor(Date.now() / 1000),
      ],
    );
    const id = Number(result.lastInsertRowid);

    const statements: Array<{ sql: string; args?: unknown[] }> = [];
    for (const h of body.holdings!) {
      statements.push({
        sql: "INSERT INTO portfolio_holdings (portfolio_id, symbol, weight) VALUES ($1, $2, $3)",
        args: [id, h.symbol.toUpperCase(), h.weight],
      });
    }
    if (statements.length > 0) {
      await batch(statements);
    }

    return NextResponse.json({ ok: true, id, slug });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
