import { Router, Request, Response } from 'express';
import axios from 'axios';
import { log } from '../lib/logger';

const router = Router();

const RECREATION_GOV_SEARCH = 'https://www.recreation.gov/api/search';
const IPAPI_BASE = 'https://ipapi.co';
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

async function coordsFromIp(ip: string): Promise<{ lat: number; lng: number }> {
  if (isLocalIp(ip)) {
    return DEFAULT_COORDS;
  }
  const cleanIp = ip.replace(/^::ffff:/, '');
  try {
    const { data } = await axios.get<{ latitude?: number; longitude?: number }>(
      `${IPAPI_BASE}/${cleanIp}/json/`,
      { timeout: 3000 },
    );
    if (data.latitude && data.longitude) {
      return { lat: data.latitude, lng: data.longitude };
    }
  } catch {
    // fall through
  }
  return DEFAULT_COORDS;
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
  const ip = getClientIp(req);

  try {
    const { lat, lng } = await coordsFromIp(ip);
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

    log.trending.info({ ip, lat, lng, total: data.total }, 'Trending campgrounds fetched');
    res.json({ data: data.results ?? [] });
  } catch (error) {
    log.trending.error({ err: error, ip }, 'Failed to fetch trending campgrounds');
    res.status(502).json({ error: { message: 'Failed to fetch trending campgrounds' } });
  }
});

export default router;
