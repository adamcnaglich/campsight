import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, desc, sql, count, inArray } from 'drizzle-orm';
import { log } from '../lib/logger';
import {
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  restartScheduler,
  triggerManualCheck,
} from '../services/scheduler';

const router = Router();

/** Helper to extract admin user info set by admin auth middleware */
function getAdminEmail(req: Request): string {
  return (req as Request & { adminEmail: string }).adminEmail;
}

/**
 * GET /admin — Overview stats
 */
router.get('/', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    const stats = {
      users: {
        total: db.select({ count: count() }).from(schema.users).get()?.count || 0,
      },
      watches: {
        total: db.select({ count: count() }).from(schema.watches).get()?.count || 0,
        active: db
          .select({ count: count() })
          .from(schema.watches)
          .where(eq(schema.watches.isActive, true))
          .get()?.count || 0,
      },
      snapshots: {
        total: db.select({ count: count() }).from(schema.availabilitySnapshots).get()?.count || 0,
      },
      notifications: {
        total: db.select({ count: count() }).from(schema.notificationsLog).get()?.count || 0,
      },
    };

    log.api.info({ adminEmail }, 'Admin overview accessed');
    res.json({ data: stats });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to fetch admin overview');
    res.status(500).json({ error: { message: 'Failed to fetch admin overview' } });
  }
});

/**
 * GET /admin/users — List all users with their watch counts
 */
router.get('/users', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    const users = db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        watchCount: sql<number>`(SELECT COUNT(*) FROM ${schema.watches} WHERE ${schema.watches.userId} = ${schema.users.id})`,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .all();

    log.api.info({ adminEmail, count: users.length }, 'Admin listed all users');
    res.json({ data: users });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to list users');
    res.status(500).json({ error: { message: 'Failed to list users' } });
  }
});

/**
 * GET /admin/users/:id — Get detailed user info
 */
router.get('/users/:id', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const userId = req.params.id;

  try {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const watches = db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.userId, userId))
      .orderBy(desc(schema.watches.createdAt))
      .all();

    const notifications = db
      .select()
      .from(schema.notificationsLog)
      .where(eq(schema.notificationsLog.userId, userId))
      .orderBy(desc(schema.notificationsLog.sentAt))
      .all();

    const watchesWithSites = watches.map((w) => {
      const sites = db
        .select()
        .from(schema.watchSites)
        .where(eq(schema.watchSites.watchId, w.id))
        .all();
      return {
        ...w,
        isActive: Boolean(w.isActive),
        sites: sites.map((s) => ({ id: s.id, campsiteId: s.campsiteId, campsiteName: s.campsiteName, loop: s.loop })),
      };
    });

    log.api.info({ adminEmail, userId }, 'Admin fetched user details');
    res.json({
      data: {
        user,
        watches: watchesWithSites,
        notifications,
      },
    });
  } catch (error) {
    log.api.error({ err: error, adminEmail, userId }, 'Failed to fetch user details');
    res.status(500).json({ error: { message: 'Failed to fetch user details' } });
  }
});

/**
 * DELETE /admin/users/:id — Delete a user and all their data
 */
router.delete('/users/:id', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const userId = req.params.id;

  try {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Delete user (cascades to watches, snapshots, notifications)
    db.delete(schema.users).where(eq(schema.users.id, userId)).run();

    log.api.warn(
      { adminEmail, userId, userEmail: user.email },
      'Admin deleted user'
    );
    res.json({ data: { success: true } });
  } catch (error) {
    log.api.error({ err: error, adminEmail, userId }, 'Failed to delete user');
    res.status(500).json({ error: { message: 'Failed to delete user' } });
  }
});

/**
 * GET /admin/watches — List all watches across all users
 */
router.get('/watches', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    const watchRows = db
      .select({
        id: schema.watches.id,
        userId: schema.watches.userId,
        userEmail: schema.users.email,
        campgroundName: schema.watches.campgroundName,
        recAreaName: schema.watches.recAreaName,
        imageUrl: schema.watches.imageUrl,
        startDate: schema.watches.startDate,
        endDate: schema.watches.endDate,
        isActive: schema.watches.isActive,
        createdAt: schema.watches.createdAt,
      })
      .from(schema.watches)
      .leftJoin(schema.users, eq(schema.watches.userId, schema.users.id))
      .orderBy(desc(schema.watches.createdAt))
      .all();

    const data = watchRows.map((w) => {
      const sites = db
        .select()
        .from(schema.watchSites)
        .where(eq(schema.watchSites.watchId, w.id))
        .all();
      return {
        ...w,
        isActive: Boolean(w.isActive),
        sites: sites.map((s) => ({ id: s.id, campsiteId: s.campsiteId, campsiteName: s.campsiteName, loop: s.loop })),
      };
    });

    log.api.info({ adminEmail, count: data.length }, 'Admin listed all watches');
    res.json({ data });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to list watches');
    res.status(500).json({ error: { message: 'Failed to list watches' } });
  }
});

/**
 * GET /admin/watches/:id — Get detailed watch info with availability
 */
