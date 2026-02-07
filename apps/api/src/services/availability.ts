import axios from 'axios';
import { AvailabilityMap } from '@campsight/shared';

const AVAILABILITY_API =
  'https://www.recreation.gov/api/camps/availability/campsite';

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

  const response = await axios.get(url, {
    params: {
      start_date: `${startDate}T00:00:00Z`,
      end_date: `${endDate}T00:00:00Z`,
    },
    headers: {
      'User-Agent': 'CampSight/1.0',
    },
    timeout: 15000,
  });

  return response.data?.availability?.availabilities || {};
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
