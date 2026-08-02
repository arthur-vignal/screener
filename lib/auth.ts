/**
 * Auth: signup/login with username + password.
 * - Passwords hashed with bcrypt
 * - Session stored in DB + JWT in HttpOnly cookie
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getDb } from "./db";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production";
const COOKIE_NAME = "screener_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type Session = {
  userId: number;
  username: string;
};

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export async function signup(opts: {
  username: string;
  email: string;
  password: string;
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
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

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username, email);
  if (existing) {
    return { ok: false, error: "username ou email já cadastrado" };
  }

  const hash = await bcrypt.hash(opts.password, 10);
  const result = db
    .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
    .run(username, email, hash);
  const userId = Number(result.lastInsertRowid);

  return { ok: true, ...(await createSession(userId)) };
}

export async function login(opts: {
  username: string;
  password: string;
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const username = opts.username.trim().toLowerCase();
  const db = getDb();
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE username = ? OR email = ?")
    .get(username, username) as { id: number; password_hash: string } | undefined;
  if (!user) return { ok: false, error: "usuário ou senha inválidos" };

  const ok = await bcrypt.compare(opts.password, user.password_hash);
  if (!ok) return { ok: false, error: "usuário ou senha inválidos" };

  return { ok: true, ...(await createSession(user.id)) };
}

async function createSession(userId: number): Promise<{ sessionId: string }> {
  const sessionId = newSessionId();
  const db = getDb();
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    sessionId,
    userId,
    expiresAt,
  );

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
  return { sessionId };
}

export async function logout() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET) as { sid: string };
      const db = getDb();
      db.prepare("DELETE FROM sessions WHERE id = ?").run(decoded.sid);
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
    const decoded = jwt.verify(token, SECRET) as { sid: string; uid: number };
    const db = getDb();
    const session = db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .get(decoded.sid) as { user_id: number; expires_at: number } | undefined;
    if (!session) return null;
    if (session.expires_at < Math.floor(Date.now() / 1000)) return null;
    const user = db
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .get(session.user_id) as { id: number; username: string } | undefined;
    if (!user) return null;
    return { userId: user.id, username: user.username };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
