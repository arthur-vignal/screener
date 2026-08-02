/**
 * SQLite database setup.
 *
 * Path: data/screener.db (auto-created on first run).
 * Schema is created/updated on import.
 *
 * Tables:
 *  - users: id, username (unique), email (unique), password_hash, created_at
 *  - sessions: id, user_id, expires_at
 *  - indices: id, owner_id, name, description, universe, filters (json), ranking (json), top_n, is_public, created_at, updated_at
 *  - portfolios: id, owner_id, name, description, is_public, initial_value, created_at, updated_at
 *  - portfolio_holdings: portfolio_id, symbol, weight
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "screener.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  _db = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS indices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      universe TEXT NOT NULL DEFAULT 'sp500',
      filters TEXT NOT NULL DEFAULT '{}',  -- JSON: { peMax, roeMin, sector, etc }
      ranking TEXT NOT NULL DEFAULT 'momentum-12-1',  -- or 'value', 'quality', 'dividend-yield'
      top_n INTEGER NOT NULL DEFAULT 30,
      is_public INTEGER NOT NULL DEFAULT 0,  -- 0 = private, 1 = public
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_indices_owner ON indices(owner_id);
    CREATE INDEX IF NOT EXISTS idx_indices_public ON indices(is_public);

    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      initial_value REAL NOT NULL DEFAULT 10000,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_portfolios_owner ON portfolios(owner_id);
    CREATE INDEX IF NOT EXISTS idx_portfolios_public ON portfolios(is_public);

    CREATE TABLE IF NOT EXISTS portfolio_holdings (
      portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      weight REAL NOT NULL,
      PRIMARY KEY (portfolio_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS portfolio_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
      total_value REAL NOT NULL,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_portfolio_history_pid ON portfolio_history(portfolio_id);
  `);
}
