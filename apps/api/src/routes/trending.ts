import { Router, Request, Response } from 'express';
import axios from 'axios';
import { log } from '../lib/logger';

const router = Router();

const RECREATION_GOV_SEARCH = 'https://www.recreation.gov/api/search';
const IP_API_BASE = 'http://ip-api.com/json';
const DEFAULT_COORDS = { lat: 39.8283, lng: -98.5795 }; // geographic center of US

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }
  return req.socket.remoteAddress ?? '';
}

function isLocalIp(ip: string): boolean {
  return (
    !ip ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  );
}

async function coordsFromIp(ip: string): Promise<{ lat: number; lng: number; source: string }> {
  if (isLocalIp(ip)) {
    log.trending.debug({ ip }, 'Local IP detected, using default coords');
    return { ...DEFAULT_COORDS, source: 'default:local-ip' };
  }
  const cleanIp = ip.replace(/^::ffff:/, '');
  try {
    const response = await axios.get<{
      status: 'success' | 'fail';
      message?: string;
      lat?: number;
      lon?: number;
    }>(`${IP_API_BASE}/${cleanIp}`, { timeout: 3000 });

    const { data } = response;

    if (data.status === 'fail') {
      log.trending.warn({ ip: cleanIp, message: data.message }, 'ip-api.com returned a failure response');
      return { ...DEFAULT_COORDS, source: 'default:ip-api-error' };
    }

    if (data.lat && data.lon) {
      log.trending.debug({ ip: cleanIp, lat: data.lat, lng: data.lon }, 'IP geolocation resolved');
      return { lat: data.lat, lng: data.lon, source: 'ip-api' };
    }

    log.trending.warn({ ip: cleanIp, data }, 'ip-api.com returned no coordinates');
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 429) {
        log.trending.error({ ip: cleanIp, status }, 'ip-api.com rate limit hit (429) — falling back to default coords');
      } else if (err.code === 'ECONNABORTED') {
        log.trending.warn({ ip: cleanIp }, 'ip-api.com request timed out — falling back to default coords');
      } else {
        log.trending.warn({ ip: cleanIp, status, code: err.code, message: err.message }, 'ip-api.com request failed — falling back to default coords');
      }
    } else {
      log.trending.warn({ ip: cleanIp, err }, 'Unexpected error during IP geolocation — falling back to default coords');
    }
  }
  return { ...DEFAULT_COORDS, source: 'default:fallback' };
}

function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}T00:00:00.000Z`;
}

function getNextWeekendDates(): { start_date: string; end_date: string } {
  const now = new Date();
  const daysUntilFriday = ((5 - now.getDay() + 7) % 7) || 7;

  const start = new Date(now);
  start.setDate(now.getDate() + daysUntilFriday);

  const end = new Date(start);
  end.setDate(start.getDate() + 2);

  return {
    start_date: toDateString(start.getFullYear(), start.getMonth(), start.getDate()),
    end_date: toDateString(end.getFullYear(), end.getMonth(), end.getDate()),
  };
}

/**
 * GET /api/trending
 *
 * Returns available campgrounds near the requester's location (resolved
 * from their IP address) for the upcoming weekend via Recreation.gov.
 */
router.get('/', async (req: Request, res: Response) => {
  // Prevent ETags / 304s — each request is IP-specific and must never be served from cache
  res.set('Cache-Control', 'no-store');

  const ip = getClientIp(req);
  log.trending.debug({ ip, forwardedFor: req.headers['x-forwarded-for'] }, 'Trending request received');

  try {
    const { lat, lng, source: geoSource } = await coordsFromIp(ip);
    const { start_date, end_date } = getNextWeekendDates();

    const params = new URLSearchParams({
      start_date,
      end_date,
      sort: 'available',
      size: '10',
      start: '0',
      radius: '500',
      include_partially_available: 'false',
      include_notreservable: 'false',
      include_unavailable: 'false',
      lat: String(lat),
      lng: String(lng),
    });
    params.append('fq', 'campsite_type_of_use:Overnight');
    params.append('fq', 'campsite_type_of_use:na');
    params.append('fq', 'entity_type:campground');

    const { data } = await axios.get<{ results?: unknown[]; total?: number }>(
      `${RECREATION_GOV_SEARCH}?${params.toString()}`,
      { timeout: 8000 },
    );

    log.trending.info({ ip, lat, lng, geoSource, total: data.total }, 'Trending campgrounds fetched');
    res.json({ data: data.results ?? [] });
  } catch (error) {
    log.trending.error({ err: error, ip }, 'Failed to fetch trending campgrounds');
    res.status(502).json({ error: { message: 'Failed to fetch trending campgrounds' } });
  }
});

export default router;
