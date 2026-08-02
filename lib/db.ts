/**
 * SQLite database setup using @libsql/client (works in any environment,
 * including Railway where better-sqlite3 fails to compile).
 *
 * Storage:
 *  - Default local file: ./data/screener.db (persistent on disk)
 *  - Or remote Turso database if TURSO_DATABASE_URL env var set
 *
 * Tables:
 *  - users, sessions, indices, portfolios, portfolio_holdings, portfolio_history
 */

import { createClient, type Client, type InValue } from "@libsql/client";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "screener.db");

let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function getClient(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    _client = createClient({ url, authToken });
  } else {
    _client = createClient({ url: `file:${DB_PATH}` });
  }
  _ready = initSchema(_client);
  return _client;
}

async function initSchema(client: Client) {
  try {
    await client.batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at INTEGER NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
        `CREATE TABLE IF NOT EXISTS indices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          universe TEXT NOT NULL DEFAULT 'sp500',
          filters TEXT NOT NULL DEFAULT '{}',
          ranking TEXT NOT NULL DEFAULT 'momentum-12-1',
          top_n INTEGER NOT NULL DEFAULT 30,
          is_public INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        )`,
        `CREATE INDEX IF NOT EXISTS idx_indices_owner ON indices(owner_id)`,
        `CREATE INDEX IF NOT EXISTS idx_indices_public ON indices(is_public)`,
        `CREATE TABLE IF NOT EXISTS portfolios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          initial_value REAL NOT NULL DEFAULT 10000,
          is_public INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        )`,
        `CREATE INDEX IF NOT EXISTS idx_portfolios_owner ON portfolios(owner_id)`,
        `CREATE INDEX IF NOT EXISTS idx_portfolios_public ON portfolios(is_public)`,
        `CREATE TABLE IF NOT EXISTS portfolio_holdings (
          portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
          symbol TEXT NOT NULL,
          weight REAL NOT NULL,
          PRIMARY KEY (portfolio_id, symbol)
        )`,
        `CREATE TABLE IF NOT EXISTS portfolio_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
          recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
          total_value REAL NOT NULL,
          notes TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_portfolio_history_pid ON portfolio_history(portfolio_id)`,
      ],
      "write",
    );
  } catch (err) {
    console.error("[db] init schema failed", err);
  }
}

/**
 * Ensure DB is initialized (await once at startup).
 * All other helpers are async.
 */
export async function ensureDb(): Promise<void> {
  getClient();
  await _ready;
}

/**
 * Run a SELECT and return rows.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  args: InValue[] = [],
): Promise<T[]> {
  const client = getClient();
  if (_ready) await _ready;
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

/**
 * Run a SELECT and return the first row (or null).
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: InValue[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

/**
 * Run an INSERT/UPDATE/DELETE and return lastInsertRowid + changes.
 */
export async function exec(
  sql: string,
  args: InValue[] = [],
): Promise<{ lastInsertRowid: number | bigint; changes: number }> {
  const client = getClient();
  if (_ready) await _ready;
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid ?? 0,
    changes: result.rowsAffected ?? 0,
  };
}

/**
 * Run multiple statements as a single batch (atomic).
 */
export async function batch(
  statements: Array<{ sql: string; args?: InValue[] }>,
  mode: "write" | "read" = "write",
): Promise<void> {
  const client = getClient();
  if (_ready) await _ready;
  await client.batch(statements, mode);
}
