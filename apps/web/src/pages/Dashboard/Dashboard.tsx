import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Watch } from '@campsight/shared';
import { api } from '../../lib/api';
import styles from './Dashboard.module.scss';

export function Dashboard() {
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
    return <div className={styles.loading}>Loading your watches...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        Failed to load watches. Please try again.
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Watches</h1>
        </div>

        <div className={styles.headerContent}>
          <p className={styles.subtitle}>
            Monitoring {watches?.filter((w) => w.isActive).length || 0} active
            campsite{watches?.filter((w) => w.isActive).length !== 1 ? 's' : ''}
          </p>
          <Link to="/new" className={styles.addBtn}>
            + Add Watch
          </Link>
        </div>
      </div>

      {!watches?.length ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔭</span>
          <h2>No watches yet</h2>
          <p>
            Start monitoring campsites to get notified when they become
            available.
          </p>
          <Link to="/new" className={styles.emptyBtn}>
            Add your first watch
          </Link>
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
                  <h3 className={styles.campsiteName}>{watch.campsiteName}</h3>
                  <p className={styles.campgroundName}>
                    {watch.campgroundName}
                  </p>
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
                <span>{watch.startDate}</span>
                <span className={styles.dateArrow}>→</span>
                <span>{watch.endDate}</span>
              </div>

              <div className={styles.cardActions}>
                <Link to={`/watch/${watch.id}`} className={styles.viewBtn}>
                  View Availability
                </Link>
                <button
                  onClick={() => toggleMutation.mutate(watch)}
                  className={styles.toggleBtn}
                  disabled={toggleMutation.isPending}
                >
                  {watch.isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this watch?')) {
                      deleteMutation.mutate(watch.id);
                    }
                  }}
                  className={styles.deleteBtn}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
