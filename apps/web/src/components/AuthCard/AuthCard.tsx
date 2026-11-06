import { ReactNode } from 'react';
import { Text } from '../Text';
import styles from './AuthCard.module.scss';

interface AuthCardProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

/** Centered card used by the signed-out screens (sign in, accept invite). */
export const AuthCard = ({ title, subtitle, children }: AuthCardProps) => (
  <div className={styles.container}>
    <div className={styles.card}>
      <div className={styles.logoSection}>
        <span className={styles.logoIcon}>🏕️</span>
        <Text variant="h1" className={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" className={styles.subtitle} as="p">
            {subtitle}
          </Text>
        ) : null}
      </div>
      {children}
    </div>
  </div>
);

export { styles as authStyles };
