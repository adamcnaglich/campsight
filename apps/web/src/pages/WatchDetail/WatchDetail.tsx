import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Watch, WatchSite } from '@campsight/shared';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import classNames from 'classnames';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import styles from './WatchDetail.module.scss';
import { Button } from '../../components/Button';
import { EditIcon } from 'lucide-react';

interface SiteAvailabilityData {
  campsiteId: string;
  campsiteName: string;
  availability: Record<string, string>;
}

interface WatchAvailabilityResponse {
  watch: Watch;
  siteAvailability: Record<number, SiteAvailabilityData>;
}

const DetailItem = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className={styles.detailItem}>
    <div className={styles.detailItemContent}>
      <Text variant="h3">{title}</Text>
      <Text variant="body" className={styles.detailSubtext}>
        {subtitle}
      </Text>
    </div>
    {/* dont hook up the edit button yet */}
    <button className={styles.editButton}>
      <EditIcon />
    </button>
  </div>
);

const DETAIL_PAGE = 'https://www.recreation.gov/camping/campsites';

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
  const title =
    siteCount === 1 ? watch.sites[0].campsiteName : `${siteCount} Sites`;

  return (
    <div className={styles.page}>
      <Link to="/dashboard" className={styles.backLink}>
        <div className={styles.backLinkIcon}>←</div> Back to Dashboard
      </Link>

      <Text variant="h1">Ausable River Campground</Text>

      <div className={styles.watchInfo}>
        <div className={styles.watchInfoLeft}>
          <Text variant="body" className={styles.watchInfoText}>
            Watching 12 Sites
          </Text>
          <span
            className={classNames(styles.badge, {
              [styles.badgeActive]: watch.isActive,
              [styles.badgeInactive]: !watch.isActive,
            })}
          >
            {watch.isActive ? 'Active' : 'Paused'}
          </span>
        </div>
        <div className={styles.watchInfoRight}>
          <Button variant="outline">Pause</Button>
          <Button variant="outline" level="danger">
            Delete Watch
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div>
          <Text variant="h2" className={styles.sectionTitle}>
            Details
          </Text>
          <div className={styles.details}>
            <DetailItem
              title="Porcupine Flat Campground"
              subtitle="Mio, Michigan"
            />
            <DetailItem
              title="12 Campsites"
              subtitle="002, 005, 006, 007, 012, 014, 015, 041, 042, 121, 122, 138"
            />
            <DetailItem title="Timeframe" subtitle="March 10 - 14" />
          </div>
        </div>
        <div className={styles.mapColumn}>
          <Text variant="h2">Map</Text>
          <div className={styles.mapContainer}>
            {/* <MapView markers={[]} /> */}
          </div>
        </div>
      </div>
    </div>
  );

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
          </>
        )}
      </div>
    </div>
  );
};
