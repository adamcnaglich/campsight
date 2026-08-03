import cron, { ScheduledTask } from 'node-cron';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { fetchAvailability, diffAvailability, isRateLimitedError } from './availability';
import { sendAvailabilityNotification } from './notification';
import { AvailabilityMap } from '@campsight/shared';
import { log } from '../lib/logger';
import { logSchedulerEvent } from './scheduler-events';

const CRON_SCHEDULE = process.env.CHECK_INTERVAL || '*/15 * * * *'; // every 15 min
const REQUEST_DELAY_MS = Math.max(0, Number(process.env.SCHEDULER_REQUEST_DELAY_MS || 1000));
const MAX_GROUPS_PER_CYCLE = Math.max(0, Number(process.env.SCHEDULER_MAX_GROUPS_PER_CYCLE || 0));
const RATE_LIMIT_COOLDOWN_MS = Math.max(
  0,
  Number(process.env.SCHEDULER_RATE_LIMIT_COOLDOWN_MS || 5 * 60 * 1000),
);

// Scheduler state
let schedulerTask: ScheduledTask | null = null;
let isSchedulerRunning = false;
let lastRunTime: Date | null = null;
let lastRunStatus: 'success' | 'error' | null = null;
let lastRunError: string | null = null;
let isCheckInProgress = false;
let cooldownUntil: Date | null = null;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCooldownActive(): boolean {
  return cooldownUntil !== null && cooldownUntil.getTime() > Date.now();
}

/**
 * A watch is expired once its inclusive end date has passed, and can never
 * notify again. Watch dates are campground-local while the server runs on UTC,
 * so keep checking for a full day past the end date rather than risk dropping a
 * watch that is still current in the user's own timezone.
 */
function isExpiredWatch(endDate: string, now = new Date()): boolean {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  return endDate < cutoff.toISOString().slice(0, 10);
}

/**
 * Group active, unexpired watch sites by campsiteId + date range to avoid
 * duplicate API calls.
 */
