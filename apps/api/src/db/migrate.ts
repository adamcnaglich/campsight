import { db } from './index';
import { sql } from 'drizzle-orm';
import { log } from '../lib/logger';

function addColumnIfMissing(table: string, column: string, type: string) {
  const exists = db.get<{ cnt: number }>(
    sql.raw(`SELECT COUNT(*) as cnt FROM pragma_table_info('${table}') WHERE name = '${column}'`)
  );
  if (!exists || exists.cnt === 0) {
    db.run(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`));
    log.db.info(`Added column ${column} to ${table}`);
  }
}

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
    CREATE TABLE IF NOT EXISTS scheduler_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      finished_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL,
      error_message TEXT,
      groups_checked INTEGER
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS scheduler_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT
    )
  `);

  // --- Multi-site migration ---
  // Detect whether the old single-site schema is in place
  const hasOldSchema = db.get<{ cnt: number }>(sql`
    SELECT COUNT(*) as cnt FROM pragma_table_info('watches')
    WHERE name = 'campsite_id'
  `);

  if (hasOldSchema && hasOldSchema.cnt > 0) {
    log.db.info('Migrating from single-site to multi-site schema...');
    migrateToMultiSite();
  } else {
    createFreshSchema();
  }

  // Backfill columns that may be missing on existing multi-site databases
  addColumnIfMissing('watches', 'rec_area_name', 'TEXT');
  addColumnIfMissing('watch_sites', 'loop', 'TEXT');
  addColumnIfMissing('watch_sites', 'latitude', 'TEXT');
  addColumnIfMissing('watch_sites', 'longitude', 'TEXT');

  // Accounts: password login, admin flag, sessions and invite links
  addColumnIfMissing('users', 'password_hash', 'TEXT');
  addColumnIfMissing('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');

  db.run(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS invites (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      used_at TEXT
    )
  `);

  // Records which (watch site, date) pairs the user has already been emailed
  // about, so a site that flickers unavailable and back does not re-alert.
  db.run(sql`
    CREATE TABLE IF NOT EXISTS notified_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watch_site_id INTEGER NOT NULL REFERENCES watch_sites(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      notified_at TEXT NOT NULL DEFAULT (datetime('now')),
      miss_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Snapshots are now upserted per (site, date) rather than deleted and
  // rewritten wholesale, which needs a unique index to conflict against. Older
  // databases should already hold at most one row per pair, but dedupe first so
  // the index cannot fail to build on a database that drifted.
  dedupeAvailabilitySnapshots();

  // Indexes
  db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_site_date ON availability_snapshots(watch_site_id, date)`);
  db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_notified_dates_site_date ON notified_dates(watch_site_id, date)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  // One account per address, whatever its capitalization.
  try {
    db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE)`);
  } catch (err) {
    log.db.warn({ err }, 'Could not enforce unique user emails; duplicates exist');
  }
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_watches_user_id ON watches(user_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_watches_active ON watches(is_active)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_watch_sites_watch_id ON watch_sites(watch_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_availability_watch_site_id ON availability_snapshots(watch_site_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications_log(user_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_scheduler_runs_finished_at ON scheduler_runs(finished_at)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_scheduler_events_occurred_at ON scheduler_events(occurred_at)`);

  log.db.info('Migrations complete');
}

/**
 * Collapse any duplicate (watch_site_id, date) snapshot rows down to the most
 * recently captured one, so the unique index can be built.
 */
function dedupeAvailabilitySnapshots() {
  const duplicates = db.get<{ cnt: number }>(sql`
    SELECT COUNT(*) as cnt FROM (
      SELECT watch_site_id, date FROM availability_snapshots
      GROUP BY watch_site_id, date HAVING COUNT(*) > 1
    )
  `);

  if (!duplicates || duplicates.cnt === 0) {
    return;
  }

  db.run(sql`
    DELETE FROM availability_snapshots
    WHERE id NOT IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY watch_site_id, date ORDER BY captured_at DESC, id DESC
        ) AS rn
        FROM availability_snapshots
      ) WHERE rn = 1
    )
  `);

  log.db.info(
    { duplicatePairs: duplicates.cnt },
    'Deduped availability snapshots before unique index'
  );
}

/**
 * Create tables from scratch (fresh database).
 */
function createFreshSchema() {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS watches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campground_name TEXT NOT NULL,
      rec_area_name TEXT,
      image_url TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS watch_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watch_id INTEGER NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
      campsite_id TEXT NOT NULL,
      campsite_name TEXT NOT NULL,
      loop TEXT,
      latitude TEXT,
      longitude TEXT
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS availability_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watch_site_id INTEGER NOT NULL REFERENCES watch_sites(id) ON DELETE CASCADE,
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
}

/**
 * Migrate existing single-site data to the new multi-site schema.
 * Uses SQLite's recreate-table pattern since ALTER COLUMN isn't supported.
 */
function migrateToMultiSite() {
  // 1. Create the new watches table (without campsite_id/campsite_name, with image_url + rec_area_name)
  db.run(sql`
    CREATE TABLE watches_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campground_name TEXT NOT NULL,
      rec_area_name TEXT,
      image_url TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 2. Copy watch data (drop campsite columns)
  db.run(sql`
    INSERT INTO watches_new (id, user_id, campground_name, start_date, end_date, is_active, created_at)
    SELECT id, user_id, campground_name, start_date, end_date, is_active, created_at
    FROM watches
  `);

  // 3. Create watch_sites and populate from old watches
  db.run(sql`
    CREATE TABLE IF NOT EXISTS watch_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watch_id INTEGER NOT NULL REFERENCES watches_new(id) ON DELETE CASCADE,
      campsite_id TEXT NOT NULL,
      campsite_name TEXT NOT NULL,
      loop TEXT
    )
  `);

  db.run(sql`
    INSERT INTO watch_sites (watch_id, campsite_id, campsite_name)
    SELECT id, campsite_id, campsite_name FROM watches
  `);

  // 4. Recreate availability_snapshots pointing to watch_sites
  db.run(sql`
    CREATE TABLE availability_snapshots_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watch_site_id INTEGER NOT NULL REFERENCES watch_sites(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      captured_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Map old watch_id -> new watch_site_id via the watch_sites table
  db.run(sql`
    INSERT INTO availability_snapshots_new (watch_site_id, date, status, captured_at)
    SELECT ws.id, a.date, a.status, a.captured_at
    FROM availability_snapshots a
    JOIN watch_sites ws ON ws.watch_id = a.watch_id
  `);

  // 5. Drop old tables and rename
  db.run(sql`DROP TABLE availability_snapshots`);
  db.run(sql`ALTER TABLE availability_snapshots_new RENAME TO availability_snapshots`);
  db.run(sql`DROP TABLE watches`);
  db.run(sql`ALTER TABLE watches_new RENAME TO watches`);

  // 6. Ensure notifications_log exists (unchanged structure)
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

  // Drop old indexes that reference removed columns
  db.run(sql`DROP INDEX IF EXISTS idx_watches_user_id`);
  db.run(sql`DROP INDEX IF EXISTS idx_watches_active`);
  db.run(sql`DROP INDEX IF EXISTS idx_availability_watch_id`);

  log.db.info('Multi-site migration complete');
}
