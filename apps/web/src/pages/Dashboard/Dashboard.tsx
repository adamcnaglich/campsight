import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Watch } from '@campsight/shared';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import styles from './Dashboard.module.scss';

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

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <Text variant="h1" className={styles.title}>
            Your Watches
          </Text>
        </div>

        <div className={styles.headerContent}>
          <Text variant="body-sm" className={styles.subtitle} as="p">
            Monitoring {watches?.filter((w) => w.isActive).length || 0} active
            campsite{watches?.filter((w) => w.isActive).length !== 1 ? 's' : ''}
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

      {!watches?.length ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔭</span>
          <Text variant="h2">No watches yet</Text>
          <Text variant="body">
            Start monitoring campsites to get notified when they become
            available.
          </Text>
          <Button
            className={styles.emptyBtn}
            icon={<Plus size={16} aria-hidden />}
            as={({ children, className, ...props }) => (
              <Link to="/new" className={className} {...props}>
                {children}
              </Link>
            )}
            variant="primary"
          >
            Add your first watch
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {watches.map((watch) => (
            <div
              key={watch.id}
              className={`${styles.card} ${
                !watch.isActive ? styles.cardInactive : ''
              }`}
            >
              <div className={styles.cardHeader}>
                <div>
                  <Text variant="h3" className={styles.campsiteName}>
                    {watch.campsiteName}
                  </Text>
                  <Text
                    variant="body-sm"
                    className={styles.campgroundName}
                    as="p"
                  >
                    {watch.campgroundName}
                  </Text>
                </div>
                <span
                  className={`${styles.badge} ${
                    watch.isActive ? styles.badgeActive : styles.badgeInactive
                  }`}
                >
                  {watch.isActive ? 'Active' : 'Paused'}
                </span>
              </div>

              <div className={styles.dates}>
                <Text variant="body-sm" as="span">
                  {watch.startDate}
                </Text>
                <span className={styles.dateArrow}>→</span>
                <Text variant="body-sm" as="span">
                  {watch.endDate}
                </Text>
              </div>

              <div className={styles.cardActions}>
                <Button
                  as={({ children, className, ...props }) => (
                    <Link
                      to={`/watch/${watch.id}`}
                      className={className}
                      {...props}
                    >
                      {children}
                    </Link>
                  )}
                  size="compact"
                >
                  View Availability
                </Button>

                <Button
                  className={styles.cardActionBtn}
                  variant="outline"
                  size="compact"
                  onClick={() => toggleMutation.mutate(watch)}
                  disabled={toggleMutation.isPending}
                >
                  {watch.isActive ? 'Pause' : 'Resume'}
                </Button>
                <Button
                  className={styles.cardActionBtn}
                  size="compact"
                  onClick={() => {
                    if (confirm('Delete this watch?')) {
                      deleteMutation.mutate(watch.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