function groupActiveWatchSites(): { groups: SiteGroup[]; expiredWatches: number } {
  const activeWatches = db
    .select()
    .from(schema.watches)
    .where(eq(schema.watches.isActive, true))
    .all();

  const groups = new Map<string, SiteGroup>();
  let expiredWatches = 0;

  for (const watch of activeWatches) {
    if (isExpiredWatch(watch.endDate)) {
      expiredWatches += 1;
      continue;
    }

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
      const groupedSite = groups.get(key);
      if (!groupedSite) {
        continue;
      }

      groupedSite.entries.push({
        watchSiteId: site.id,
        watchId: watch.id,
        userId: watch.userId,
        campsiteId: site.campsiteId,
        campsiteName: site.campsiteName,
        campgroundName: watch.campgroundName,
      });
    }
  }

  return { groups: Array.from(groups.values()), expiredWatches };
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

  if (isCooldownActive()) {
    const activeCooldownUntil = cooldownUntil;
    if (!activeCooldownUntil) {
      return;
    }

    const remainingMs = activeCooldownUntil.getTime() - Date.now();
    lastRunTime = new Date();
    lastRunStatus = 'error';
    lastRunError = `Rate-limit cooldown active for ${Math.ceil(remainingMs / 1000)}s`;
    log.scheduler.warn(
      { cooldownUntil: activeCooldownUntil.toISOString(), remainingMs },
      'Skipping check cycle during rate-limit cooldown',
    );
    logSchedulerEvent({
      eventType: 'rate_limit_cooldown_skip',
      message: 'Check cycle skipped during active rate-limit cooldown',
      metadata: {
        cooldownUntil: activeCooldownUntil.toISOString(),
        remainingMs,
      },
    });
    db.insert(schema.schedulerRuns).values({
      status: 'error',
      errorMessage: lastRunError,
      groupsChecked: 0,
    }).run();
    return;
  }

  isCheckInProgress = true;
  lastRunTime = new Date();
  lastRunStatus = null;
  lastRunError = null;

  try {
    const { groups: allGroups, expiredWatches } = groupActiveWatchSites();
    const groups = MAX_GROUPS_PER_CYCLE > 0
      ? allGroups.slice(0, MAX_GROUPS_PER_CYCLE)
      : allGroups;

    if (expiredWatches > 0) {
      log.scheduler.info({ expiredWatches }, 'Skipping watches past their end date');
      logSchedulerEvent({
        eventType: 'expired_watches_skipped',
        message: 'Skipped watches past their end date',
        metadata: { expiredWatches },
      });
    }

    if (groups.length === 0) {
      log.scheduler.debug('No active watches to check');
      lastRunStatus = 'success';
      db.insert(schema.schedulerRuns).values({
        status: 'success',
        groupsChecked: 0,
      }).run();
      return;
    }

    if (MAX_GROUPS_PER_CYCLE > 0 && allGroups.length > groups.length) {
      log.scheduler.info(
        { totalGroups: allGroups.length, cappedGroups: groups.length },
        'Applying per-cycle group cap',
      );
      logSchedulerEvent({
        eventType: 'cycle_cap_applied',
        message: 'Per-cycle group cap applied',
        metadata: {
          totalGroups: allGroups.length,
          cappedGroups: groups.length,
          maxGroupsPerCycle: MAX_GROUPS_PER_CYCLE,
        },
      });
    }

    log.scheduler.info(
      { groupCount: groups.length, requestDelayMs: REQUEST_DELAY_MS },
      'Starting check cycle',
    );
    logSchedulerEvent({
      eventType: 'check_cycle_started',
      message: 'Starting check cycle',
      metadata: {
        groupCount: groups.length,
        requestDelayMs: REQUEST_DELAY_MS,
      },
    });

    // Collect newly available sites per watch so we can send one notification per watch
    const watchNotifications = new Map<number, {
      userId: string;
      campgroundName: string;
      sites: Array<{ campsiteId: string; campsiteName: string; newlyAvailableDates: string[] }>;
    }>();
    let groupsChecked = 0;
    let cycleErrorMessage: string | null = null;

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

            let watchNotification = watchNotifications.get(entry.watchId);
            if (!watchNotification) {
              watchNotification = {
                userId: entry.userId,
                campgroundName: entry.campgroundName,
                sites: [],
              };
              watchNotifications.set(entry.watchId, watchNotification);
            }

            watchNotification.sites.push({
              campsiteId: entry.campsiteId,
              campsiteName: entry.campsiteName,
              newlyAvailableDates: newlyAvailable,
            });
          }
        }

        groupsChecked += 1;
        await sleep(REQUEST_DELAY_MS);
      } catch (error) {
        if (isRateLimitedError(error)) {
          cooldownUntil = new Date(Date.now() + RATE_LIMIT_COOLDOWN_MS);
          cycleErrorMessage = `Rate limited by availability API; entering cooldown until ${cooldownUntil.toISOString()}`;
          log.scheduler.warn(
            {
              campsiteId: group.campsiteId,
              cooldownMs: RATE_LIMIT_COOLDOWN_MS,
              cooldownUntil: cooldownUntil.toISOString(),
            },
            'Rate limit hit, ending check cycle early',
          );
          logSchedulerEvent({
            eventType: 'rate_limit_cooldown_started',
            message: 'Rate limit hit; ending cycle and entering cooldown',
            metadata: {
              campsiteId: group.campsiteId,
              cooldownMs: RATE_LIMIT_COOLDOWN_MS,
              cooldownUntil: cooldownUntil.toISOString(),
            },
          });
          break;
        }

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

    if (cycleErrorMessage) {
      lastRunStatus = 'error';
      lastRunError = cycleErrorMessage;
      db.insert(schema.schedulerRuns).values({
        status: 'error',
        errorMessage: cycleErrorMessage,
        groupsChecked,
      }).run();
    } else {
      log.scheduler.info('Check cycle complete');
      lastRunStatus = 'success';
      db.insert(schema.schedulerRuns).values({
        status: 'success',
        groupsChecked,
      }).run();
    }
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
    requestDelayMs: REQUEST_DELAY_MS,
    maxGroupsPerCycle: MAX_GROUPS_PER_CYCLE === 0 ? null : MAX_GROUPS_PER_CYCLE,
    cooldownUntil: cooldownUntil?.toISOString() || null,
    lastRunTime: lastRunTime?.toISOString() || null,
    lastRunStatus,
    lastRunError,
  };
}
