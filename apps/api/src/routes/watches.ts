import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { createWatchSchema, updateWatchSchema } from '@campsight/shared';
import { log } from '../lib/logger';

const router = Router();

/** Helper to extract userId set by auth middleware */
function getUserId(req: Request): string {
  return (req as Request & { userId: string }).userId;
}

/** Build a Watch response object with its sites array */
function buildWatchResponse(watchRow: typeof schema.watches.$inferSelect) {
  const sites = db
    .select()
    .from(schema.watchSites)
    .where(eq(schema.watchSites.watchId, watchRow.id))
    .all();

  return {
    id: watchRow.id,
    userId: watchRow.userId,
    campgroundName: watchRow.campgroundName,
    recAreaName: watchRow.recAreaName,
    imageUrl: watchRow.imageUrl,
    sites: sites.map((s) => ({
      id: s.id,
      campsiteId: s.campsiteId,
      campsiteName: s.campsiteName,
      loop: s.loop,
    })),
    startDate: watchRow.startDate,
    endDate: watchRow.endDate,
    isActive: Boolean(watchRow.isActive),
    createdAt: watchRow.createdAt,
  };
}

/**
 * GET /api/watches — List all watches for the authenticated user
 */
router.get('/', async (req, res: Response) => {
  const userId = getUserId(req);

  try {
    const rows = db
      .select()
      .from(schema.watches)
      .where(eq(schema.watches.userId, userId))
      .orderBy(desc(schema.watches.createdAt))
      .all();

    const data = rows.map(buildWatchResponse);

    log.watches.debug({ userId, count: data.length }, 'Listed watches');
    res.json({ data });
  } catch (error) {
    log.watches.error({ err: error, userId }, 'Failed to list watches');
    res.status(500).json({ error: { message: 'Failed to list watches' } });
  }
});

/**
 * POST /api/watches — Create a new watch with one or more sites
 */
router.post('/', async (req, res: Response) => {
  const userId = getUserId(req);

  const parsed = createWatchSchema.safeParse(req.body);
  if (!parsed.success) {
    log.watches.warn({ userId, errors: parsed.error?.issues }, 'Watch validation failed');
    return res.status(400).json({
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
    });
  }

  try {
    const { sites, ...watchData } = parsed.data;

    const watchRow = db
      .insert(schema.watches)
      .values({
        userId,
        campgroundName: watchData.campgroundName,
        recAreaName: watchData.recAreaName || null,
        imageUrl: watchData.imageUrl || null,
        startDate: watchData.startDate,
        endDate: watchData.endDate,
      })
      .returning()
      .get();

    for (const site of sites) {
      db.insert(schema.watchSites)
        .values({
          watchId: watchRow.id,
          campsiteId: site.campsiteId,
          campsiteName: site.campsiteName,
          loop: site.loop || null,
        })
        .run();
    }

    const result = buildWatchResponse(watchRow);

    log.watches.info(
      { userId, watchId: result.id, siteCount: sites.length, campgroundName: result.campgroundName },
      'Watch created',
    );
    res.status(201).json({ data: result });
  } catch (error) {
    log.watches.error({ err: error, userId }, 'Failed to create watch');
    res.status(500).json({ error: { message: 'Failed to create watch' } });
  }
});

/**
 * PATCH /api/watches/:id — Update a watch (toggle active, change dates)
 */
router.patch('/:id', async (req, res: Response) => {
  const userId = getUserId(req);
  const watchId = parseInt(req.params.id, 10);

  if (isNaN(watchId)) {
    return res.status(400).json({ error: { message: 'Invalid watch ID' } });
  }

  const parsed = updateWatchSchema.safeParse(req.body);
  if (!parsed.success) {
    log.watches.warn({ userId, watchId, errors: parsed.error?.issues }, 'Watch update validation failed');
    return res.status(400).json({
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
    });
  }

  try {
    const existing = db
      .select()
      .from(schema.watches)
      .where(and(eq(schema.watches.id, watchId), eq(schema.watches.userId, userId)))
      .get();

    if (!existing) {
      log.watches.warn({ userId, watchId }, 'Watch not found or not owned by user');
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    const updatedRow = db
      .update(schema.watches)
      .set(parsed.data)
      .where(eq(schema.watches.id, watchId))
      .returning()
      .get();

    const result = buildWatchResponse(updatedRow);

    log.watches.info({ userId, watchId, changes: parsed.data }, 'Watch updated');
    res.json({ data: result });
  } catch (error) {
    log.watches.error({ err: error, userId, watchId }, 'Failed to update watch');
    res.status(500).json({ error: { message: 'Failed to update watch' } });
  }
});

/**
 * DELETE /api/watches/:id — Delete a watch
 */
router.delete('/:id', async (req, res: Response) => {
  const userId = getUserId(req);
  const watchId = parseInt(req.params.id, 10);

  if (isNaN(watchId)) {
    return res.status(400).json({ error: { message: 'Invalid watch ID' } });
  }

  try {
    const existing = db
      .select()
      .from(schema.watches)
      .where(and(eq(schema.watches.id, watchId), eq(schema.watches.userId, userId)))
      .get();

    if (!existing) {
      log.watches.warn({ userId, watchId }, 'Delete attempted on non-existent or unowned watch');
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    db.delete(schema.watches).where(eq(schema.watches.id, watchId)).run();

    log.watches.info(
      { userId, watchId, campgroundName: existing.campgroundName },
      'Watch deleted',
    );
    res.json({ data: { success: true } });
  } catch (error) {
    log.watches.error({ err: error, userId, watchId }, 'Failed to delete watch');
    res.status(500).json({ error: { message: 'Failed to delete watch' } });
  }
});

/**
 * GET /api/watches/:id/availability — Latest availability for a watch, grouped by site
 */
router.get('/:id/availability', async (req, res: Response) => {
  const userId = getUserId(req);
  const watchId = parseInt(req.params.id, 10);

  if (isNaN(watchId)) {
    return res.status(400).json({ error: { message: 'Invalid watch ID' } });
  }

  try {
    const watchRow = db
      .select()
      .from(schema.watches)
      .where(and(eq(schema.watches.id, watchId), eq(schema.watches.userId, userId)))
      .get();

    if (!watchRow) {
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    const watch = buildWatchResponse(watchRow);

    const siteIds = watch.sites.map((s) => s.id);

    // Build availability per site
    const siteAvailability: Record<number, { campsiteId: string; campsiteName: string; availability: Record<string, string> }> = {};

    if (siteIds.length > 0) {
      const snapshots = db
        .select()
        .from(schema.availabilitySnapshots)
        .where(inArray(schema.availabilitySnapshots.watchSiteId, siteIds))
        .orderBy(desc(schema.availabilitySnapshots.capturedAt))
        .all();

      for (const site of watch.sites) {
        const siteSnaps = snapshots.filter((s) => s.watchSiteId === site.id);
        const latestByDate: Record<string, string> = {};
        for (const snap of siteSnaps) {
          if (!latestByDate[snap.date]) {
            latestByDate[snap.date] = snap.status;
          }
        }
        siteAvailability[site.id] = {
          campsiteId: site.campsiteId,
          campsiteName: site.campsiteName,
          availability: latestByDate,
        };
      }
    }

    log.watches.debug(
      { userId, watchId, siteCount: siteIds.length },
      'Fetched availability',
    );
    res.json({
      data: {
        watch,
        siteAvailability,
      },
    });
  } catch (error) {
    log.watches.error({ err: error, userId, watchId }, 'Failed to get availability');
    res
      .status(500)
      .json({ error: { message: 'Failed to get availability' } });
  }
});

export default router;
