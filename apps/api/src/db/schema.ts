import {
  sqliteTable,
  text,
  integer,
} from 'drizzle-orm/sqlite-core';

// ─── Users ─────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Watches ───────────────────────────────────────────────────────────────────

export const watches = sqliteTable('watches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  campsiteId: text('campsite_id').notNull(),
  campsiteName: text('campsite_name').notNull(),
  campgroundName: text('campground_name').notNull(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Availability Snapshots ────────────────────────────────────────────────────

export const availabilitySnapshots = sqliteTable('availability_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  watchId: integer('watch_id')
    .notNull()
    .references(() => watches.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').notNull(),
  capturedAt: text('captured_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Scheduler Runs ────────────────────────────────────────────────────────────

export const schedulerRuns = sqliteTable('scheduler_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  finishedAt: text('finished_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  status: text('status').notNull(), // 'success' | 'error'
  errorMessage: text('error_message'),
  groupsChecked: integer('groups_checked'),
});

// ─── Notification Log ──────────────────────────────────────────────────────────

export const notificationsLog = sqliteTable('notifications_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  watchId: integer('watch_id')
    .notNull()
    .references(() => watches.id, { onDelete: 'cascade' }),
  sentAt: text('sent_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  channel: text('channel').notNull(), // 'email' | 'push'
  payload: text('payload').notNull(), // JSON string
});
