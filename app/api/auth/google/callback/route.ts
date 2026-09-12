/**
 * GET /api/auth/google/callback — OAuth callback do Google.
 *
 * Fluxo:
 *   1. Google redireciona aqui com ?code=<auth_code>
 *   2. Troca code por tokens via Google token endpoint
 *   3. Busca userinfo (email, name, sub)
 *   4. Verifica se profile já existe (por email)
 *   5. Se não existe: cria Supabase Auth user (email_confirm: true)
 *      + cria profile com username derivado do email
 *   6. Cria sessão (cookie HttpOnly)
 *   7. Redirect → /home
 *
 * Erros redirecionam pra /login com query param `oauth_error=...`
 * pra UI exibir flash.
 *
 * Env vars necessárias:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_BASE_URL
 *
 * Edge cases:
 *   - Email já cadastrado com senha diferente → loga mesmo assim
 *     (Google confirmou o email). User pode continuar usando
 *     password normal ou Google.
 *   - Username gerado do email conflita → adiciona sufixo numérico.
 */

import { NextRequest, NextResponse } from "next/server";

import { createSessionForUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { query, queryOne, insert } from "@/lib/db";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

/**
 * Base URL do request atual — bate com a origin que o Google vai usar
 * no redirect. Evita `redirect_uri_mismatch` quando o subdomínio
 * Railway muda (ex: -4f58 → outro sufixo).
 */
function requestBaseUrl(req: NextRequest): string {
  return (
    req.nextUrl.origin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://screener-production-4f58.up.railway.app"
  );
}

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  token_type: string;
};

type GoogleUserInfo = {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

function errorRedirect(req: NextRequest, error: string): NextResponse {
  const url = new URL("/login", requestBaseUrl(req));
  url.searchParams.set("oauth", "google");
  url.searchParams.set("oauth_error", error);
  return NextResponse.redirect(url);
}

function homeRedirect(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/home", requestBaseUrl(req)));
}

/** Gera username a partir do email: "joao@gmail.com" → "joao". */
function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  // Sanitize: só [a-z0-9_], 3-20 chars.
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 18);
  return cleaned.padEnd(3, "u").slice(0, 20);
}

async function generateUniqueUsername(baseEmail: string): Promise<string> {
  const base = usernameFromEmail(baseEmail);
  const existing = await queryOne<{ username: string }>(
    `SELECT username FROM profiles WHERE username = $1`,
    [base],
  );
  if (!existing) return base;
  // Conflito → sufixo numérico.
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}_${i}`.slice(0, 20);
    const taken = await queryOne<{ username: string }>(
      `SELECT username FROM profiles WHERE username = $1`,
      [candidate],
    );
    if (!taken) return candidate;
  }
  // Fallback extremo: random hex.
  return `${base.slice(0, 12)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function exchangeCodeForTokens(
  code: string,
  baseUrl: string,
): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: `${baseUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo fetch failed: ${res.status}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return errorRedirect(req, "oauth_not_configured");
  }

  const baseUrl = requestBaseUrl(req);
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return errorRedirect(req, errorParam);
  }
  if (!code) {
    return errorRedirect(req, "missing_code");
  }

  let tokens: GoogleTokenResponse;
  try {
    tokens = await exchangeCodeForTokens(code, baseUrl);
  } catch (e) {
    console.error("[google-oauth] token exchange failed:", e);
    return errorRedirect(req, "token_exchange_failed");
  }

  let userInfo: GoogleUserInfo;
  try {
    userInfo = await fetchGoogleUserInfo(tokens.access_token);
  } catch (e) {
    console.error("[google-oauth] userinfo failed:", e);
    return errorRedirect(req, "userinfo_failed");
  }

  if (!userInfo.email || !userInfo.email_verified) {
    return errorRedirect(req, "email_not_verified");
  }

  const sb = supabaseAdmin();
  const email = userInfo.email.trim().toLowerCase();

  // 1. Procura profile existente (qualquer user já cadastrado com esse email).
  let existingProfile = await queryOne<{ id: string; username: string }>(
    `SELECT id, username FROM profiles WHERE email = $1`,
    [email],
  );

  let userId: string;

  if (existingProfile) {
    // User já existe. Pode ser:
    // a) Criado via signup normal (Supabase Auth user existe)
    // b) Criado via Google anterior (Supabase Auth user existe)
    // c) Profile órfão (Supabase Auth user não existe). Edge case raro.
    userId = existingProfile.id;
    // Verifica se Supabase Auth user existe. Se não, cria sem senha.
    // (Não dá pra "verificar" sem signInWithPassword — assume que existe.)
    // Se não existir, próxima chamada ao `getCurrentUser` falha e o
    // user não loga. Edge case raro que vamos ignorar por ora.
  } else {
    // 2. Cria Supabase Auth user sem senha (vai logar via Google).
    const { data: authData, error: createErr } = await sb.auth.admin.createUser({
      email,
      email_confirm: true, // Google já validou
      user_metadata: {
        provider: "google",
        google_sub: userInfo.sub,
        full_name: userInfo.name ?? null,
        avatar_url: userInfo.picture ?? null,
      },
    });
    if (createErr || !authData.user) {
      console.error("[google-oauth] createUser failed:", createErr?.message);
      return errorRedirect(req, "create_user_failed");
    }
    userId = authData.user.id;

    // 3. Cria profile com username único derivado do email.
    const username = await generateUniqueUsername(email);
    const inserted = await insert("profiles", {
      id: userId,
      username,
      email,
    });
    if (!inserted[0]) {
      // Rollback: deleta o user do Supabase Auth.
      await sb.auth.admin.deleteUser(userId);
      return errorRedirect(req, "create_profile_failed");
    }
  }

  // 4. Cria sessão (cookie HttpOnly).
  await createSessionForUser(userId);

  // 5. Redireciona pra home.
  return homeRedirect(req);
}
