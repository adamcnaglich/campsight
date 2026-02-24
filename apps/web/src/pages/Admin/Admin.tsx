import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { isAdmin } from '../../lib/admin';
import { useAuthContext } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import styles from './Admin.module.scss';

interface Stats {
  users: { total: number };
  watches: { total: number; active: number };
  snapshots: { total: number };
  notifications: { total: number };
}

interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
  watchCount: number;
}

interface Watch {
  id: number;
  userId: string;
  userEmail: string;
  campsiteId: string;
  campsiteName: string;
  campgroundName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

interface Activity {
  type: 'watch_created' | 'user_registered' | 'notification_sent' | 'scheduler_run';
  timestamp: string;
  userId: string;
  userEmail: string;
  details: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  isCheckInProgress: boolean;
  schedule: string;
  lastRunTime: string | null;
  lastRunStatus: 'success' | 'error' | null;
  lastRunError: string | null;
}

type Tab = 'overview' | 'users' | 'watches' | 'activity' | 'scheduler';

export const Admin = () => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!isAdmin(user?.email)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.admin}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Panel</h1>
        <p className={styles.subtitle}>System administration and monitoring</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'watches' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('watches')}
        >
          Watches
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'scheduler' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('scheduler')}
        >
          Scheduler
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'activity' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'watches' && <WatchesTab />}
        {activeTab === 'scheduler' && <SchedulerTab />}
        {activeTab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
};

const OverviewTab = () => {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get('/admin'),
  });

  if (isLoading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Failed to load stats</div>;
  if (!stats) return null;

  return (
    <div className={styles.overview}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Users</h3>
          <p className={styles.statValue}>{stats.users.total}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Watches</h3>
          <p className={styles.statValue}>{stats.watches.total}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Active Watches</h3>
          <p className={styles.statValue}>{stats.watches.active}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Availability Snapshots</h3>
          <p className={styles.statValue}>{stats.snapshots.total}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Notifications Sent</h3>
          <p className={styles.statValue}>{stats.notifications.total}</p>
        </div>
      </div>
    </div>
  );
};

