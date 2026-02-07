import cron from 'node-cron';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { fetchAvailability, diffAvailability } from './availability';
import { sendAvailabilityNotification } from './notification';
import { AvailabilityMap } from '@campsight/shared';

const CRON_SCHEDULE = process.env.CHECK_INTERVAL || '*/15 * * * *'; // every 15 min

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
  const groups = groupActiveWatches();

  if (groups.length === 0) {
    console.log('[SCHEDULER] No active watches to check');
    return;
  }

  console.log(`[SCHEDULER] Checking ${groups.length} campsite group(s)...`);

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
          console.log(
            `[SCHEDULER] Watch ${watch.id}: ${newlyAvailable.length} new date(s) available`
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
      console.error(
        `[SCHEDULER] Error checking campsite ${group.campsiteId}:`,
        error
      );
    }
  }

  console.log('[SCHEDULER] Check cycle complete');
}

/**
 * Start the cron scheduler. Abstracted so it can be swapped for BullMQ later.
 */
export function startScheduler() {
  console.log(`[SCHEDULER] Starting with schedule: ${CRON_SCHEDULE}`);

  cron.schedule(CRON_SCHEDULE, () => {
    console.log(`[SCHEDULER] Running check at ${new Date().toISOString()}`);
    runCheck().catch((err) =>
      console.error('[SCHEDULER] Unhandled error in check cycle:', err)
    );
  });

  // Also run once on startup (after a short delay to let everything initialize)
  setTimeout(() => {
    console.log('[SCHEDULER] Running initial check...');
    runCheck().catch((err) =>
      console.error('[SCHEDULER] Initial check error:', err)
    );
  }, 5000);
}
