import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './AccessApproved.module.scss';

export const AccessApproved = () => {
  useDocumentTitle('Access approved');
  const { user, refetchAccessStatus } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      refetchAccessStatus();
    }
  }, [user, refetchAccessStatus]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoSection}>
          <span className={styles.logoIcon}>✓</span>
          <Text variant="h2" className={styles.title} as="h1">
            Access approved
          </Text>
        </div>
        <Text variant="body" className={styles.message} as="p">
          You've approved access for this user. They can now sign in to
          CampSight and use the app.
        </Text>
        {user ? (
          <Button
            variant="primary"
            fullWidth
            className={styles.primaryAction}
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            Go to dashboard
          </Button>
        ) : (
          <Button
            as={({ children, className, ...props }) => (
              <Link to="/" className={className} {...props}>
                {children}
              </Link>
            )}
            variant="primary"
            fullWidth
            className={styles.primaryAction}
          >
            Back to CampSight
          </Button>
        )}
      </div>
    </div>
  );
};
