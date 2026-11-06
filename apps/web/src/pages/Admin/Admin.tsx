import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import { api } from '../../lib/api';
import { Button } from '../../components/Button';
import { useMe } from '../../hooks/useMe';
import { Text } from '../../components/Text';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './Admin.module.scss';

interface Stats {
  users: { total: number };
  watches: { total: number; active: number };
  snapshots: { total: number };
  notifications: { total: number };
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: string;
  watchCount: number;
}

interface PendingInvite {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

interface CreatedInvite {
  email: string;
  link: string;
  expiresAt: string;
  emailed: boolean;
}

interface Watch {
  id: number;
  userId: string;
  userEmail: string;
  campgroundName: string;
  imageUrl: string | null;
  sites: Array<{ id: number; campsiteId: string; campsiteName: string }>;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

interface Activity {
  type:
    | 'watch_created'
    | 'user_registered'
    | 'notification_sent'
    | 'scheduler_run'
    | 'scheduler_event';
  timestamp: string;
  userId: string;
  userEmail: string;
  details: string;
}

type ActivityFilter =
  | 'all'
  | 'scheduler'
  | 'watches'
  | 'users'
  | 'notifications';

interface SchedulerStatus {
  isRunning: boolean;
  isCheckInProgress: boolean;
  schedule: string;
  lastRunTime: string | null;
  lastRunStatus: 'success' | 'error' | null;
  lastRunError: string | null;
}

type Tab =
  | 'overview'
  | 'users'
  | 'watches'
  | 'activity'
  | 'scheduler'
  | 'email';

export const Admin = () => {
  useDocumentTitle('Admin');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className={styles.admin}>
      <div className={styles.header}>
        <Text variant="h1" className={styles.title}>
          Admin Panel
        </Text>
        <Text variant="body-sm" className={styles.subtitle} as="p">
          System administration and monitoring
        </Text>
      </div>

      <div className={styles.tabs}>
        <button
          className={classNames(styles.tab, {
            [styles.tabActive]: activeTab === 'overview',
          })}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={classNames(styles.tab, {
            [styles.tabActive]: activeTab === 'users',
          })}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={classNames(styles.tab, {
            [styles.tabActive]: activeTab === 'watches',
          })}
          onClick={() => setActiveTab('watches')}
        >
          Watches
        </button>
        <button
          className={classNames(styles.tab, {
            [styles.tabActive]: activeTab === 'scheduler',
          })}
          onClick={() => setActiveTab('scheduler')}
        >
          Scheduler
        </button>
        <button
          className={classNames(styles.tab, {
            [styles.tabActive]: activeTab === 'activity',
          })}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
        <button
          className={classNames(styles.tab, {
            [styles.tabActive]: activeTab === 'email',
          })}
          onClick={() => setActiveTab('email')}
        >
          Email
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'watches' && <WatchesTab />}
        {activeTab === 'scheduler' && <SchedulerTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'email' && <EmailTab />}
      </div>
    </div>
  );
};

const OverviewTab = () => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<Stats>({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get('/api/admin'),
  });

  if (isLoading)
    return (
      <div className={styles.loading}>
        <Text variant="body">Loading...</Text>
      </div>
    );
  if (error)
    return (
      <div className={styles.error}>
        <Text variant="body">Failed to load stats</Text>
      </div>
    );
  if (!stats) return null;

  return (
    <div className={styles.overview}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Text variant="caption" className={styles.statLabel} as="h3">
            Users
          </Text>
          <Text variant="h1" className={styles.statValue} as="p">
            {stats.users.total}
          </Text>
        </div>
        <div className={styles.statCard}>
          <Text variant="caption" className={styles.statLabel} as="h3">
            Total Watches
          </Text>
          <Text variant="h1" className={styles.statValue} as="p">
            {stats.watches.total}
          </Text>
        </div>
        <div className={styles.statCard}>
          <Text variant="caption" className={styles.statLabel} as="h3">
            Active Watches
          </Text>
          <Text variant="h1" className={styles.statValue} as="p">
            {stats.watches.active}
          </Text>
        </div>
        <div className={styles.statCard}>
          <Text variant="caption" className={styles.statLabel} as="h3">
            Availability Snapshots
          </Text>
          <Text variant="h1" className={styles.statValue} as="p">
            {stats.snapshots.total}
          </Text>
        </div>
        <div className={styles.statCard}>
          <Text variant="caption" className={styles.statLabel} as="h3">
            Notifications Sent
          </Text>
          <Text variant="h1" className={styles.statValue} as="p">
            {stats.notifications.total}
          </Text>
        </div>
      </div>
    </div>
  );
};

