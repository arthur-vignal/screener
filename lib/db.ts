/**
 * Supabase Postgres database helpers.
 *
 * Uses a stored function `exec_sql(text, jsonb)` defined in the migration.
 * Run that migration in Supabase SQL Editor before using this.
 *
 * Usage: only in server-side code (API routes, server components).
 */

import { supabaseAdmin } from "./supabase";

export type Row = Record<string, unknown>;

/**
 * Run SQL and return rows as array of objects.
 */
export async function query<T = Row>(
  sql: string,
  args: unknown[] = [],
): Promise<T[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc("exec_sql", {
    sql_text: sql,
    sql_args: JSON.stringify(args),
  });
  if (error) throw new Error(`query failed: ${error.message}`);
  if (data && typeof data === "object" && "error" in data) {
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
 * For RETURNING, use `query` instead (exec_sql supports it).
 */
export async function exec(
  sql: string,
  args: unknown[] = [],
): Promise<{ lastInsertRowid: number | string | null; changes: number }> {
  // Insert statements return rows when using RETURNING
  if (/^\s*INSERT\s+/i.test(sql) && /RETURNING/i.test(sql)) {
    const rows = await query(sql, args);
    const lastRow = rows[0];
    return {
      lastInsertRowid: (lastRow?.id as number | string) ?? null,
      changes: rows.length,
    };
  }
  // Otherwise just run (exec_sql still returns array)
  const sb = supabaseAdmin();
  const { data } = await sb.rpc("exec_sql", {
    sql_text: sql,
    sql_args: JSON.stringify(args),
  });
  return {
    lastInsertRowid: null,
    changes: Array.isArray(data) ? data.length : 0,
  };
}

/**
 * Run multiple statements (sequential, not atomic).
 * For atomicity, create a single SQL function.
 */
export async function batch(
  statements: Array<{ sql: string; args?: unknown[] }>,
): Promise<void> {
  for (const s of statements) {
    await exec(s.sql, s.args ?? []);
  }
}
