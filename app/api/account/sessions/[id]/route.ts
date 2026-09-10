/**
 * /api/account/sessions/[id] — DELETE revoga sessão específica.
 *
 * Auth: user só pode revogar as próprias sessões. Se tentar revogar
 * sessão de outro user → 404 (não revela existência).
 *
 * Edge case: revogar a sessão atual = logout. Cookie continua no
 * browser mas JWT não valida mais (getCurrentUser retorna null).
 * Cliente deve redirecionar pra /login no próximo request.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { remove } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: sidToRevoke } = await params;
  if (!sidToRevoke || sidToRevoke.length > 64) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  // remove() usa REST API, não expõe se outra sessão existe.
  const deleted = await remove("sessions", {
    id: sidToRevoke,
    user_id: user.userId,
  });

  if (deleted === 0) {
    return NextResponse.json(
      { error: "sessão não encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, revoked: deleted });
}
