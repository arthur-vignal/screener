/**
 * Auth: signup/login with username + password (Supabase).
 *
 * Strategy:
 *  - Use Supabase Auth for the underlying user identity (email + password)
 *  - Store our own `profiles` table (linked to auth.users.id) for username + extra fields
 *  - Issue our own JWT in HttpOnly cookie so the rest of the app doesn't need to know about Supabase
 *
 * Tables required:
 *  - profiles (id UUID PK references auth.users, username UNIQUE, created_at)
 */

import { supabaseAdmin } from "./supabase";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production";
const COOKIE_NAME = "screener_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type Session = {
  userId: string;
  username: string;
};

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export async function signup(opts: {
  username: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const username = opts.username.trim().toLowerCase();
  const email = opts.email.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { ok: false, error: "username deve ter 3-20 chars (a-z, 0-9, _)" };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "email inválido" };
  }
  if (opts.password.length < 8) {
    return { ok: false, error: "senha deve ter pelo menos 8 caracteres" };
  }

  const sb = supabaseAdmin();

  // Check username uniqueness
  const { data: existing } = await sb
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "username já cadastrado" };
  }

  // Create user via Supabase Auth (handles password hashing with bcrypt)
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email,
    password: opts.password,
    email_confirm: true, // skip email verification (set false if you want magic link)
  });
  if (authErr || !authData.user) {
    return { ok: false, error: authErr?.message ?? "erro ao criar usuário" };
  }

  const userId = authData.user.id;

  // Create profile (username + display info)
  const { error: profErr } = await sb.from("profiles").insert({
    id: userId,
    username,
    email,
  });
  if (profErr) {
    // Rollback: delete auth user
    await sb.auth.admin.deleteUser(userId);
    return { ok: false, error: profErr.message };
  }

  await createSession(userId);
  return { ok: true };
}

export async function login(opts: {
  username: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const username = opts.username.trim().toLowerCase();
  const sb = supabaseAdmin();

  // Find user by username (via profile) or email
  const { data: profile } = await sb
    .from("profiles")
    .select("id, email, username")
    .or(`username.eq.${username},email.eq.${username}`)
    .maybeSingle();

  if (!profile) {
    return { ok: false, error: "usuário ou senha inválidos" };
  }

  // Verify password via Supabase Auth (signInWithPassword uses anon key normally,
  // but admin API can also generate a session — here we use a workaround)
  const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
    email: profile.email,
    password: opts.password,
  });
  if (authErr || !authData.user) {
    return { ok: false, error: "usuário ou senha inválidos" };
  }

  await createSession(authData.user.id);
  return { ok: true };
}

async function createSession(userId: string): Promise<void> {
  const sessionId = newSessionId();
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const sb = supabaseAdmin();

  // Persist session in DB
  await sb.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  });

  const token = jwt.sign({ sid: sessionId, uid: userId }, SECRET, {
    expiresIn: "30d",
  });
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function logout(): Promise<void> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET) as { sid: string };
      const sb = supabaseAdmin();
      await sb.from("sessions").delete().eq("id", decoded.sid);
    } catch {
      // ignore
    }
  }
  c.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<Session | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET) as { sid: string };
    const sb = supabaseAdmin();
    const { data: session } = await sb
      .from("sessions")
      .select("user_id, expires_at")
      .eq("id", decoded.sid)
      .maybeSingle();
    if (!session) return null;
    if (session.expires_at < Math.floor(Date.now() / 1000)) return null;
    const { data: profile } = await sb
      .from("profiles")
      .select("username")
      .eq("id", session.user_id)
      .maybeSingle();
    if (!profile) return null;
    return { userId: session.user_id, username: profile.username };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
