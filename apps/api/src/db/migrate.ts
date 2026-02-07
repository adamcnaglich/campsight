import { db } from './index';
import { sql } from 'drizzle-orm';
import { log } from '../lib/logger';

/**
 * Run migrations using raw SQL.
 * For a simple project with SQLite, we create tables if they don't exist.
 * Drizzle Kit can also be used for more complex migration workflows.
 */
export function runMigrations() {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS watches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campsite_id TEXT NOT NULL,
      campsite_name TEXT NOT NULL,
      campground_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS availability_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watch_id INTEGER NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      captured_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS notifications_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      watch_id INTEGER NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      channel TEXT NOT NULL,
      payload TEXT NOT NULL
    )
  `);

  // Indexes for common queries
  db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_watches_user_id ON watches(user_id)
  `);

  db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_watches_active ON watches(is_active)
  `);

  db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_availability_watch_id ON availability_snapshots(watch_id)
  `);

  db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications_log(user_id)
  `);

  log.db.info('Migrations complete');
}