router.get('/watches/:id', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const watchId = parseInt(req.params.id, 10);

  if (isNaN(watchId)) {
    return res.status(400).json({ error: { message: 'Invalid watch ID' } });
  }

  try {
    const watchRow = db
      .select({
        id: schema.watches.id,
        userId: schema.watches.userId,
        userEmail: schema.users.email,
        campgroundName: schema.watches.campgroundName,
        recAreaName: schema.watches.recAreaName,
        imageUrl: schema.watches.imageUrl,
        startDate: schema.watches.startDate,
        endDate: schema.watches.endDate,
        isActive: schema.watches.isActive,
        createdAt: schema.watches.createdAt,
      })
      .from(schema.watches)
      .leftJoin(schema.users, eq(schema.watches.userId, schema.users.id))
      .where(eq(schema.watches.id, watchId))
      .get();

    if (!watchRow) {
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    const sites = db
      .select()
      .from(schema.watchSites)
      .where(eq(schema.watchSites.watchId, watchId))
      .all();

    const siteIds = sites.map((s) => s.id);
    const snapshots = siteIds.length > 0
      ? db
          .select()
          .from(schema.availabilitySnapshots)
          .where(inArray(schema.availabilitySnapshots.watchSiteId, siteIds))
          .orderBy(desc(schema.availabilitySnapshots.capturedAt))
          .all()
      : [];

    log.api.info({ adminEmail, watchId }, 'Admin fetched watch details');
    res.json({
      data: {
        watch: {
          ...watchRow,
          isActive: Boolean(watchRow.isActive),
          sites: sites.map((s) => ({ id: s.id, campsiteId: s.campsiteId, campsiteName: s.campsiteName, loop: s.loop })),
        },
        snapshots,
      },
    });
  } catch (error) {
    log.api.error({ err: error, adminEmail, watchId }, 'Failed to fetch watch details');
    res.status(500).json({ error: { message: 'Failed to fetch watch details' } });
  }
});

/**
 * DELETE /admin/watches/:id — Delete a watch (admin override)
 */
router.delete('/watches/:id', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const watchId = parseInt(req.params.id, 10);

  if (isNaN(watchId)) {
    return res.status(400).json({ error: { message: 'Invalid watch ID' } });
  }

  try {
    const watch = db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.id, watchId))
      .get();

    if (!watch) {
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    db.delete(schema.watches).where(eq(schema.watches.id, watchId)).run();

    log.api.warn(
      { adminEmail, watchId, userId: watch.userId, campgroundName: watch.campgroundName },
      'Admin deleted watch'
    );
    res.json({ data: { success: true } });
  } catch (error) {
    log.api.error({ err: error, adminEmail, watchId }, 'Failed to delete watch');
    res.status(500).json({ error: { message: 'Failed to delete watch' } });
  }
});

/**
 * PATCH /admin/watches/:id — Update watch (admin override)
 */
router.patch('/:id', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const watchId = parseInt(req.params.id, 10);

  if (isNaN(watchId)) {
    return res.status(400).json({ error: { message: 'Invalid watch ID' } });
  }

  try {
    const watch = db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.id, watchId))
      .get();

    if (!watch) {
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    const result = db
      .update(schema.watches)
      .set(req.body)
      .where(eq(schema.watches.id, watchId))
      .returning()
      .get();

    log.api.info(
      { adminEmail, watchId, changes: req.body },
      'Admin updated watch'
    );
    res.json({ data: { ...result, isActive: Boolean(result.isActive) } });
  } catch (error) {
    log.api.error({ err: error, adminEmail, watchId }, 'Failed to update watch');
    res.status(500).json({ error: { message: 'Failed to update watch' } });
  }
});

/**
 * GET /admin/notifications — List all notifications
 */
router.get('/notifications', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

  try {
    const notifications = db
      .select({
        id: schema.notificationsLog.id,
        userId: schema.notificationsLog.userId,
        userEmail: schema.users.email,
        watchId: schema.notificationsLog.watchId,
        sentAt: schema.notificationsLog.sentAt,
        channel: schema.notificationsLog.channel,
        payload: schema.notificationsLog.payload,
      })
      .from(schema.notificationsLog)
      .leftJoin(schema.users, eq(schema.notificationsLog.userId, schema.users.id))
      .orderBy(desc(schema.notificationsLog.sentAt))
      .limit(limit)
      .all();

    log.api.info({ adminEmail, count: notifications.length }, 'Admin listed notifications');
    res.json({ data: notifications });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to list notifications');
    res.status(500).json({ error: { message: 'Failed to list notifications' } });
  }
});

/**
 * GET /admin/snapshots — List availability snapshots (with pagination)
 */
router.get('/snapshots', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const snapshots = db
      .select()
      .from(schema.availabilitySnapshots)
      .orderBy(desc(schema.availabilitySnapshots.capturedAt))
      .limit(limit)
      .offset(offset)
      .all();

    const total = db
      .select({ count: count() })
      .from(schema.availabilitySnapshots)
      .get()?.count || 0;

    log.api.info(
      { adminEmail, count: snapshots.length, total },
      'Admin listed availability snapshots'
    );
    res.json({ data: snapshots, meta: { total, limit, offset } });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to list snapshots');
    res.status(500).json({ error: { message: 'Failed to list snapshots' } });
  }
});

