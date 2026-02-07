import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { createWatchSchema, updateWatchSchema } from '@campsight/shared';

const router = Router();

/** Helper to extract userId set by auth middleware */
function getUserId(req: Request): string {
  return (req as Request & { userId: string }).userId;
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

    const data = rows.map((r) => ({
      ...r,
      isActive: Boolean(r.isActive),
    }));

    res.json({ data });
  } catch (error) {
    console.error('[WATCHES] List error:', error);
    res.status(500).json({ error: { message: 'Failed to list watches' } });
  }
});

/**
 * POST /api/watches — Create a new watch
 */
router.post('/', async (req, res: Response) => {
  const userId = getUserId(req);

  const parsed = createWatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
    });
  }

  try {
    const result = db
      .insert(schema.watches)
      .values({
        userId,
        ...parsed.data,
      })
      .returning()
      .get();

    res.status(201).json({ data: { ...result, isActive: Boolean(result.isActive) } });
  } catch (error) {
    console.error('[WATCHES] Create error:', error);
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
    return res.status(400).json({
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
    });
  }

  try {
    // Verify ownership
    const existing = db
      .select()
      .from(schema.watches)
      .where(and(eq(schema.watches.id, watchId), eq(schema.watches.userId, userId)))
      .get();

    if (!existing) {
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    const result = db
      .update(schema.watches)
      .set(parsed.data)
      .where(eq(schema.watches.id, watchId))
      .returning()
      .get();

    res.json({ data: { ...result, isActive: Boolean(result.isActive) } });
  } catch (error) {
    console.error('[WATCHES] Update error:', error);
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
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    db.delete(schema.watches).where(eq(schema.watches.id, watchId)).run();

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('[WATCHES] Delete error:', error);
    res.status(500).json({ error: { message: 'Failed to delete watch' } });
  }
});

/**
 * GET /api/watches/:id/availability — Latest availability for a watch
 */
router.get('/:id/availability', async (req, res: Response) => {
  const userId = getUserId(req);
  const watchId = parseInt(req.params.id, 10);

  if (isNaN(watchId)) {
    return res.status(400).json({ error: { message: 'Invalid watch ID' } });
  }

  try {
    // Verify ownership
    const watch = db
      .select()
      .from(schema.watches)
      .where(and(eq(schema.watches.id, watchId), eq(schema.watches.userId, userId)))
      .get();

    if (!watch) {
      return res.status(404).json({ error: { message: 'Watch not found' } });
    }

    // Get most recent snapshot for each date
    const snapshots = db
      .select()
      .from(schema.availabilitySnapshots)
      .where(eq(schema.availabilitySnapshots.watchId, watchId))
      .orderBy(desc(schema.availabilitySnapshots.capturedAt))
      .all();

    // Deduplicate: keep only latest per date
    const latestByDate = new Map<string, typeof snapshots[0]>();
    for (const snap of snapshots) {
      if (!latestByDate.has(snap.date)) {
        latestByDate.set(snap.date, snap);
      }
    }

    res.json({
      data: {
        watch: { ...watch, isActive: Boolean(watch.isActive) },
        availability: Object.fromEntries(
          Array.from(latestByDate.entries()).map(([date, snap]) => [date, snap.status])
        ),
        snapshots: Array.from(latestByDate.values()),
      },
    });
  } catch (error) {
    console.error('[WATCHES] Availability error:', error);
    res
      .status(500)
      .json({ error: { message: 'Failed to get availability' } });
  }
});

export default router;
