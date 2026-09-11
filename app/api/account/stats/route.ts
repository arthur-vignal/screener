/**
 * /api/account/stats — estatísticas de uso do user logado.
 *
 * Retorna contagens: portfolios, holdings, indices, watchlist, idade.
 * Alimenta o card destaque da página /account (substitui o "MONTHLY PLAN"
 * do Fey por algo útil: estatísticas reais do uso).
 *
 * Query() é SELECT-only via RPC exec_sql. Cada contagem é uma query
 * separada pra evitar GROUP BY complexo. São 4 queries leves em uma
 * tabela indexada — custo negligível.
 */

import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Cada query tem try/catch individual pra que uma falha (ex: tabela
  // não existe) não zere o resto. Stats é nice-to-have, não bloqueia
  // o user de usar a página.
  async function safeCount(
    sql: string,
    args: unknown[],
  ): Promise<number> {
    try {
      const r = await queryOne<{ count: string }>(sql, args);
      return Number(r?.count ?? 0);
    } catch {
      return 0;
    }
  }

  async function safeCreatedAt(userId: string): Promise<string | null> {
    try {
      const r = await queryOne<{ created_at: string }>(
        `SELECT created_at::text AS created_at FROM profiles WHERE id = $1`,
        [userId],
      );
      return r?.created_at ?? null;
    } catch {
      return null;
    }
  }

  const [portfolioCount, holdingCount, indicesCount, watchlistCount, createdAt] =
    await Promise.all([
      safeCount(
        `SELECT COUNT(*)::text AS count FROM portfolios WHERE owner_id = $1`,
        [profile.userId],
      ),
      safeCount(
        `SELECT COUNT(*)::text AS count FROM portfolio_holdings ph
         JOIN portfolios p ON p.id = ph.portfolio_id
         WHERE p.owner_id = $1`,
        [profile.userId],
      ),
      safeCount(
        `SELECT COUNT(*)::text AS count FROM indices WHERE owner_id = $1`,
        [profile.userId],
      ),
      safeCount(
        `SELECT COUNT(*)::text AS count FROM watchlist WHERE user_id = $1`,
        [profile.userId],
      ),
      safeCreatedAt(profile.userId),
    ]);

  const accountAgeDays = createdAt
    ? Math.max(
        0,
        Math.floor((Date.now() - Date.parse(createdAt)) / 86_400_000),
      )
    : 0;

  return NextResponse.json({
    portfolioCount,
    holdingCount,
    indicesCount,
    watchlistCount,
    accountAgeDays,
  });
}
