import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Watch } from '@campsight/shared';
import { format, parseISO } from 'date-fns';
import classNames from 'classnames';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import { MapView, MapMarker } from '../../components/MapView';
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
      <Text variant="h3" className={styles.detailItemTitle}>
        {title}
      </Text>
      <Text variant="body" className={styles.detailSubtext}>
        {subtitle}
      </Text>
    </div>
    {/* dont hook up the edit button yet */}
    <button className={styles.editButton}>
      <EditIcon size={18} />
    </button>
  </div>
);

export const WatchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<WatchAvailabilityResponse>({
    queryKey: ['watch-availability', id],
    queryFn: () => api.get(`/api/watches/${id}/availability`),
    enabled: !!id,
    refetchInterval: 1000 * 60 * 5,
  });

  const toggleMutation = useMutation({
    mutationFn: (watch: Watch) =>
      api.patch(`/api/watches/${watch.id}`, { isActive: !watch.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-availability', id] });
      queryClient.invalidateQueries({ queryKey: ['watches'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (watchId: number) => api.delete(`/api/watches/${watchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watches'] });
      navigate('/dashboard');
    },
  });

  const markers: MapMarker[] = useMemo(
    () =>
      (data?.watch.sites ?? [])
        .filter((s) => s.latitude && s.longitude)
        .map((s) => ({
          id: s.campsiteId,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          label: s.campsiteName,
        })),
    [data?.watch.sites],
  );

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

  const { watch } = data;

  const siteCount = watch.sites.length;
  const siteNames = watch.sites.map((s) => s.campsiteName).join(', ');
  const startFormatted = format(parseISO(watch.startDate), 'MMMM d');
  const endFormatted = format(parseISO(watch.endDate), 'MMMM d');

  const buttons = (
    <>
      <Button
        variant="outline"
        level={!watch.isActive ? 'success' : undefined}
        onClick={() => toggleMutation.mutate(watch)}
        disabled={toggleMutation.isPending}
      >
        {watch.isActive ? 'Pause' : 'Resume'}
      </Button>
      <Button
        variant="outline"
        level="danger"
        onClick={() => {
          if (confirm('Delete this watch?')) {
            deleteMutation.mutate(watch.id);
          }
        }}
        disabled={deleteMutation.isPending}
      >
        Delete
      </Button>
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.watchDetailHeader}>
        <Link to="/dashboard" className={styles.backLink}>
          <div className={styles.backLinkIcon}>←</div>
          <div>
            Back <span className={styles.backLinkText}>to Dashboard</span>
          </div>
        </Link>
        <div className={styles.watchDetailHeaderButtons}>{buttons}</div>
      </div>

      <Text variant="h1" className={styles.campgroundName}>
        {watch.campgroundName.toLowerCase()}
      </Text>

      <div className={styles.watchInfo}>
        <div className={styles.watchInfoLeft}>
          <Text variant="body" className={styles.watchInfoText}>
            Watching {siteCount} {siteCount === 1 ? 'Site' : 'Sites'}
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
        <div className={styles.watchInfoRight}>{buttons}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.detailsColumn}>
          <Text variant="h2" className={styles.sectionTitle}>
            Details
          </Text>
          <div className={styles.details}>
            <DetailItem
              title={watch.campgroundName.toLowerCase()}
              subtitle={watch.recAreaName ?? ''}
            />
            <DetailItem
              title={`${siteCount} ${siteCount === 1 ? 'Campsite' : 'Campsites'}`}
              subtitle={siteNames}
            />
            <DetailItem
              title="Timeframe"
              subtitle={`${startFormatted} – ${endFormatted}`}
            />
          </div>
        </div>
        <div className={styles.mapColumn}>
          <Text variant="h2" className={styles.sectionTitle}>
            Map
          </Text>
          <div className={styles.mapContainer}>
            <MapView markers={markers} />
          </div>
        </div>
      </div>
    </div>
  );
};
