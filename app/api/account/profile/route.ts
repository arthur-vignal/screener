/**
 * /api/account/profile — GET/PATCH do perfil do user logado.
 *
 * GET → retorna { username, email } do profile do user.
 *
 * PATCH body: { username?, email? }
 *   - Pelo menos 1 campo.
 *   - username: 3-20 chars, [a-z0-9_]. Não pode conflitar com outro user.
 *   - email: formato válido.
 *   - Email change NÃO dispara verification email — Supabase Auth email
 *     é separado do nosso profile.email. Se quiser sync com Supabase,
 *     usar supabaseAdmin.auth.admin.updateUserById (não implementado aqui
 *     pra evitar escopo). Documentado como TODO.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { query, queryOne, update } from "@/lib/db";

export const dynamic = "force-dynamic";

type ProfileResponse = {
  username: string;
  email: string;
  createdAt: number | null;
};

export async function GET(): Promise<NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const created = await queryOne<{ created_at: string }>(
    `SELECT created_at::text AS created_at FROM profiles WHERE id = $1`,
    [profile.userId],
  );
  let createdAt: number | null = null;
  if (created?.created_at) {
    const ts = Date.parse(created.created_at);
    if (Number.isFinite(ts)) createdAt = Math.floor(ts / 1000);
  }

  return NextResponse.json({
    username: profile.username,
    email: profile.email,
    createdAt,
  } satisfies ProfileResponse);
}

export async function PATCH(
  req: NextRequest,
): Promise<NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    email?: string;
  };

  const updates: Record<string, string> = {};
  let newUsername: string | null = null;
  let newEmail: string | null = null;

  if (body.username !== undefined && body.username !== profile.username) {
    const u = body.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      return NextResponse.json(
        { error: "Username deve ter 3-20 chars (a-z, 0-9, _)" },
        { status: 400 },
      );
    }
    // Conflito?
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM profiles WHERE username = $1 AND id <> $2`,
      [u, profile.userId],
    );
    if (existing) {
      return NextResponse.json(
        { error: "Username já está em uso" },
        { status: 409 },
      );
    }
    updates.username = u;
    newUsername = u;
  }

  if (body.email !== undefined && body.email !== profile.email) {
    const e = body.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 },
      );
    }
    // Conflito?
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM profiles WHERE email = $1 AND id <> $2`,
      [e, profile.userId],
    );
    if (existing) {
      return NextResponse.json(
        { error: "Email já está em uso" },
        { status: 409 },
      );
    }
    updates.email = e;
    newEmail = e;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      username: profile.username,
      email: profile.email,
      changed: false,
    });
  }

  try {
    await update("profiles", updates, { id: profile.userId });
  } catch (e) {
    return NextResponse.json(
      { error: `Falha ao atualizar: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    username: newUsername ?? profile.username,
    email: newEmail ?? profile.email,
    changed: true,
  });
}
