import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Watch, WatchSite } from '@campsight/shared';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import classNames from 'classnames';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import styles from './WatchDetail.module.scss';

interface SiteAvailabilityData {
  campsiteId: string;
  campsiteName: string;
  availability: Record<string, string>;
}

interface WatchAvailabilityResponse {
  watch: Watch;
  siteAvailability: Record<number, SiteAvailabilityData>;
}

const DETAIL_PAGE = 'https://www.recreation.gov/camping/campsites';

function SiteCalendar({
  site,
  availability,
  dateRange,
}: {
  site: WatchSite;
  availability: Record<string, string>;
  dateRange: Date[];
}) {
  return (
    <div className={styles.siteSection}>
      <div className={styles.siteHeader}>
        <Text variant="h3">{site.campsiteName}</Text>
        <a
          href={`${DETAIL_PAGE}/${site.campsiteId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.recGovLink}
        >
          View on Recreation.gov
        </a>
      </div>

      <div className={styles.calendar}>
        {dateRange.map((date) => {
          const dateKey = date.toISOString().split('T')[0];
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
    </div>
  );
}

export const WatchDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<WatchAvailabilityResponse>({
    queryKey: ['watch-availability', id],
    queryFn: () => api.get(`/api/watches/${id}/availability`),
    enabled: !!id,
    refetchInterval: 1000 * 60 * 5,
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

  const { watch, siteAvailability } = data;

  let dateRange: Date[] = [];
  try {
    dateRange = eachDayOfInterval({
      start: parseISO(watch.startDate),
      end: parseISO(watch.endDate),
    });
  } catch {
    // Invalid date range
  }

  const siteCount = watch.sites.length;
  const title = siteCount === 1
    ? watch.sites[0].campsiteName
    : `${siteCount} Sites`;

  return (
    <div className={styles.page}>
      <Link to="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.header}>
        <div>
          <Text variant="h1" className={styles.title}>
            {title}
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

            {watch.sites.map((site) => {
              const avail = siteAvailability[site.id]?.availability || {};
              return (
                <SiteCalendar
                  key={site.id}
                  site={site}
                  availability={avail}
                  dateRange={dateRange}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
