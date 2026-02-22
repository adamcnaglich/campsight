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

interface WatchGroup {
  campsiteId: string;
  startDate: string;
  endDate: string;
  watches: Array<{
    id: number;
    userId: string;
    campsiteName: string;
    campgroundName: string;
  }>;
}

/**
 * Group active watches by campsiteId + date range to avoid duplicate API calls.
 */
function groupActiveWatches(): WatchGroup[] {
  const activeWatches = db
    .select()
    .from(schema.watches)
    .where(eq(schema.watches.isActive, true))
    .all();

  const groups = new Map<string, WatchGroup>();

  for (const watch of activeWatches) {
    const key = `${watch.campsiteId}:${watch.startDate}:${watch.endDate}`;
    if (!groups.has(key)) {
      groups.set(key, {
        campsiteId: watch.campsiteId,
        startDate: watch.startDate,
        endDate: watch.endDate,
        watches: [],
      });
    }
    groups.get(key)!.watches.push({
      id: watch.id,
      userId: watch.userId,
      campsiteName: watch.campsiteName,
      campgroundName: watch.campgroundName,
    });
  }

  return Array.from(groups.values());
}

/**
 * Get the latest availability snapshot for a watch as a map.
 */
function getLatestSnapshot(watchId: number): AvailabilityMap {
  const snapshots = db
    .select()
    .from(schema.availabilitySnapshots)
    .where(eq(schema.availabilitySnapshots.watchId, watchId))
    .all();

  // Keep latest per date
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
 * Store new availability data as snapshots.
 */
function storeSnapshots(watchId: number, availability: AvailabilityMap) {
  const now = new Date().toISOString();
  const values = Object.entries(availability).map(([date, status]) => ({
    watchId,
    date,
    status,
    capturedAt: now,
  }));

  if (values.length > 0) {
    // Delete old snapshots for this watch and insert fresh ones
    db.delete(schema.availabilitySnapshots)
      .where(eq(schema.availabilitySnapshots.watchId, watchId))
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
    const groups = groupActiveWatches();

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

    for (const group of groups) {
      try {
        const currentAvailability = await fetchAvailability(
          group.campsiteId,
          group.startDate,
          group.endDate
        );

        for (const watch of group.watches) {
          const previousAvailability = getLatestSnapshot(watch.id);
          const newlyAvailable = diffAvailability(
            previousAvailability,
            currentAvailability
          );

          // Store fresh snapshot
          storeSnapshots(watch.id, currentAvailability);

          // Notify if new dates became available
          if (newlyAvailable.length > 0) {
            log.scheduler.info(
              { watchId: watch.id, userId: watch.userId, newDates: newlyAvailable.length },
              'New availability detected',
            );
            await sendAvailabilityNotification({
              userId: watch.userId,
              watchId: watch.id,
              campsiteId: group.campsiteId,
              campsiteName: watch.campsiteName,
              campgroundName: watch.campgroundName,
              newlyAvailableDates: newlyAvailable,
            });
          }
        }

        // Small delay between API calls to be respectful
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        log.scheduler.error(
          { err: error, campsiteId: group.campsiteId },
          'Error checking campsite availability',
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
