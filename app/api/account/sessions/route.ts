/**
 * /api/account/sessions — GET lista sessões ativas do user logado.
 *
 * Por enquanto retorna um único item (a sessão atual) — não temos
 * infra pra múltiplas sessões. Endpoint fica pronto pra extensão
 * futura (multiple devices).
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  created_at: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const currentSid = parseSidFromCookie(cookieHeader);

  const rows = await query<SessionRow>(
    `SELECT id, created_at::text AS created_at
     FROM sessions
     WHERE user_id = $1 AND expires_at > $2
     ORDER BY created_at DESC`,
    [user.userId, Math.floor(Date.now() / 1000)],
  );

  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      isCurrent: r.id === currentSid,
      createdAt: r.created_at,
      userAgent: req.headers.get("user-agent"),
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        null,
    })),
  });
}

function parseSidFromCookie(cookieHeader: string): string | null {
  // Cookie value é JWT no formato `header.payload.signature`. O `sid`
  // está no payload (jsonwebtoken default). Decodificamos só pra ler.
  const m = /screener_session=([^;]+)/.exec(cookieHeader);
  if (!m) return null;
  const parts = m[1].split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8"),
    );
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}