const UsersTab = () => {
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users'),
  });

  if (isLoading) return <div className={styles.loading}>Loading users...</div>;
  if (error) return <div className={styles.error}>Failed to load users</div>;
  if (!users) return null;

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Display Name</th>
            <th>Watches</th>
            <th>Created</th>
            <th>Last Active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.displayName || '-'}</td>
              <td>{user.watchCount}</td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>{new Date(user.updatedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const WatchesTab = () => {
  const { data: watches, isLoading, error } = useQuery<Watch[]>({
    queryKey: ['admin', 'watches'],
    queryFn: () => api.get('/admin/watches'),
  });

  if (isLoading) return <div className={styles.loading}>Loading watches...</div>;
  if (error) return <div className={styles.error}>Failed to load watches</div>;
  if (!watches) return null;

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Campsite</th>
            <th>Campground</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {watches.map((watch) => (
            <tr key={watch.id}>
              <td>{watch.id}</td>
              <td className={styles.userEmail}>{watch.userEmail}</td>
              <td>{watch.campsiteName}</td>
              <td>{watch.campgroundName}</td>
              <td className={styles.dates}>
                {watch.startDate} → {watch.endDate}
              </td>
              <td>
                <span
                  className={`${styles.badge} ${
                    watch.isActive ? styles.badgeActive : styles.badgeInactive
                  }`}
                >
                  {watch.isActive ? 'Active' : 'Paused'}
                </span>
              </td>
              <td>{new Date(watch.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ActivityTab = () => {
  const { data: activities, isLoading, error } = useQuery<Activity[]>({
    queryKey: ['admin', 'activity'],
    queryFn: () => api.get('/admin/activity'),
    refetchInterval: 5000,
  });

  if (isLoading) return <div className={styles.loading}>Loading activity...</div>;
  if (error) return <div className={styles.error}>Failed to load activity</div>;
  if (!activities) return null;

  return (
    <div className={styles.activityList}>
      {activities.map((activity, idx) => {
        const details = JSON.parse(activity.details);
        return (
          <div key={idx} className={styles.activityItem}>
            <div className={styles.activityTime}>
              {new Date(activity.timestamp).toLocaleString()}
            </div>
            <div className={styles.activityContent}>
              <span className={styles.activityType}>
                {activity.type === 'watch_created' && '📍 Watch Created'}
                {activity.type === 'user_registered' && '👤 User Registered'}
                {activity.type === 'notification_sent' && '📧 Notification Sent'}
                {activity.type === 'scheduler_run' && (
                  <>⏱ Scheduler Run ({details.status === 'success' ? '✓ Success' : '✗ Error'})</>
                )}
              </span>
              {activity.userEmail && (
                <span className={styles.activityUser}>{activity.userEmail}</span>
              )}
              <div className={styles.activityDetails}>
                {activity.type === 'watch_created' && (
                  <>
                    {details.campsiteName} at {details.campgroundName}
                  </>
                )}
                {activity.type === 'user_registered' && (
                  <>Display name: {details.displayName || 'Not set'}</>
                )}
                {activity.type === 'notification_sent' && (
                  <>Channel: {details.channel}, Watch ID: {details.watchId}</>
                )}
                {activity.type === 'scheduler_run' && (
                  <>
                    {details.groupsChecked != null
                      ? `${details.groupsChecked} watch groups checked`
                      : ''}
                    {details.errorMessage && ` — ${details.errorMessage}`}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SchedulerTab = () => {
  const queryClient = useQueryClient();
  
  const { data: status, isLoading, error } = useQuery<SchedulerStatus>({
    queryKey: ['admin', 'scheduler', 'status'],
    queryFn: () => api.get('/admin/scheduler/status'),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const startMutation = useMutation({
    mutationFn: () => api.post('/admin/scheduler/start', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scheduler', 'status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => api.post('/admin/scheduler/stop', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scheduler', 'status'] });
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => api.post('/admin/scheduler/restart', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scheduler', 'status'] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post('/admin/scheduler/trigger', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scheduler', 'status'] });
    },
  });

  if (isLoading) return <div className={styles.loading}>Loading scheduler status...</div>;
  if (error) return <div className={styles.error}>Failed to load scheduler status</div>;
  if (!status) return null;

  return (
    <div className={styles.scheduler}>
      <div className={styles.schedulerCard}>
        <div className={styles.schedulerHeader}>
          <h2 className={styles.schedulerTitle}>Availability Check Scheduler</h2>
          <span
            className={`${styles.schedulerStatus} ${
              status.isRunning ? styles.schedulerStatusRunning : styles.schedulerStatusStopped
            }`}
          >
            {status.isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>

        <div className={styles.schedulerInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Schedule:</span>
            <span className={styles.infoValue}>{status.schedule}</span>
          </div>
          
          {status.lastRunTime && (
            <>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Last Run:</span>
                <span className={styles.infoValue}>
                  {new Date(status.lastRunTime).toLocaleString()}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Last Status:</span>
                <span
                  className={`${styles.infoValue} ${
                    status.lastRunStatus === 'success'
                      ? styles.statusSuccess
                      : status.lastRunStatus === 'error'
                      ? styles.statusError
                      : ''
                  }`}
                >
                  {status.lastRunStatus === 'success' && '✓ Success'}
                  {status.lastRunStatus === 'error' && '✗ Error'}
                  {!status.lastRunStatus && 'In Progress...'}
                </span>
              </div>
            </>
          )}

          {status.lastRunError && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Error:</span>
              <span className={styles.errorText}>{status.lastRunError}</span>
            </div>
          )}

          {status.isCheckInProgress && (
            <div className={styles.infoRow}>
              <span className={styles.progressIndicator}>⟳ Check in progress...</span>
            </div>
          )}
        </div>

        <div className={styles.schedulerActions}>
          <button
            onClick={() => startMutation.mutate()}
            className={styles.actionBtn}
            disabled={status.isRunning || startMutation.isPending}
          >
            {startMutation.isPending ? 'Starting...' : 'Start'}
          </button>
          <button
            onClick={() => stopMutation.mutate()}
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            disabled={!status.isRunning || stopMutation.isPending}
          >
            {stopMutation.isPending ? 'Stopping...' : 'Stop'}
          </button>
          <button
            onClick={() => restartMutation.mutate()}
            className={styles.actionBtn}
            disabled={restartMutation.isPending}
          >
            {restartMutation.isPending ? 'Restarting...' : 'Restart'}
          </button>
          <button
            onClick={() => triggerMutation.mutate()}
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            disabled={status.isCheckInProgress || triggerMutation.isPending}
          >
            {triggerMutation.isPending ? 'Triggering...' : 'Run Check Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
