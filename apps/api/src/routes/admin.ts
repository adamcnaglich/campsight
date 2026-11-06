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
import {
  getSmtpConfig,
  sendMail,
  sendTestNotificationEmail,
} from '../services/notification';
import { isHttps } from '../middleware/auth';
import {
  createInvite,
  findUserByEmail,
  isValidEmail,
  listPendingInvites,
  normalizeEmail,
  revokeInvite,
} from '../services/auth';

const router = Router();

/** The signed-in admin's email, set by the session middleware */
function getAdminEmail(req: Request): string {
  return (req as Request & { userEmail: string }).userEmail;
}

function getAdminId(req: Request): string {
  return (req as Request & { userId: string }).userId;
}

/**
 * GET /api/admin — Overview stats
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
 * GET /api/admin/users — Accounts with their watch counts
 */
router.get('/users', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  try {
    const users = db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        isAdmin: schema.users.isAdmin,
        createdAt: schema.users.createdAt,
        watchCount: sql<number>`(SELECT COUNT(*) FROM ${schema.watches} WHERE ${schema.watches.userId} = ${schema.users.id})`,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .all();

    res.json({
      data: users.map((u) => ({ ...u, isAdmin: Boolean(u.isAdmin) })),
    });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to list users');
    res.status(500).json({ error: { message: 'Failed to list users' } });
  }
});

/**
 * DELETE /api/admin/users/:id — Remove an account and everything it owns
 */
router.delete('/users/:id', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const userId = req.params.id;

  if (userId === getAdminId(req)) {
    return res.status(400).json({
      error: { message: 'You cannot delete your own account' },
    });
  }

  try {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Cascades to sessions, watches, snapshots and notifications
    db.delete(schema.users).where(eq(schema.users.id, userId)).run();

    log.api.warn({ adminEmail, userId, userEmail: user.email }, 'Admin deleted user');
    res.json({ data: { success: true } });
  } catch (error) {
    log.api.error({ err: error, adminEmail, userId }, 'Failed to delete user');
    res.status(500).json({ error: { message: 'Failed to delete user' } });
  }
});

/**
 * GET /api/admin/invites — Invite links that have not been used or expired
 */
router.get('/invites', async (req, res: Response) => {
  try {
    res.json({ data: listPendingInvites() });
  } catch (error) {
    log.api.error({ err: error, adminEmail: getAdminEmail(req) }, 'Failed to list invites');
    res.status(500).json({ error: { message: 'Failed to list invites' } });
  }
});

/**
 * POST /api/admin/invites — Create a one-time invite link for an email
 *
 * The link is returned once, here, and emailed when SMTP is configured. Only
 * its hash is stored, so it cannot be shown again later.
 */
router.post('/invites', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);
  const email = normalizeEmail(String(req.body?.email ?? ''));

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: { message: 'Enter a valid email address' } });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({
      error: { message: 'That email already has an account' },
    });
  }

  try {
    const invite = createInvite(email, getAdminId(req));
    const base = (
      process.env.PUBLIC_URL ||
      `${isHttps(req) ? 'https' : 'http'}://${req.headers.host}`
    ).replace(/\/$/, '');
    const link = `${base}/invite/${invite.token}`;

    let emailed = false;
    if (getSmtpConfig()) {
      try {
        await sendMail({
          to: email,
          subject: "You're invited to CampSight",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h1 style="color: #1a5632; font-size: 24px;">🏕️ You're invited to CampSight</h1>
              <p style="font-size: 16px; color: #333;">
                ${adminEmail} set you up with an account. CampSight watches
                Recreation.gov campsites and emails you when one opens up.
              </p>
              <p style="font-size: 16px; color: #333;">
                <a href="${link}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Choose your password
                </a>
              </p>
              <p style="font-size: 14px; color: #64748b;">
                The link works once and expires in 7 days. If the button doesn't work, copy this: ${link}
              </p>
            </div>
          `,
        });
        emailed = true;
      } catch (err) {
        log.api.error({ err, adminEmail, email }, 'Invite created but the email failed to send');
      }
    }

    log.api.info({ adminEmail, email, emailed }, 'Admin created invite');
    res.status(201).json({
      data: { email, link, expiresAt: invite.expiresAt, emailed },
    });
  } catch (error) {
    log.api.error({ err: error, adminEmail, email }, 'Failed to create invite');
    res.status(500).json({ error: { message: 'Failed to create invite' } });
  }
});

/**
 * DELETE /api/admin/invites/:id — Revoke an unused invite
 */
router.delete('/invites/:id', async (req, res: Response) => {
  try {
    revokeInvite(req.params.id);
    res.json({ data: { success: true } });
  } catch (error) {
    log.api.error({ err: error, adminEmail: getAdminEmail(req) }, 'Failed to revoke invite');
    res.status(500).json({ error: { message: 'Failed to revoke invite' } });
  }
});

/**
 * GET /api/admin/watches — List all watches across all users
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
 * GET /api/admin/watches/:id — Get detailed watch info with availability
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
 * DELETE /api/admin/watches/:id — Delete a watch (admin override)
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
 * PATCH /api/admin/watches/:id — Update watch (admin override)
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
 * GET /api/admin/notifications — List all notifications
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
 * POST /api/admin/notifications/test — Send a test notification email to the signed-in admin
 */
router.post('/notifications/test', async (req, res: Response) => {
  const adminEmail = getAdminEmail(req);

  if (!adminEmail) {
    return res.status(400).json({
      error: { message: 'Your account has no email address' },
    });
  }

  try {
    await sendTestNotificationEmail(adminEmail);
    log.api.info({ adminEmail }, 'Admin sent test notification email');
    res.json({ data: { message: 'Test email sent' } });
  } catch (error) {
    log.api.error({ err: error, adminEmail }, 'Failed to send test notification');
    res.status(500).json({
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to send test notification',
      },
    });
  }
});

/**
 * GET /api/admin/snapshots — List availability snapshots (with pagination)
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
 * GET /api/admin/activity — Recent activity across the system
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

    // Get recent scheduler internal events (retries, cooldowns, caps)
    const recentSchedulerEvents = db
      .select({
        type: sql<string>`'scheduler_event'`,
        timestamp: schema.schedulerEvents.occurredAt,
        userId: sql<string>`''`,
        userEmail: sql<string>`'System'`,
        details: sql<string>`json_object(
          'eventType', ${schema.schedulerEvents.eventType},
          'message', ${schema.schedulerEvents.message},
          'metadata', ${schema.schedulerEvents.metadata}
        )`,
      })
      .from(schema.schedulerEvents)
      .orderBy(desc(schema.schedulerEvents.occurredAt))
      .limit(limit)
      .all();

    // Combine and sort by timestamp
    const allActivity = [
      ...recentWatches,
      ...recentUsers,
      ...recentNotifications,
      ...recentSchedulerRuns,
      ...recentSchedulerEvents,
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
 * GET /api/admin/scheduler/status — Get scheduler status
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
 * POST /api/admin/scheduler/start — Start the scheduler
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
 * POST /api/admin/scheduler/stop — Stop the scheduler
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
 * POST /api/admin/scheduler/restart — Restart the scheduler
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
 * POST /api/admin/scheduler/trigger — Manually trigger a check cycle
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