const UsersTab = () => {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [inviteEmail, setInviteEmail] = useState('');
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const users = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/api/admin/users'),
  });

  const invites = useQuery<PendingInvite[]>({
    queryKey: ['admin', 'invites'],
    queryFn: () => api.get('/api/admin/invites'),
  });

  const createInvite = useMutation({
    mutationFn: () =>
      api.post<CreatedInvite>('/api/admin/invites', { email: inviteEmail }),
    onSuccess: (invite) => {
      setCreated(invite);
      setCopied(false);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] });
    },
  });

  const revokeInvite = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/invites/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'watches'] });
    },
  });

  const handleDelete = (user: AdminUser) => {
    if (
      !window.confirm(
        `Delete ${user.email}? This permanently removes the account and all of its watches.`,
      )
    ) {
      return;
    }
    deleteUser.mutate(user.id);
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.usersPanel}>
      <div className={styles.schedulerCard}>
        <div className={styles.schedulerHeader}>
          <Text variant="h2" className={styles.schedulerTitle}>
            Invite someone
          </Text>
        </div>
        <p className={styles.emailDescription}>
          Creates a one-time link, valid for 7 days, where they choose their
          own password. It is emailed to them when SMTP is set up.
        </p>
        <form
          className={styles.inviteForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (inviteEmail && !createInvite.isPending) createInvite.mutate();
          }}
        >
          <input
            className={styles.inviteInput}
            type="email"
            placeholder="friend@example.com"
            aria-label="Email to invite"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            size="small"
            disabled={createInvite.isPending}
          >
            {createInvite.isPending ? 'Inviting…' : 'Invite'}
          </Button>
        </form>
        {createInvite.isError ? (
          <span className={styles.statusError}>
            {createInvite.error instanceof Error
              ? createInvite.error.message
              : 'Could not create the invite'}
          </span>
        ) : null}
        {created ? (
          <div className={styles.inviteResult}>
            <span className={styles.statusSuccess}>
              {created.emailed
                ? `✓ Invite emailed to ${created.email}.`
                : `✓ Invite created for ${created.email}. It was not emailed, so send them this link.`}
            </span>
            <code className={styles.inviteLink}>{created.link}</code>
            <div>
              <Button variant="outline" size="small" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
            <span className={styles.emailDescription}>
              This link is shown only once.
            </span>
          </div>
        ) : null}
      </div>

      {invites.data && invites.data.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pending invite</th>
                <th>Sent</th>
                <th>Expires</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.data.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{new Date(invite.createdAt).toLocaleDateString()}</td>
                  <td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                  <td className={styles.actionsCol}>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => revokeInvite.mutate(invite.id)}
                      disabled={revokeInvite.isPending}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {users.isLoading ? (
        <div className={styles.loading}>
          <Text variant="body">Loading users...</Text>
        </div>
      ) : users.isError || !users.data ? (
        <div className={styles.error}>
          <Text variant="body">Failed to load users</Text>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          {deleteUser.isError ? (
            <div className={styles.error} style={{ padding: 12, margin: 12 }}>
              {deleteUser.error instanceof Error
                ? deleteUser.error.message
                : 'Failed to delete user'}
            </div>
          ) : null}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Watches</th>
                <th>Joined</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((user) => {
                const isSelf = user.id === me?.id;
                return (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.displayName || '—'}</td>
                    <td>
                      <span
                        className={classNames(styles.badge, {
                          [styles.badgeActive]: user.isAdmin,
                          [styles.badgeInactive]: !user.isAdmin,
                        })}
                      >
                        {user.isAdmin ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td>{user.watchCount}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className={styles.actionsCol}>
                      <Button
                        variant="outline"
                        level="danger"
                        size="small"
                        onClick={() => handleDelete(user)}
                        disabled={isSelf || deleteUser.isPending}
                        title={isSelf ? 'You cannot delete your own account' : undefined}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const WatchesTab = () => {
  const {
    data: watches,
    isLoading,
    error,
  } = useQuery<Watch[]>({
    queryKey: ['admin', 'watches'],
    queryFn: () => api.get('/api/admin/watches'),
  });

  if (isLoading)
    return (
      <div className={styles.loading}>
        <Text variant="body">Loading watches...</Text>
      </div>
    );
  if (error)
    return (
      <div className={styles.error}>
        <Text variant="body">Failed to load watches</Text>
      </div>
    );
  if (!watches) return null;

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Sites</th>
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
              <td>
                {watch.sites
                  ?.map((s: { campsiteName: string }) => s.campsiteName)
                  .join(', ') || '—'}
              </td>
              <td>{watch.campgroundName}</td>
              <td className={styles.dates}>
                {watch.startDate} → {watch.endDate}
              </td>
              <td>
                <span
                  className={classNames(styles.badge, {
                    [styles.badgeActive]: watch.isActive,
                    [styles.badgeInactive]: !watch.isActive,
                  })}
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
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const {
    data: activities,
    isLoading,
    error,
  } = useQuery<Activity[]>({
    queryKey: ['admin', 'activity'],
    queryFn: () => api.get('/api/admin/activity'),
    refetchInterval: 5000,
  });

  if (isLoading)
    return (
      <div className={styles.loading}>
        <Text variant="body">Loading activity...</Text>
      </div>
    );
  if (error)
    return (
      <div className={styles.error}>
        <Text variant="body">Failed to load activity</Text>
      </div>
    );
  if (!activities) return null;

  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    if (filter === 'scheduler') {
      return (
        activity.type === 'scheduler_run' || activity.type === 'scheduler_event'
      );
    }
    if (filter === 'watches') return activity.type === 'watch_created';
    if (filter === 'users') return activity.type === 'user_registered';
    if (filter === 'notifications')
      return activity.type === 'notification_sent';
    return true;
  });

  return (
    <>
      <div className={styles.activityToolbar}>
        <label className={styles.activityFilterLabel} htmlFor="activity-filter">
          Filter:
        </label>
        <select
          id="activity-filter"
          className={styles.activityFilterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActivityFilter)}
        >
          <option value="all">All Activity</option>
          <option value="scheduler">Scheduler</option>
          <option value="watches">Watches</option>
          <option value="users">Users</option>
          <option value="notifications">Notifications</option>
        </select>
      </div>
      <div className={styles.activityList}>
        {filteredActivities.map((activity, idx) => {
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
                  {activity.type === 'notification_sent' &&
                    '📧 Notification Sent'}
                  {activity.type === 'scheduler_run' && (
                    <>
                      ⏱ Scheduler Run (
                      {details.status === 'success' ? '✓ Success' : '✗ Error'})
                    </>
                  )}
                  {activity.type === 'scheduler_event' && (
                    <>🧭 Scheduler Event ({details.eventType || 'event'})</>
                  )}
                </span>
                {activity.userEmail && (
                  <span className={styles.activityUser}>
                    {activity.userEmail}
                  </span>
                )}
                <div className={styles.activityDetails}>
                  {activity.type === 'watch_created' && (
                    <>{details.campgroundName}</>
                  )}
                  {activity.type === 'user_registered' && (
                    <>Display name: {details.displayName || 'Not set'}</>
                  )}
                  {activity.type === 'notification_sent' && (
                    <>
                      Channel: {details.channel}, Watch ID: {details.watchId}
                    </>
                  )}
                  {activity.type === 'scheduler_run' && (
                    <>
                      {details.groupsChecked != null
                        ? `${details.groupsChecked} watch groups checked`
                        : ''}
                      {details.errorMessage && ` — ${details.errorMessage}`}
                    </>
                  )}
                  {activity.type === 'scheduler_event' && (
                    <>
                      {details.message}
                      {details.metadata && ` — ${details.metadata}`}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredActivities.length === 0 && (
          <div className={styles.activityEmpty}>
            No activity for this filter yet.
          </div>
        )}
      </div>
    </>
  );
};

const EmailTab = () => {
  const { data: me } = useMe();
  const sendTestMutation = useMutation({
    mutationFn: () => api.post('/api/admin/notifications/test', {}),
  });

  return (
    <div className={styles.scheduler}>
      <div className={styles.schedulerCard}>
        <div className={styles.schedulerHeader}>
          <Text variant="h2" className={styles.schedulerTitle}>
            Test notification email
          </Text>
        </div>
        <div className={styles.schedulerInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Send to (your account):</span>
            <span className={styles.infoValue}>{me?.email || '—'}</span>
          </div>
          <p className={styles.emailDescription}>
            Sends a test email to verify that notification delivery is
            configured correctly (SMTP host, login and from-address).
          </p>
        </div>
        <div className={styles.schedulerActions}>
          <Button
            variant="primary"
            size="small"
            onClick={() => sendTestMutation.mutate()}
            disabled={sendTestMutation.isPending || !me?.email}
          >
            {sendTestMutation.isPending ? 'Sending...' : 'Send test email'}
          </Button>
          {sendTestMutation.isSuccess && (
            <span className={styles.statusSuccess}>
              ✓ Test email sent. Check your inbox.
            </span>
          )}
          {sendTestMutation.isError && (
            <span className={styles.statusError}>
              {sendTestMutation.error instanceof Error
                ? sendTestMutation.error.message
                : 'Failed to send'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SchedulerTab = () => {
  const queryClient = useQueryClient();

  const {
    data: status,
    isLoading,
    error,
  } = useQuery<SchedulerStatus>({
    queryKey: ['admin', 'scheduler', 'status'],
    queryFn: () => api.get('/api/admin/scheduler/status'),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const startMutation = useMutation({
    mutationFn: () => api.post('/api/admin/scheduler/start', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'scheduler', 'status'],
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => api.post('/api/admin/scheduler/stop', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'scheduler', 'status'],
      });
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => api.post('/api/admin/scheduler/restart', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'scheduler', 'status'],
      });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post('/api/admin/scheduler/trigger', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'scheduler', 'status'],
      });
    },
  });

  if (isLoading)
    return (
      <div className={styles.loading}>
        <Text variant="body">Loading scheduler status...</Text>
      </div>
    );
  if (error)
    return (
      <div className={styles.error}>
        <Text variant="body">Failed to load scheduler status</Text>
      </div>
    );
  if (!status) return null;

  return (
    <div className={styles.scheduler}>
      <div className={styles.schedulerCard}>
        <div className={styles.schedulerHeader}>
          <Text variant="h2" className={styles.schedulerTitle}>
            Availability Check Scheduler
          </Text>
          <span
            className={classNames(styles.schedulerStatus, {
              [styles.schedulerStatusRunning]: status.isRunning,
              [styles.schedulerStatusStopped]: !status.isRunning,
            })}
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
                  className={classNames(styles.infoValue, {
                    [styles.statusSuccess]: status.lastRunStatus === 'success',
                    [styles.statusError]: status.lastRunStatus === 'error',
                  })}
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
              <span className={styles.progressIndicator}>
                ⟳ Check in progress...
              </span>
            </div>
          )}
        </div>

        <div className={styles.schedulerActions}>
          <Button
            variant="outline"
            size="small"
            onClick={() => startMutation.mutate()}
            disabled={status.isRunning || startMutation.isPending}
          >
            {startMutation.isPending ? 'Starting...' : 'Start'}
          </Button>
          <Button
            variant="outline"
            level="danger"
            size="small"
            onClick={() => stopMutation.mutate()}
            disabled={!status.isRunning || stopMutation.isPending}
          >
            {stopMutation.isPending ? 'Stopping...' : 'Stop'}
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
          >
            {restartMutation.isPending ? 'Restarting...' : 'Restart'}
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => triggerMutation.mutate()}
            disabled={status.isCheckInProgress || triggerMutation.isPending}
          >
            {triggerMutation.isPending ? 'Triggering...' : 'Run Check Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};
