import { useAuthContext } from '../../context/AuthContext';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './Settings.module.scss';

export const Settings = () => {
  useDocumentTitle('Settings');
  const { user, signOut } = useAuthContext();

  return (
    <div className={styles.page}>
      <Text variant="h1" className={styles.title}>
        Settings
      </Text>
      <Text variant="body-sm" className={styles.subtitle} as="p">
        Manage your account and notification preferences.
      </Text>

      <div className={styles.section}>
        <Text variant="h2" className={styles.sectionTitle}>
          Account
        </Text>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <Text variant="body" className={styles.fieldValue} as="p">
            {user?.email || 'Not set'}
          </Text>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Display Name</label>
          <Text variant="body" className={styles.fieldValue} as="p">
            {user?.displayName || 'Not set'}
          </Text>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Account ID</label>
          <Text variant="body" className={styles.fieldValueMono} as="p">
            {user?.uid || 'N/A'}
          </Text>
        </div>
      </div>

      <div className={styles.section}>
        <Text variant="h2" className={styles.sectionTitle}>
          Notifications
        </Text>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email Notifications</label>
          <Text variant="body" className={styles.fieldDescription} as="p">
            You'll receive email alerts when watched campsites become available.
            Notifications are sent to <strong>{user?.email}</strong>.
          </Text>
        </div>
        <div className={styles.comingSoon}>
          <span className={styles.comingSoonIcon}>📱</span>
          <div>
            <strong>Push Notifications</strong>
            <Text variant="body" as="p">
              iOS push notifications coming soon.
            </Text>
          </div>
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
        <Button variant="outline" level="danger" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
};
