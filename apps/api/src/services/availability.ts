import axios from 'axios';
import { AvailabilityMap } from '@campsight/shared';
import { log } from '../lib/logger';
import { logSchedulerEvent } from './scheduler-events';

const AVAILABILITY_API =
  'https://www.recreation.gov/api/camps/availability/campsite';
const REQUEST_TIMEOUT_MS = Number(process.env.AVAILABILITY_REQUEST_TIMEOUT_MS || 15000);
const MAX_RETRIES = Number(process.env.AVAILABILITY_MAX_RETRIES || 3);
const BACKOFF_BASE_MS = Number(process.env.AVAILABILITY_BACKOFF_BASE_MS || 1000);
const BACKOFF_MAX_MS = Number(process.env.AVAILABILITY_BACKOFF_MAX_MS || 30000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHttpStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.status;
}

function parseRetryAfterMs(value: string | number | undefined): number | null {
  if (value === undefined) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value * 1000);
  }

  if (typeof value === 'string') {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
      return Math.max(0, seconds * 1000);
    }

    const dateMs = Date.parse(value);
    if (!Number.isNaN(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }
  }

  return null;
}

function getRetryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  return parseRetryAfterMs(error.response?.headers?.['retry-after']);
}

function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  // Network-level failures and timeouts can be transient.
  if (!status) {
    return true;
  }

  return false;
}

export function isRateLimitedError(error: unknown): boolean {
  return getHttpStatus(error) === 429;
}

/**
 * Fetch availability data for a campsite from recreation.gov.
 * Returns a map of ISO date strings to availability status strings.
 */
export async function fetchAvailability(
  campsiteId: string,
  startDate: string,
  endDate: string
): Promise<AvailabilityMap> {
  const url = `${AVAILABILITY_API}/${campsiteId}`;
  const maxRetries = Math.max(0, MAX_RETRIES);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        params: {
          start_date: `${startDate}T00:00:00Z`,
          end_date: `${endDate}T00:00:00Z`,
        },
        headers: {
          'User-Agent': 'CampSight/1.0',
        },
        timeout: REQUEST_TIMEOUT_MS,
      });

      return response.data?.availability?.availabilities || {};
    } catch (error) {
      const status = getHttpStatus(error);
      const isRetryable = isRetryableError(error);
      const hasMoreAttempts = attempt < maxRetries;

      if (!isRetryable || !hasMoreAttempts) {
        throw error;
      }

      const retryAfterMs = status === 429 ? getRetryAfterMs(error) : null;
      const exponentialBackoffMs = Math.min(
        BACKOFF_MAX_MS,
        BACKOFF_BASE_MS * 2 ** attempt,
      );
      const jitterMs = Math.floor(Math.random() * 250);
      const waitMs = (retryAfterMs ?? exponentialBackoffMs) + jitterMs;

      log.scheduler.warn(
        {
          campsiteId,
          status,
          attempt: attempt + 1,
          retryInMs: waitMs,
        },
        'Availability request failed, retrying',
      );
      logSchedulerEvent({
        eventType: 'availability_retry',
        message: 'Availability request failed, retrying',
        metadata: {
          campsiteId,
          status: status ?? null,
          attempt: attempt + 1,
          retryInMs: waitMs,
        },
      });

      await sleep(waitMs);
    }
  }

  return {};
}

/**
 * Compare two availability maps and return dates that became "Available".
 */
export function diffAvailability(
  previous: AvailabilityMap,
  current: AvailabilityMap
): string[] {
  const newlyAvailable: string[] = [];

  for (const [date, status] of Object.entries(current)) {
    if (status === 'Available' && previous[date] !== 'Available') {
      newlyAvailable.push(date);
    }
  }

  return newlyAvailable;
}
