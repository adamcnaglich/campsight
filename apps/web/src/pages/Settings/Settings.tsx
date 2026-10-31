import { useMe } from '../../hooks/useMe';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './Settings.module.scss';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const Settings = () => {
  useDocumentTitle('Settings');
  const { data: me } = useMe();
  const { preference, setPreference } = useTheme();

  return (
    <div className={styles.page}>
      <Text variant="h1" className={styles.title}>
        Settings
      </Text>
      <Text variant="body-sm" className={styles.subtitle} as="p">
        Appearance and notification preferences.
      </Text>

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
          Notifications
        </Text>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <Text variant="body" className={styles.fieldValue} as="p">
            {me?.email || 'Not set'}
          </Text>
          <Text variant="body-sm" className={styles.fieldDescription} as="p">
            Alerts go here when a watched campsite opens up. Set with the{' '}
            <code>NOTIFY_EMAIL</code> environment variable.
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
    </div>
  );
};
