import { useAuthContext } from '../../context/AuthContext';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import styles from './Request.module.scss';

export const Request = () => {
  const { signOut } = useAuthContext();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoSection}>
          <span className={styles.logoIcon}>🏕️</span>
          <Text variant="h2" className={styles.title} as="h1">
            Access requested
          </Text>
        </div>
        <Text variant="body" className={styles.message} as="p">
          Your access request has been sent to the team and will be reviewed.
          You'll get access once approved.
        </Text>
        <Button
          variant="outline"
          fullWidth
          className={styles.signOut}
          onClick={signOut}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
};
