/**
 * Supabase Postgres database helpers.
 *
 * Two paths:
 *  - SELECT queries: use the `exec_sql` RPC function (bypasses RLS, returns rows)
 *  - INSERT/UPDATE/DELETE: use Supabase REST API directly via from(table).insert/update/delete
 *
 * Run migrations in supabase/migrations/ before using.
 * Usage: only in server-side code (API routes, server components).
 */

import { supabaseAdmin } from "./supabase";

export type Row = Record<string, unknown>;

/**
 * Run a SELECT query and return rows.
 */
export async function query<T = Row>(
  sql: string,
  args: unknown[] = [],
): Promise<T[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc("exec_sql", {
    sql_text: sql,
    sql_args: args,
  });
  if (error) throw new Error(`query failed: ${error.message}`);
  if (data && typeof data === "object" && "error" in data && !Array.isArray(data)) {
    throw new Error(`query failed: ${(data as { error: string }).error}`);
  }
  if (!Array.isArray(data)) return [];
  return data as unknown as T[];
}

/**
 * Run a SELECT and return the first row (or null).
 */
export async function queryOne<T = Row>(
  sql: string,
  args: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

type ExecResult = {
  lastInsertRowid: number | string | null;
  changes: number;
  rows?: Row[];
};

/**
 * Run an INSERT. Returns the inserted row (if RETURNING) or just lastInsertRowid.
 * Uses the Supabase REST API directly (exec_sql RPC doesn't support DML).
 */
export async function insert(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const sb = supabaseAdmin();
  const rows = Array.isArray(data) ? data : [data];
  const { data: result, error } = await sb.from(table).insert(rows as never).select();
  if (error) throw new Error(`insert failed: ${error.message}`);
  return (result ?? []) as Record<string, unknown>[];
}

/**
 * Run an UPDATE. Returns the updated rows (if RETURNING supported).
 */
export async function update(
  table: string,
  set: Record<string, unknown>,
  match: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const sb = supabaseAdmin();
  let q = sb.from(table).update(set as never);
  for (const [key, value] of Object.entries(match)) {
    q = q.eq(key, value);
  }
  const { data, error } = await q.select();
  if (error) throw new Error(`update failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

/**
 * Run a DELETE. Returns the count of deleted rows.
 */
export async function remove(
  table: string,
  match: Record<string, unknown>,
): Promise<number> {
  const sb = supabaseAdmin();
  let q = sb.from(table).delete();
  for (const [key, value] of Object.entries(match)) {
    q = q.eq(key, value);
  }
  const { data, error } = await q.select();
  if (error) throw new Error(`delete failed: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

/**
 * Legacy exec() — for backwards compat.
 * Splits SQL type: SELECT goes via exec_sql RPC, INSERT goes via REST API.
 */
export async function exec(
  sql: string,
  args: unknown[] = [],
): Promise<ExecResult> {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith("SELECT")) {
    const rows = await query(sql, args);
    return { lastInsertRowid: null, changes: rows.length, rows };
  }
  // For INSERT/UPDATE/DELETE, use REST API
  // (this is a fallback — code should prefer insert/update/remove directly)
  throw new Error(
    "exec() for DML not supported via exec_sql RPC. Use insert/update/remove() instead.",
  );
}

/**
 * Run multiple statements sequentially (legacy).
 */
export async function batch(
  statements: Array<{ sql: string; args?: unknown[] }>,
): Promise<void> {
  for (const s of statements) {
    await exec(s.sql, s.args ?? []);
  }
}