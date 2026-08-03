/**
 * Supabase Postgres database helpers.
 *
 * Uses @supabase/supabase-js client with the `exec_sql` RPC function.
 * Run the migrations in supabase/migrations/ before using.
 *
 * Usage: only in server-side code (API routes, server components).
 */

import { supabaseAdmin } from "./supabase";

export type Row = Record<string, unknown>;

/**
 * Run SQL and return rows as array of objects.
 * Uses the `exec_sql` RPC function defined in the migration.
 */
export async function query<T = Row>(
  sql: string,
  args: unknown[] = [],
): Promise<T[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc("exec_sql", {
    sql_text: sql,
    sql_args: args, // pass as array, NOT as JSON string
  });
  if (error) throw new Error(`query failed: ${error.message}`);
  if (data && typeof data === "object" && "error" in data && !Array.isArray(data)) {
    throw new Error(`query failed: ${(data as { error: string }).error}`);
  }
  if (!Array.isArray(data)) return [];
  return data as unknown as T[];
}

/**
 * Run SQL and return the first row (or null).
 */
export async function queryOne<T = Row>(
  sql: string,
  args: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

/**
 * Run an INSERT/UPDATE/DELETE.
 * Returns rows + lastInsertRowid.
 */
export async function exec(
  sql: string,
  args: unknown[] = [],
): Promise<{ lastInsertRowid: number | string | null; changes: number; rows?: Row[] }> {
  const rows = await query(sql, args);
  const lastRow = rows[rows.length - 1];
  return {
    lastInsertRowid:
      (lastRow?.id as number | string | undefined) ?? null,
    changes: rows.length,
    rows,
  };
}

/**
 * Run multiple statements sequentially.
 * Not atomic — wrap in a Postgres function for atomicity.
 */
export async function batch(
  statements: Array<{ sql: string; args?: unknown[] }>,
): Promise<void> {
  for (const s of statements) {
    await exec(s.sql, s.args ?? []);
  }
}