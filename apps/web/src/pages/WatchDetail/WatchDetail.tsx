import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Watch, AvailabilitySnapshot } from '@campsight/shared';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { api } from '../../lib/api';
import styles from './WatchDetail.module.scss';

interface WatchAvailabilityResponse {
  watch: Watch;
  availability: Record<string, string>;
  snapshots: AvailabilitySnapshot[];
}

export function WatchDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<WatchAvailabilityResponse>({
    queryKey: ['watch-availability', id],
    queryFn: () => api.get(`/api/watches/${id}/availability`),
    enabled: !!id,
    refetchInterval: 1000 * 60 * 5, // refresh every 5 min
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading availability...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.error}>
        <p>Failed to load watch details.</p>
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

  const statusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return styles.available;
      case 'Reserved':
        return styles.reserved;
      default:
        return styles.notAvailable;
    }
  };

  return (
    <div className={styles.page}>
      <Link to="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{watch.campsiteName}</h1>
          <p className={styles.campground}>{watch.campgroundName}</p>
        </div>
        <span
          className={`${styles.badge} ${
            watch.isActive ? styles.badgeActive : styles.badgeInactive
          }`}
        >
          {watch.isActive ? 'Active' : 'Paused'}
        </span>
      </div>

      <div className={styles.dateRange}>
        {watch.startDate} → {watch.endDate}
      </div>

      <div className={styles.calendarSection}>
        <h2 className={styles.sectionTitle}>Availability Calendar</h2>

        {dateRange.length === 0 ? (
          <p className={styles.noData}>
            No availability data yet. The scheduler will check shortly.
          </p>
        ) : (
          <>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.available}`} />
                Available
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.reserved}`} />
                Reserved
              </span>
              <span className={styles.legendItem}>
                <span
                  className={`${styles.legendDot} ${styles.notAvailable}`}
                />
                Not Available
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
                    className={`${styles.dayCell} ${statusColor(status)}`}
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
}