/**
 * GET /admin/activity — Recent activity across the system
 */
router.get('/activity', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  try {
    // Get recent watches
    const recentWatches = db
      .select({
        type: sql<string>`'watch_created'`,
        timestamp: schema.watches.createdAt,
        userId: schema.watches.userId,
        userEmail: schema.users.email,
        details: sql<string>`json_object(
          'watchId', ${schema.watches.id},
          'campgroundName', ${schema.watches.campgroundName}
        )`,
      })
      .from(schema.watches)
      .leftJoin(schema.users, eq(schema.watches.userId, schema.users.id))
      .orderBy(desc(schema.watches.createdAt))
      .limit(limit)
      .all();

    // Get recent users
    const recentUsers = db
      .select({
        type: sql<string>`'user_registered'`,
        timestamp: schema.users.createdAt,
        userId: schema.users.id,
        userEmail: schema.users.email,
        details: sql<string>`json_object('displayName', ${schema.users.displayName})`,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .all();

    // Get recent notifications
    const recentNotifications = db
      .select({
        type: sql<string>`'notification_sent'`,
        timestamp: schema.notificationsLog.sentAt,
        userId: schema.notificationsLog.userId,
        userEmail: schema.users.email,
        details: sql<string>`json_object(
          'notificationId', ${schema.notificationsLog.id},
          'channel', ${schema.notificationsLog.channel},
          'watchId', ${schema.notificationsLog.watchId}
        )`,
      })
      .from(schema.notificationsLog)
      .leftJoin(schema.users, eq(schema.notificationsLog.userId, schema.users.id))
      .orderBy(desc(schema.notificationsLog.sentAt))
      .limit(limit)
      .all();

    // Get recent scheduler runs
    const recentSchedulerRuns = db
      .select({
        type: sql<string>`'scheduler_run'`,
        timestamp: schema.schedulerRuns.finishedAt,
        userId: sql<string>`''`,
        userEmail: sql<string>`'System'`,
        details: sql<string>`json_object(
          'status', ${schema.schedulerRuns.status},
          'groupsChecked', ${schema.schedulerRuns.groupsChecked},
          'errorMessage', ${schema.schedulerRuns.errorMessage}
        )`,
      })
      .from(schema.schedulerRuns)
      .orderBy(desc(schema.schedulerRuns.finishedAt))
      .limit(limit)
      .all();

    // Combine and sort by timestamp
    const allActivity = [
      ...recentWatches,
      ...recentUsers,
      ...recentNotifications,
      ...recentSchedulerRuns,
    ].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }).slice(0, limit);

    log.api.info({ adminEmail, count: allActivity.length }, 'Admin fetched activity feed');
    res.json({ data: allActivity });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to fetch activity');
    res.status(500).json({ error: { message: 'Failed to fetch activity' } });
  }
});

/**
 * GET /admin/scheduler/status — Get scheduler status
 */
router.get('/scheduler/status', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    const status = getSchedulerStatus();
    log.api.info({ adminEmail }, 'Admin fetched scheduler status');
    res.json({ data: status });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to fetch scheduler status');
    res.status(500).json({ error: { message: 'Failed to fetch scheduler status' } });
  }
});

/**
 * POST /admin/scheduler/start — Start the scheduler
 */
router.post('/scheduler/start', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    startScheduler();
    const status = getSchedulerStatus();
    log.api.warn({ adminEmail }, 'Admin started scheduler');
    res.json({ data: status });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to start scheduler');
    res.status(500).json({ error: { message: 'Failed to start scheduler' } });
  }
});

/**
 * POST /admin/scheduler/stop — Stop the scheduler
 */
router.post('/scheduler/stop', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    stopScheduler();
    const status = getSchedulerStatus();
    log.api.warn({ adminEmail }, 'Admin stopped scheduler');
    res.json({ data: status });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to stop scheduler');
    res.status(500).json({ error: { message: 'Failed to stop scheduler' } });
  }
});

/**
 * POST /admin/scheduler/restart — Restart the scheduler
 */
router.post('/scheduler/restart', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    restartScheduler();
    const status = getSchedulerStatus();
    log.api.warn({ adminEmail }, 'Admin restarted scheduler');
    res.json({ data: status });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to restart scheduler');
    res.status(500).json({ error: { message: 'Failed to restart scheduler' } });
  }
});

/**
 * POST /admin/scheduler/trigger — Manually trigger a check cycle
 */
router.post('/scheduler/trigger', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    // Run check in background, don't wait for it
    triggerManualCheck().catch((err) =>
      log.api.error({ err, adminEmail }, 'Manual check failed')
    );

    log.api.warn({ adminEmail }, 'Admin triggered manual check');
    res.json({ data: { message: 'Check triggered' } });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to trigger manual check');
    res.status(500).json({ error: { message: 'Failed to trigger manual check' } });
  }
});

export default router;
