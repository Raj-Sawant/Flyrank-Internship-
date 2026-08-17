require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS widgets (
      id              TEXT PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      description     TEXT,
      type            TEXT NOT NULL DEFAULT 'signup',
      fields          TEXT NOT NULL DEFAULT '[]',
      button_text     TEXT NOT NULL DEFAULT 'Submit',
      display_options TEXT NOT NULL DEFAULT '{}',
      version         INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS widgets_user_id_idx ON widgets(user_id);

    CREATE TABLE IF NOT EXISTS submissions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      widget_id TEXT NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL,
      data      TEXT NOT NULL,
      ip        TEXT,
      country   TEXT,
      city      TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS submissions_widget_id_idx  ON submissions(widget_id);
    CREATE INDEX IF NOT EXISTS submissions_user_id_idx    ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions(created_at);
  `);
  console.log('DB migrated (SQLite)');
}

module.exports = { db, migrate, randomUUID };
