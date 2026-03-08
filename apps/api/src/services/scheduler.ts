import cron, { ScheduledTask } from 'node-cron';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { fetchAvailability, diffAvailability } from './availability';
import { sendAvailabilityNotification } from './notification';
import { AvailabilityMap } from '@campsight/shared';
import { log } from '../lib/logger';

const CRON_SCHEDULE = process.env.CHECK_INTERVAL || '*/15 * * * *'; // every 15 min

// Scheduler state
let schedulerTask: ScheduledTask | null = null;
let isSchedulerRunning = false;
let lastRunTime: Date | null = null;
let lastRunStatus: 'success' | 'error' | null = null;
let lastRunError: string | null = null;
let isCheckInProgress = false;

interface WatchSiteEntry {
  watchSiteId: number;
  watchId: number;
  userId: string;
  campsiteId: string;
  campsiteName: string;
  campgroundName: string;
}

interface SiteGroup {
  campsiteId: string;
  startDate: string;
  endDate: string;
  entries: WatchSiteEntry[];
}

/**
 * Group active watch sites by campsiteId + date range to avoid duplicate API calls.
 */
function groupActiveWatchSites(): SiteGroup[] {
  const activeWatches = db
    .select()
    .from(schema.watches)
    .where(eq(schema.watches.isActive, true))
    .all();

  const groups = new Map<string, SiteGroup>();

  for (const watch of activeWatches) {
    const sites = db
      .select()
      .from(schema.watchSites)
      .where(eq(schema.watchSites.watchId, watch.id))
      .all();

    for (const site of sites) {
      const key = `${site.campsiteId}:${watch.startDate}:${watch.endDate}`;
      if (!groups.has(key)) {
        groups.set(key, {
          campsiteId: site.campsiteId,
          startDate: watch.startDate,
          endDate: watch.endDate,
          entries: [],
        });
      }
      groups.get(key)!.entries.push({
        watchSiteId: site.id,
        watchId: watch.id,
        userId: watch.userId,
        campsiteId: site.campsiteId,
        campsiteName: site.campsiteName,
        campgroundName: watch.campgroundName,
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * Get the latest availability snapshot for a watch site as a map.
 */
function getLatestSnapshot(watchSiteId: number): AvailabilityMap {
  const snapshots = db
    .select()
    .from(schema.availabilitySnapshots)
    .where(eq(schema.availabilitySnapshots.watchSiteId, watchSiteId))
    .all();

  const map: AvailabilityMap = {};
  const latestTimestamps: Record<string, string> = {};

  for (const snap of snapshots) {
    if (!latestTimestamps[snap.date] || snap.capturedAt > latestTimestamps[snap.date]) {
      map[snap.date] = snap.status;
      latestTimestamps[snap.date] = snap.capturedAt;
    }
  }

  return map;
}

/**
 * Store new availability data as snapshots for a watch site.
 */
function storeSnapshots(watchSiteId: number, availability: AvailabilityMap) {
  const now = new Date().toISOString();
  const values = Object.entries(availability).map(([date, status]) => ({
    watchSiteId,
    date,
    status,
    capturedAt: now,
  }));

  if (values.length > 0) {
    db.delete(schema.availabilitySnapshots)
      .where(eq(schema.availabilitySnapshots.watchSiteId, watchSiteId))
      .run();

    for (const val of values) {
      db.insert(schema.availabilitySnapshots).values(val).run();
    }
  }
}

/**
 * Run a single check cycle across all active watches.
 */
async function runCheck() {
  if (isCheckInProgress) {
    log.scheduler.warn('Check already in progress, skipping');
    return;
  }

  isCheckInProgress = true;
  lastRunTime = new Date();
  lastRunStatus = null;
  lastRunError = null;

  try {
    const groups = groupActiveWatchSites();

    if (groups.length === 0) {
      log.scheduler.debug('No active watches to check');
      lastRunStatus = 'success';
      db.insert(schema.schedulerRuns).values({
        status: 'success',
        groupsChecked: 0,
      }).run();
      return;
    }

    log.scheduler.info({ groupCount: groups.length }, 'Starting check cycle');

    // Collect newly available sites per watch so we can send one notification per watch
    const watchNotifications = new Map<number, {
      userId: string;
      campgroundName: string;
      sites: Array<{ campsiteId: string; campsiteName: string; newlyAvailableDates: string[] }>;
    }>();

    for (const group of groups) {
      try {
        const currentAvailability = await fetchAvailability(
          group.campsiteId,
          group.startDate,
          group.endDate
        );

        for (const entry of group.entries) {
          const previousAvailability = getLatestSnapshot(entry.watchSiteId);
          const newlyAvailable = diffAvailability(
            previousAvailability,
            currentAvailability
          );

          storeSnapshots(entry.watchSiteId, currentAvailability);

          if (newlyAvailable.length > 0) {
            log.scheduler.info(
              { watchSiteId: entry.watchSiteId, watchId: entry.watchId, userId: entry.userId, newDates: newlyAvailable.length },
              'New availability detected',
            );

            if (!watchNotifications.has(entry.watchId)) {
              watchNotifications.set(entry.watchId, {
                userId: entry.userId,
                campgroundName: entry.campgroundName,
                sites: [],
              });
            }
            watchNotifications.get(entry.watchId)!.sites.push({
              campsiteId: entry.campsiteId,
              campsiteName: entry.campsiteName,
              newlyAvailableDates: newlyAvailable,
            });
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        log.scheduler.error(
          { err: error, campsiteId: group.campsiteId },
          'Error checking campsite availability',
        );
      }
    }

    // Send one notification per watch with all newly available sites
    for (const [watchId, notification] of watchNotifications) {
      try {
        await sendAvailabilityNotification({
          userId: notification.userId,
          watchId,
          campgroundName: notification.campgroundName,
          sites: notification.sites,
        });
      } catch (error) {
        log.scheduler.error(
          { err: error, watchId },
          'Error sending notification',
        );
      }
    }

    log.scheduler.info('Check cycle complete');
    lastRunStatus = 'success';
    db.insert(schema.schedulerRuns).values({
      status: 'success',
      groupsChecked: groups.length,
    }).run();
  } catch (error) {
    log.scheduler.error({ err: error }, 'Unhandled error in check cycle');
    lastRunStatus = 'error';
    lastRunError = error instanceof Error ? error.message : 'Unknown error';
    db.insert(schema.schedulerRuns).values({
      status: 'error',
      errorMessage: lastRunError,
    }).run();
    throw error;
  } finally {
    isCheckInProgress = false;
  }
}

/**
 * Start the cron scheduler. Abstracted so it can be swapped for BullMQ later.
 */
export function startScheduler() {
  if (isSchedulerRunning) {
    log.scheduler.warn('Scheduler already running');
    return;
  }

  log.scheduler.info({ schedule: CRON_SCHEDULE }, 'Scheduler started');

  schedulerTask = cron.schedule(CRON_SCHEDULE, () => {
    log.scheduler.info('Running scheduled check');
    runCheck().catch((err) =>
      log.scheduler.error({ err }, 'Unhandled error in check cycle')
    );
  });

  isSchedulerRunning = true;

  // Also run once on startup (after a short delay to let everything initialize)
  setTimeout(() => {
    log.scheduler.info('Running initial check');
    runCheck().catch((err) =>
      log.scheduler.error({ err }, 'Initial check error')
    );
  }, 5000);
}

/**
 * Stop the scheduler.
 */
export function stopScheduler() {
  if (!isSchedulerRunning || !schedulerTask) {
    log.scheduler.warn('Scheduler not running');
    return;
  }

  schedulerTask.stop();
  isSchedulerRunning = false;
  log.scheduler.info('Scheduler stopped');
}

/**
 * Restart the scheduler.
 */
export function restartScheduler() {
  stopScheduler();
  startScheduler();
}

/**
 * Manually trigger a check cycle (admin function).
 */
export async function triggerManualCheck() {
  log.scheduler.info('Manual check triggered by admin');
  await runCheck();
}

/**
 * Get current scheduler status.
 */
export function getSchedulerStatus() {
  return {
    isRunning: isSchedulerRunning,
    isCheckInProgress,
    schedule: CRON_SCHEDULE,
    lastRunTime: lastRunTime?.toISOString() || null,
    lastRunStatus,
    lastRunError,
  };
}
