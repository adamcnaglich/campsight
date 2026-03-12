import { Router, Request, Response } from 'express';
import axios from 'axios';
import {
  SuggestionResult,
  CampgroundSearchResult,
  CampsiteSearchResult,
  FacilityDetail,
} from '@campsight/shared';
import { log } from '../lib/logger';

const router = Router();

const RECREATION_GOV_BASE = 'https://www.recreation.gov/api';
const RIDB_BASE = 'https://ridb.recreation.gov/api/v1';

function getUserId(req: Request): string {
  return (req as Request & { userId: string }).userId;
}

// ─── Suggest ────────────────────────────────────────────────────────────────────

router.get('/suggest', async (req, res: Response) => {
  const query = req.query.q as string;

  if (!query || !query.trim()) {
    return res.json({ data: [] });
  }

  try {
    const trimmed = query.trim();

    const searchParams = new URLSearchParams();
    searchParams.set('q', trimmed);
    searchParams.append('fq', 'entity_type:campground');
    searchParams.append('fq', 'entity_type:recarea');
    searchParams.set('size', '5');
    searchParams.set('sort', 'score');

    const [suggestRes, searchRes] = await Promise.all([
      axios.get(`${RECREATION_GOV_BASE}/search/suggest`, {
        params: { q: trimmed, geocoder: true },
      }),
      axios
        .get(`${RECREATION_GOV_BASE}/search?${searchParams.toString()}`)
        .catch(() => null),
    ]);

    const inventory: Record<string, unknown>[] =
      suggestRes.data?.inventory_suggestions ?? [];

    const inventoryResults: SuggestionResult[] = inventory
      .filter(
        (s) => s.entity_type === 'recarea' || s.entity_type === 'campground',
      )
      .map((s) => ({
        entityType: String(s.entity_type) as 'recarea' | 'campground',
        entityId: String(s.entity_id),
        name: String(s.name ?? ''),
        stateCode: String(s.state_code ?? ''),
      }));

    const searchRaw: Record<string, unknown>[] = searchRes?.data?.results ?? [];

    const searchResults: SuggestionResult[] = searchRaw
      .filter(
        (s) => s.entity_type === 'campground' || s.entity_type === 'recarea',
      )
      .map((s) => ({
        entityType: String(s.entity_type) as 'recarea' | 'campground',
        entityId: String(s.entity_id),
        name: String(s.name ?? ''),
        stateCode: String(s.state_code ?? ''),
        city: s.city ? String(s.city) : undefined,
      }));

    const seen = new Set(inventoryResults.map((r) => r.entityId));
    const merged = [...inventoryResults];
    for (const r of searchResults) {
      if (!seen.has(r.entityId)) {
        seen.add(r.entityId);
        merged.push(r);
      }
    }

    res.json({ data: merged.slice(0, 10) });
  } catch (error) {
    log.campsites.error({ err: error, query }, 'Failed to fetch suggestions');
    res.status(502).json({ error: { message: 'Failed to fetch suggestions' } });
  }
});

// ─── Facility Detail (RIDB) ──────────────────────────────────────────────────

router.get('/facility/:facilityId', async (req, res: Response) => {
  const { facilityId } = req.params;
  const apiKey = process.env.RIDB_API_KEY;

  if (!apiKey) {
    log.campsites.error('RIDB_API_KEY is not configured');
    return res
      .status(500)
      .json({ error: { message: 'RIDB API key not configured' } });
  }

  try {
    const response = await axios.get(`${RIDB_BASE}/facilities/${facilityId}`, {
      headers: { apikey: apiKey },
    });

    const data = response.data as Record<string, unknown>;
    const parentRecAreaId = String(data.ParentRecAreaID ?? '');

    let parentRecAreaName = '';
    if (parentRecAreaId) {
      try {
        const recAreaResponse = await axios.get(
          `${RIDB_BASE}/recareas/${parentRecAreaId}`,
          { headers: { apikey: apiKey } },
        );
        parentRecAreaName = String(
          (recAreaResponse.data as Record<string, unknown>).RecAreaName ?? '',
        );
      } catch {
        log.campsites.warn(
          { facilityId, parentRecAreaId },
          'Failed to fetch parent rec area name',
        );
      }
    }

    const result: FacilityDetail = {
      facilityId: String(data.FacilityID ?? facilityId),
      facilityName: String(data.FacilityName ?? ''),
      parentRecAreaId,
      parentRecAreaName,
    };

    log.campsites.info(
      { facilityId, parentRecAreaId, parentRecAreaName },
      'Facility detail fetched',
    );
    res.json({ data: result });
  } catch (error) {
    log.campsites.error(
      { err: error, facilityId },
      'Failed to fetch facility detail',
    );
    res
      .status(502)
      .json({ error: { message: 'Failed to fetch facility detail' } });
  }
});

