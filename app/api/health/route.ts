/**
 * /api/health — healthcheck + commit SHA info.
 *
 * Railway injeta `RAILWAY_GIT_COMMIT_SHA` automaticamente em produção.
 * Em dev local, retorna "dev" — útil pra confirmar qual commit tá
 * realmente rodando (especialmente quando tu suspeita de deploy stale).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sha =
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    "dev";
  const shortSha = sha.length >= 7 ? sha.slice(0, 7) : sha;
  return NextResponse.json({
    ok: true,
    sha: shortSha,
    env: process.env.NODE_ENV ?? "unknown",
    now: new Date().toISOString(),
  });
}