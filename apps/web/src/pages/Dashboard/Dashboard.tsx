import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Watch } from '@campsight/shared';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { CampgroundCard } from '../../components/CampgroundCard';
import styles from './Dashboard.module.scss';

const formatDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const Dashboard = () => {
  const queryClient = useQueryClient();

  const {
    data: watches,
    isLoading,
    error,
  } = useQuery<Watch[]>({
    queryKey: ['watches'],
    queryFn: () => api.get('/api/watches'),
  });

  const toggleMutation = useMutation({
    mutationFn: (watch: Watch) =>
      api.patch(`/api/watches/${watch.id}`, { isActive: !watch.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watches'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/watches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watches'] }),
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Text variant="body">Loading your watches...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <Text variant="body">Failed to load watches. Please try again.</Text>
      </div>
    );
  }

  const activeSiteCount =
    watches
      ?.filter((w) => w.isActive)
      .reduce((sum, w) => sum + w.sites.length, 0) ?? 0;

  return (
    <div className={styles.dashboard}>
      {!watches?.length ? (
        <div className={styles.empty}>
          <img
            src="/dash-hero.webp"
            alt="No watches yet"
            width="100%"
            height="100%"
            className={styles.emptyImage}
          />
          <Text variant="h1">No Watches Yet</Text>
          <Text variant="body" className={styles.emptyText}>
            Start monitoring campsites to get notified when they become
            available.
          </Text>
          <Button
            as={({ children, className, ...props }) => (
              <Link to="/new" className={className} {...props}>
                {children}
              </Link>
            )}
            variant="primary"
            size="large"
          >
            Start A New Watch
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.header}>
            <div>
              <Text variant="h1" className={styles.title}>
                Your Watches
              </Text>
            </div>

            <div className={styles.headerContent}>
              <Text variant="body" className={styles.subtitle} as="p">
                Monitoring {activeSiteCount} campsite
                {activeSiteCount !== 1 ? 's' : ''}
              </Text>
              <Button
                className={styles.addBtn}
                icon={<Plus size={16} aria-hidden />}
                as={({ children, className, ...props }) => (
                  <Link to="/new" className={className} {...props}>
                    {children}
                  </Link>
                )}
                variant="primary"
                size="small"
              >
                New Watch
              </Button>
            </div>
          </div>
          <div className={styles.grid}>
            {watches.map((watch) => {
              const siteCount = watch.sites.length;
              const loops = [
                ...new Set(watch.sites.map((s) => s.loop).filter(Boolean)),
              ];
              const loopStr =
                loops.length > 0 ? `Loop: ${loops.join(', ')}` : '';
              const siteLabel =
                siteCount === 1
                  ? [`Site: ${watch.sites[0].campsiteName}`, loopStr]
                      .filter(Boolean)
                      .join(', ')
                  : [`${siteCount} Sites`, loopStr].filter(Boolean).join(', ');

              return (
                <CampgroundCard
                  key={watch.id}
                  imageSrc={watch.imageUrl || undefined}
                  campsiteName={siteLabel}
                  campgroundName={watch.campgroundName}
                  metaLeft={watch.recAreaName || watch.campgroundName}
                  badgeLabel={watch.isActive ? 'Active' : 'Paused'}
                  badgeActive={watch.isActive}
                  startDate={formatDate(watch.startDate)}
                  endDate={formatDate(watch.endDate)}
                  actions={
                    <>
                      <Button
                        variant="outline"
                        as={({ children, className, ...props }) => (
                          <Link
                            to={`/watch/${watch.id}`}
                            className={className}
                            {...props}
                          >
                            {children}
                          </Link>
                        )}
                      >
                        Details
                      </Button>
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
                          if (confirm('Cancel this watch?')) {
                            deleteMutation.mutate(watch.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </>
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
