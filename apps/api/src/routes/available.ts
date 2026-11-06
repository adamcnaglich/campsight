import { Router, Request, Response } from 'express';
import axios from 'axios';
import { log } from '../lib/logger';
import { getClientIp } from '../middleware/auth';

const router = Router();

const RECREATION_GOV_SEARCH = 'https://www.recreation.gov/api/search';
const IP_API_BASE = 'http://ip-api.com/json';
const DEFAULT_COORDS = { lat: 42.3297, lng: -83.0425 };
// Region used when the client IP cannot be geolocated. On a LAN that is every
// request, so this is effectively the home region for the "near you" strip.
const HOME_REGION = (process.env.HOME_REGION || 'Michigan').trim();

function isLocalIp(rawIp: string): boolean {
  const ip = rawIp.replace(/^::ffff:/, '');
  return (
    !ip ||
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    // 172.16.0.0/12, which includes Docker's bridge networks
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

interface GeoResult {
  lat: number;
  lng: number;
  regionName: string;
  source: string;
}

const DEFAULT_GEO: Omit<GeoResult, 'source'> = {
  lat: DEFAULT_COORDS.lat,
  lng: DEFAULT_COORDS.lng,
  regionName: HOME_REGION,
};

async function geoFromIp(ip: string): Promise<GeoResult> {
  if (isLocalIp(ip)) {
    log.available.debug({ ip }, 'Local IP detected, using default coords');
    return { ...DEFAULT_GEO, source: 'default:local-ip' };
  }
  const cleanIp = ip.replace(/^::ffff:/, '');
  try {
    const response = await axios.get<{
      status: 'success' | 'fail';
      message?: string;
      lat?: number;
      lon?: number;
      regionName?: string;
    }>(`${IP_API_BASE}/${cleanIp}`, { timeout: 3000 });

    const { data } = response;

    if (data.status === 'fail') {
      log.available.warn(
        { ip: cleanIp, message: data.message },
        'ip-api.com returned a failure response',
      );
      return { ...DEFAULT_GEO, source: 'default:ip-api-error' };
    }

    if (data.lat && data.lon && data.regionName) {
      log.available.debug(
        {
          ip: cleanIp,
          lat: data.lat,
          lng: data.lon,
          regionName: data.regionName,
        },
        'IP geolocation resolved',
      );
      return {
        lat: data.lat,
        lng: data.lon,
        regionName: data.regionName,
        source: 'ip-api',
      };
    }

    log.available.warn(
      { ip: cleanIp, data },
      'ip-api.com returned incomplete data',
    );
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 429) {
        log.available.error(
          { ip: cleanIp, status },
          'ip-api.com rate limit hit (429) — falling back to default coords',
        );
      } else if (err.code === 'ECONNABORTED') {
        log.available.warn(
          { ip: cleanIp },
          'ip-api.com request timed out — falling back to default coords',
        );
      } else {
        log.available.warn(
          { ip: cleanIp, status, code: err.code, message: err.message },
          'ip-api.com request failed — falling back to default coords',
        );
      }
    } else {
      log.available.warn(
        { ip: cleanIp, err },
        'Unexpected error during IP geolocation — falling back to default coords',
      );
    }
  }
  return { ...DEFAULT_GEO, source: 'default:fallback' };
}

function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}T00:00:00.000Z`;
}

function getUpcomingMonthDates(): { start_date: string; end_date: string } {
  const now = new Date();

  const end = new Date(now);
  end.setDate(now.getDate() + 30);

  return {
    start_date: toDateString(now.getFullYear(), now.getMonth(), now.getDate()),
    end_date: toDateString(end.getFullYear(), end.getMonth(), end.getDate()),
  };
}

/**
 * GET /api/available
 *
 * Returns available campgrounds near the requester's location (resolved
 * from their IP address) for the upcoming month via Recreation.gov.
 */
router.get('/', async (req: Request, res: Response) => {
  // Prevent ETags / 304s — each request is IP-specific and must never be served from cache
  res.set('Cache-Control', 'no-store');

  const ip = getClientIp(req);
  log.available.debug(
    { ip, forwardedFor: req.headers['x-forwarded-for'] },
    'Available request received',
  );

  try {
    const { lat, lng, regionName, source: geoSource } = await geoFromIp(ip);
    const { start_date, end_date } = getUpcomingMonthDates();

    const params = new URLSearchParams({
      start_date,
      end_date,
      sort: 'available',
      size: '9',
      start: '0',
      include_partially_available: 'true',
      include_notreservable: 'false',
      include_unavailable: 'false',
      location: regionName,
    });
    params.append('fq', 'campsite_type_of_use:Overnight');
    params.append('fq', 'campsite_type_of_use:na');
    params.append('fq', 'entity_type:campground');

    log.available.debug(
      { url: `${RECREATION_GOV_SEARCH}?${params.toString()}` },
      'Recreation.gov search URL',
    );

    const { data } = await axios.get<{ results?: unknown[]; total?: number }>(
      `${RECREATION_GOV_SEARCH}?${params.toString()}`,
      { timeout: 8000 },
    );

    log.available.info(
      { ip, lat, lng, regionName, geoSource, total: data.total },
      'Available campgrounds fetched',
    );
    res.json({ data: data.results ?? [] });
  } catch (error) {
    log.available.error(
      { err: error, ip },
      'Failed to fetch available campgrounds',
    );
    res
      .status(502)
      .json({ error: { message: 'Failed to fetch available campgrounds' } });
  }
});

export default router;
