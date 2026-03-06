import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Watch, AvailabilitySnapshot } from '@campsight/shared';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import classNames from 'classnames';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import styles from './WatchDetail.module.scss';

interface WatchAvailabilityResponse {
  watch: Watch;
  availability: Record<string, string>;
  snapshots: AvailabilitySnapshot[];
}

export const WatchDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<WatchAvailabilityResponse>({
    queryKey: ['watch-availability', id],
    queryFn: () => api.get(`/api/watches/${id}/availability`),
    enabled: !!id,
    refetchInterval: 1000 * 60 * 5, // refresh every 5 min
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Text variant="body">Loading availability...</Text>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.error}>
        <Text variant="body" as="p">
          Failed to load watch details.
        </Text>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  const { watch, availability } = data;

  // Generate all dates in the range
  let dateRange: Date[] = [];
  try {
    dateRange = eachDayOfInterval({
      start: parseISO(watch.startDate),
      end: parseISO(watch.endDate),
    });
  } catch {
    // Invalid date range
  }

  return (
    <div className={styles.page}>
      <Link to="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.header}>
        <div>
          <Text variant="h1" className={styles.title}>
            {watch.campsiteName}
          </Text>
          <Text variant="body" className={styles.campground} as="p">
            {watch.campgroundName}
          </Text>
        </div>
        <span
          className={classNames(styles.badge, {
            [styles.badgeActive]: watch.isActive,
            [styles.badgeInactive]: !watch.isActive,
          })}
        >
          {watch.isActive ? 'Active' : 'Paused'}
        </span>
      </div>

      <div className={styles.dateRange}>
        {watch.startDate} → {watch.endDate}
      </div>

      <div className={styles.calendarSection}>
        <Text variant="h2" className={styles.sectionTitle}>
          Availability Calendar
        </Text>

        {dateRange.length === 0 ? (
          <Text variant="body" className={styles.noData} as="p">
            No availability data yet. The scheduler will check shortly.
          </Text>
        ) : (
          <>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span
                  className={classNames(styles.legendDot, styles.available)}
                />
                <Text variant="body-sm" as="span">
                  Available
                </Text>
              </span>
              <span className={styles.legendItem}>
                <span
                  className={classNames(styles.legendDot, styles.reserved)}
                />
                <Text variant="body-sm" as="span">
                  Reserved
                </Text>
              </span>
              <span className={styles.legendItem}>
                <span
                  className={classNames(styles.legendDot, styles.notAvailable)}
                />
                <Text variant="body-sm" as="span">
                  Not Available
                </Text>
              </span>
            </div>

            <div className={styles.calendar}>
              {dateRange.map((date) => {
                // The API returns dates as ISO timestamps like "2025-06-15T00:00:00Z"
                const dateKey = date.toISOString().split('T')[0];
                // Try various key formats
                const status =
                  availability[dateKey] ||
                  availability[`${dateKey}T00:00:00Z`] ||
                  'Unknown';

                return (
                  <div
                    key={dateKey}
                    className={classNames(styles.dayCell, {
                      [styles.available]: status === 'Available',
                      [styles.reserved]: status === 'Reserved',
                      [styles.notAvailable]:
                        status !== 'Available' && status !== 'Reserved',
                    })}
                    title={`${format(date, 'MMM d, yyyy')}: ${status}`}
                  >
                    <span className={styles.dayNum}>{format(date, 'd')}</span>
                    <span className={styles.dayMonth}>
                      {format(date, 'MMM')}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className={styles.detailLink}>
        <a
          href={`https://www.recreation.gov/camping/campsites/${watch.campsiteId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.recGovLink}
        >
          View on Recreation.gov →
        </a>
      </div>
    </div>
  );
};
