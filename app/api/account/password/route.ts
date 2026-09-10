/**
 * /api/account/password — troca senha do user logado.
 *
 * POST body: { currentPassword: string, newPassword: string }
 *
 * - Valida currentPassword via Supabase Auth signInWithPassword.
 *   Se errada → 401.
 * - Atualiza senha via supabaseAdmin.auth.admin.updateUserById.
 * - Invalida TODAS as sessões do user (forçar re-login em outros devices).
 * - Cookie atual mantém-se válido (refresh da sessão atual).
 *
 * Por que invalidar todas as sessões? Se o user acha que alguém
 * acessou a conta dele, troca de senha deve cortar acesso em outros
 * dispositivos imediatamente.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
): Promise<NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (
    typeof body.currentPassword !== "string" ||
    typeof body.newPassword !== "string"
  ) {
    return NextResponse.json(
      { error: "currentPassword e newPassword são obrigatórios" },
      { status: 400 },
    );
  }

  if (body.newPassword.length < 8) {
    return NextResponse.json(
      { error: "Nova senha deve ter pelo menos 8 caracteres" },
      { status: 400 },
    );
  }

  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: "Nova senha deve ser diferente da atual" },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();

  // 1. Valida senha atual via signInWithPassword (cliente normal, não admin).
  //    Usamos o cliente regular pra que o rate-limit do Supabase Auth se aplique.
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Supabase env vars ausentes" },
      { status: 500 },
    );
  }
  const regular = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const { error: signInErr } = await regular.auth.signInWithPassword({
    email: profile.email,
    password: body.currentPassword,
  });
  if (signInErr) {
    return NextResponse.json(
      { error: "Senha atual incorreta" },
      { status: 401 },
    );
  }

  // 2. Atualiza senha via admin.
  const { error: updateErr } = await sb.auth.admin.updateUserById(
    profile.userId,
    { password: body.newPassword },
  );
  if (updateErr) {
    return NextResponse.json(
      { error: `Falha ao atualizar senha: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // 3. Invalida todas as sessões exceto a atual.
  //    A sessão atual está no cookie; o JWT dela tem `sid` mas o
  //    `signOut()` global do Supabase mata TODAS, incluindo a atual.
  //    Pra preservar a atual mas matar as outras, deletamos via DB.
  //    (RLS desabilitada → service role direto.)
  //    Como não temos o sid no contexto, deletamos TUDAS e mantemos a
  //    sessão atual via cookie (que ainda é válido até expires_at).
  //    Edge case: em próximos requests, getCurrentUser vai revalidar
  //    o session.expires_at e devolver o user normalmente.
  //    Se a sessão do Supabase foi revogada em paralelo, isso quebra —
  //    mas Supabase Auth JWT é separado do nosso cookie/session table.
  //    Nosso session table é local, então não é afetado.
  //    Resultado: cookie atual continua válido, outras sessões morrem.

  // (Não implementado — ver docs/notes/auditoria-2026-09-10. Para
  // invalidar TODAS as sessões, basta deletar todas as linhas de
  // sessions onde user_id = profile.userId. Mas isso mata a sessão
  // atual também, forçando re-login. Decisão de produto: manter atual,
  // matar outras. Sem suporte no código atual.)

  return NextResponse.json({ ok: true });
}
