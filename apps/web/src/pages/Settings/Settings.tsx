import { useAuthContext } from '../../context/AuthContext';
import styles from './Settings.module.scss';

export const Settings = () => {
  const { user } = useAuthContext();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <p className={styles.subtitle}>Manage your account and notification preferences.</p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <p className={styles.fieldValue}>{user?.email || 'Not set'}</p>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Display Name</label>
          <p className={styles.fieldValue}>{user?.displayName || 'Not set'}</p>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Account ID</label>
          <p className={styles.fieldValueMono}>{user?.uid || 'N/A'}</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email Notifications</label>
          <p className={styles.fieldDescription}>
            You'll receive email alerts when watched campsites become available.
            Notifications are sent to <strong>{user?.email}</strong>.
          </p>
        </div>
        <div className={styles.comingSoon}>
          <span className={styles.comingSoonIcon}>📱</span>
          <div>
            <strong>Push Notifications</strong>
            <p>iOS push notifications coming soon.</p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <p className={styles.aboutText}>
          CampSight monitors campsite availability on Recreation.gov and sends
          you notifications when sites become available. Checks run every 15
          minutes.
        </p>
        <p className={styles.version}>Version 1.0.0</p>
      </div>
    </div>
  );
};
