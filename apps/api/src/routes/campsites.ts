import { Router, Response } from 'express';
import axios from 'axios';
import { CampsiteSearchResult } from '@campsight/shared';

const router = Router();

const RIDB_BASE = 'https://ridb.recreation.gov/api/v1';

/**
 * GET /api/campsites/search?q=<query>&facilityId=<optional>
 *
 * Proxies search to the RIDB API. The RIDB API key is required for
 * authenticated access but some endpoints work with limited data.
 * We also support searching by facility ID for campground-level lookups.
 */
router.get('/search', async (req, res: Response) => {
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

    res.json({ data: results });
  } catch (error) {
    console.error('[CAMPSITES] Search error:', error);
    res.status(502).json({ error: { message: 'Failed to search campsites' } });
  }
});

export default router;