// ─── Search ─────────────────────────────────────────────────────────────────────

router.get('/search', async (req, res: Response) => {
  const userId = getUserId(req);
  const recAreaId = req.query.recAreaId as string | undefined;
  const facilityId = req.query.facilityId as string | undefined;

  if (!recAreaId && !facilityId) {
    return res.status(400).json({
      error: {
        message: 'Query parameter "recAreaId" or "facilityId" is required',
      },
    });
  }

  try {
    if (facilityId) {
      const params = new URLSearchParams({
        start: '0',
        size: '1000',
        include_non_site_specific_campsites: 'true',
      });
      params.append('fq', `asset_id:${facilityId}`);

      const response = await axios.get(
        `${RECREATION_GOV_BASE}/search/campsites?${params.toString()}`,
      );

      const raw: Record<string, unknown>[] = response.data?.campsites ?? [];

      const results: CampsiteSearchResult[] = raw.map((site) => {
        const attrs = (site.attributes ?? []) as Array<{
          attribute_name: string;
          attribute_value: string;
        }>;

        const maxPeople = attrs.find(
          (a) => a.attribute_name === 'Max Num of People',
        );
        const maxVehicle = attrs.find(
          (a) => a.attribute_name === 'Max Num of Vehicles',
        );

        return {
          campsiteId: String(site.campsite_id ?? ''),
          name: String(site.name ?? ''),
          loop: String(site.loop ?? ''),
          type: String(site.type ?? ''),
          typeOfUse: String(site.type_of_use ?? ''),
          previewImageUrl: String(site.preview_image_url ?? ''),
          latitude: String(site.latitude ?? ''),
          longitude: String(site.longitude ?? ''),
          maxOccupants: maxPeople ? Number(maxPeople.attribute_value) : null,
          maxVehicles: maxVehicle ? Number(maxVehicle.attribute_value) : null,
          facilityId: String(site.asset_id ?? facilityId),
          campgroundName: String(site.asset_name ?? ''),
        };
      });

      log.campsites.info(
        { userId, facilityId, resultCount: results.length },
        'Campsite search completed',
      );
      res.json({ data: results });
    } else {
      const params = new URLSearchParams({
        size: '1000',
        sort: 'score',
      });
      params.append('fq', `parent_asset_id:${recAreaId}`);
      params.append('fq', 'entity_type:campground');
      params.append('fq', 'campsite_type_of_use:Overnight');
      params.append('fq', 'campsite_type_of_use:Day');
      params.append('fq', 'campsite_type_of_use:na');

      const searchUrl = `${RECREATION_GOV_BASE}/search?${params.toString()}`;
      console.log('[RecGov API]', searchUrl);
      const response = await axios.get(searchUrl);

      const raw: Record<string, unknown>[] = response.data?.results ?? [];

      const results: CampgroundSearchResult[] = raw.map((facility) => ({
        entityId: String(facility.entity_id ?? ''),
        name: String(facility.name ?? ''),
        city: String(facility.city ?? ''),
        stateCode: String(facility.state_code ?? ''),
        previewImageUrl: String(facility.preview_image_url ?? ''),
        latitude: String(facility.latitude ?? ''),
        longitude: String(facility.longitude ?? ''),
        averageRating:
          facility.average_rating != null
            ? Number(facility.average_rating)
            : null,
        numberOfRatings: Number(facility.number_of_ratings ?? 0),
      }));

      log.campsites.info(
        { userId, recAreaId, resultCount: results.length },
        'Campground search completed',
      );
      res.json({ data: results });
    }
  } catch (error) {
    log.campsites.error(
      { err: error, userId, recAreaId, facilityId },
      'Failed to search',
    );
    res.status(502).json({ error: { message: 'Failed to search' } });
  }
});

export default router;
