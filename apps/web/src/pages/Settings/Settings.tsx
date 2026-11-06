import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useMe } from '../../hooks/useMe';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './Settings.module.scss';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const PasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const change = useMutation({
    mutationFn: () =>
      api.post('/api/auth/password', { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (change.isPending) return;
    if (newPassword !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    change.mutate();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="current-password">
          Current password
        </label>
        <input
          id="current-password"
          className={styles.input}
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="confirm-password">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {mismatch ? (
        <p className={styles.formError} role="alert">
          The two new passwords don't match
        </p>
      ) : null}
      {change.isError ? (
        <p className={styles.formError} role="alert">
          {change.error instanceof Error
            ? change.error.message
            : 'Could not change the password'}
        </p>
      ) : null}
      {change.isSuccess ? (
        <p className={styles.formSuccess} role="status">
          Password changed. Other devices were signed out.
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="outline" disabled={change.isPending}>
          {change.isPending ? 'Saving…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
};

export const Settings = () => {
  useDocumentTitle('Settings');
  const { data: me } = useMe();
  const { preference, setPreference } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = useMutation({
    mutationFn: () => api.post('/api/auth/logout', {}),
    onSettled: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <div className={styles.page}>
      <Text variant="h1" className={styles.title}>
        Settings
      </Text>
      <Text variant="body-sm" className={styles.subtitle} as="p">
        Your account, password and appearance.
      </Text>

      <div className={styles.section}>
        <Text variant="h2" className={styles.sectionTitle}>
          Account
        </Text>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <Text variant="body" className={styles.fieldValue} as="p">
            {me?.email || 'Not set'}
          </Text>
          <Text variant="body-sm" className={styles.fieldDescription} as="p">
            You sign in with this address, and alerts go here when a watched
            campsite opens up.
          </Text>
        </div>
        {me?.displayName ? (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Name</label>
            <Text variant="body" className={styles.fieldValue} as="p">
              {me.displayName}
            </Text>
          </div>
        ) : null}
      </div>

      <div className={styles.section}>
        <Text variant="h2" className={styles.sectionTitle}>
          Password
        </Text>
        <PasswordForm />
        {me?.isAdmin ? (
          <Text variant="body-sm" className={styles.fieldDescription} as="p">
            If <code>ADMIN_PASSWORD</code> is set on the server, it replaces
            this password at the next restart.
          </Text>
        ) : null}
      </div>

      <div className={styles.section}>
        <Text variant="h2" className={styles.sectionTitle}>
          Appearance
        </Text>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Theme</label>
          <div className={styles.themeOptions} role="group" aria-label="Theme">
            {THEME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={styles.themeOption}
                data-active={preference === value || undefined}
                onClick={() => setPreference(value)}
                aria-pressed={preference === value}
              >
                {label}
              </button>
            ))}
          </div>
          <Text variant="body-sm" className={styles.fieldDescription} as="p">
            System uses your device’s light or dark preference.
          </Text>
        </div>
      </div>

      <div className={styles.section}>
        <Text variant="h2" className={styles.sectionTitle}>
          About
        </Text>
        <Text variant="body" className={styles.aboutText} as="p">
          CampSight monitors campsite availability on Recreation.gov and sends
          you notifications when sites become available. Checks run every 15
          minutes.
        </Text>
        <Text variant="body-sm" className={styles.version} as="p">
          Version 1.0.0
        </Text>
      </div>

      <div className={styles.signOutSection}>
        <Button
          variant="outline"
          level="danger"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
};
