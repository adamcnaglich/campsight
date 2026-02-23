import { Router, Request, Response } from 'express';
import axios from 'axios';
import { CampsiteSearchResult } from '@campsight/shared';
import { log } from '../lib/logger';

const router = Router();

const RIDB_BASE = 'https://ridb.recreation.gov/api/v1';
const RECREATION_GOV_SUGGEST = 'https://www.recreation.gov/api/search/suggest';

/** Helper to extract userId set by auth middleware */
function getUserId(req: Request): string {
  return (req as Request & { userId: string }).userId;
}

/**
 * GET /api/campsites/search?q=<query>&facilityId=<optional>
 *
 * Proxies search to the RIDB API. The RIDB API key is required for
 * authenticated access but some endpoints work with limited data.
 * We also support searching by facility ID for campground-level lookups.
 */
router.get('/search', async (req, res: Response) => {
  const userId = getUserId(req);
  const query = req.query.q as string;
  const facilityId = req.query.facilityId as string | undefined;

  if (!query && !facilityId) {
    return res
      .status(400)
      .json({ error: { message: 'Query parameter "q" or "facilityId" is required' } });
  }

  try {
    const apiKey = process.env.RIDB_API_KEY || '';

    let results: CampsiteSearchResult[] = [];

    if (facilityId) {
      // Search campsites within a facility (campground)
      const response = await axios.get(
        `${RIDB_BASE}/facilities/${facilityId}/campsites`,
        {
          headers: { apikey: apiKey },
          params: { limit: 50 },
        }
      );

      results = (response.data.RECDATA || []).map((site: Record<string, unknown>) => ({
        campsiteId: String(site.CampsiteID),
        campsiteName: String(site.CampsiteName || ''),
        campgroundName: String(site.FacilityName || ''),
        facilityId: String(site.FacilityID || facilityId),
        loop: String(site.Loop || ''),
        type: String(site.CampsiteType || ''),
      }));
    } else {
      // Search facilities (campgrounds) by name
      const response = await axios.get(`${RIDB_BASE}/facilities`, {
        headers: { apikey: apiKey },
        params: {
          query,
          limit: 20,
          activity: 'CAMPING',
        },
      });

      // Map facilities to a search-friendly format
      results = (response.data.RECDATA || []).map((facility: Record<string, unknown>) => ({
        campsiteId: '',
        campsiteName: '',
        campgroundName: String(facility.FacilityName || ''),
        facilityId: String(facility.FacilityID || ''),
        loop: '',
        type: 'facility',
      }));
    }

    log.campsites.info(
      { userId, query, facilityId, resultCount: results.length },
      'Campsite search completed',
    );
    res.json({ data: results });
  } catch (error) {
    log.campsites.error({ err: error, userId, query, facilityId }, 'Failed to search campsites');
    res.status(502).json({ error: { message: 'Failed to search campsites' } });
  }
});

/**
 * GET /api/campsites/suggest?q=<query>
 *
 * Proxies to Recreation.gov suggest API for typeahead suggestions.
 */
router.get('/suggest', async (req, res: Response) => {
  const query = req.query.q as string;

  if (!query || !query.trim()) {
    return res.json({
      content_suggestions: [],
      inventory_suggestions: [],
      merchandise_suggestions: null,
      suggestions: [],
    });
  }

  try {
    const response = await axios.get(RECREATION_GOV_SUGGEST, {
      params: { q: query.trim(), geocoder: true },
    });
    res.json(response.data);
  } catch (error) {
    log.campsites.error({ err: error, query }, 'Failed to fetch suggestions');
    res.status(502).json({ error: { message: 'Failed to fetch suggestions' } });
  }
});

export default router;
