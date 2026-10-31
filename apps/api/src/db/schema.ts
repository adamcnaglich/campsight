import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ─── Users ─────────────────────────────────────────────────────────────────────

// Single-user mode: one row with id 'local'. Email mirrors NOTIFY_EMAIL.
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
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
  campgroundName: text('campground_name').notNull(),
  recAreaName: text('rec_area_name'),
  imageUrl: text('image_url'),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Watch Sites (join table) ─────────────────────────────────────────────────

export const watchSites = sqliteTable('watch_sites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  watchId: integer('watch_id')
    .notNull()
    .references(() => watches.id, { onDelete: 'cascade' }),
  campsiteId: text('campsite_id').notNull(),
  campsiteName: text('campsite_name').notNull(),
  loop: text('loop'),
  latitude: text('latitude'),
  longitude: text('longitude'),
});

// ─── Availability Snapshots ────────────────────────────────────────────────────

export const availabilitySnapshots = sqliteTable(
  'availability_snapshots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    watchSiteId: integer('watch_site_id')
      .notNull()
      .references(() => watchSites.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    status: text('status').notNull(),
    capturedAt: text('captured_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    siteDate: uniqueIndex('idx_availability_site_date').on(
      table.watchSiteId,
      table.date
    ),
  })
);

// ─── Notified Dates ────────────────────────────────────────────────────────────

// One row per (watch site, date) we have already emailed about. Availability
// snapshots record what recreation.gov last said; these record what the user has
// already been told, so a site that flickers out and back does not re-alert.
export const notifiedDates = sqliteTable(
  'notified_dates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    watchSiteId: integer('watch_site_id')
      .notNull()
      .references(() => watchSites.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    notifiedAt: text('notified_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    // Consecutive checks that saw this date as explicitly unavailable. The mark
    // is dropped once this crosses the threshold, so a genuine reopening later
    // can alert again.
    missCount: integer('miss_count').notNull().default(0),
  },
  (table) => ({
    siteDate: uniqueIndex('idx_notified_dates_site_date').on(
      table.watchSiteId,
      table.date
    ),
  })
);

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

// ─── Scheduler Events ──────────────────────────────────────────────────────────

export const schedulerEvents = sqliteTable('scheduler_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  occurredAt: text('occurred_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  eventType: text('event_type').notNull(),
  message: text('message').notNull(),
  metadata: text('metadata'),
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
