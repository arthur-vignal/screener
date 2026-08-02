/**
 * Supabase client (Postgres + Auth).
 *
 * Two clients:
 *  - supabaseAdmin: service role key, bypasses RLS. Use ONLY in server-side code
 *    (API routes, server components). NEVER expose to client.
 *  - supabase: anon key, respects RLS. Safe to use on client.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let _admin: SupabaseClient | null = null;
let _public: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  if (!URL || !SERVICE) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  _admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export function supabasePublic(): SupabaseClient {
  if (_public) return _public;
  if (!URL || !ANON) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  _public = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _public;
}

export const SUPABASE_URL = URL;
export const SUPABASE_ANON_KEY = ANON;
