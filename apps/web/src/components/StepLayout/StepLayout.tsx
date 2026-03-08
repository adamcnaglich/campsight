import { ReactNode } from 'react';
import { Text } from '../Text';
import styles from './StepLayout.module.scss';

export interface StepLayoutProps {
  heading?: ReactNode;
  headingAction?: ReactNode;
  left: ReactNode;
  right: ReactNode;
  footer?: ReactNode;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  className?: string;
}

export const StepLayout = ({
  heading,
  headingAction,
  left,
  right,
  footer,
  emptyState,
  isEmpty,
  loading,
  loadingMessage = 'Loading...',
  className,
}: StepLayoutProps) => {
  return (
    <div className={`${styles.root}${className ? ` ${className}` : ''}`}>
      {loading ? (
        <Text variant="body-sm" className={styles.hint} as="p">
          {loadingMessage}
        </Text>
      ) : isEmpty ? (
        emptyState
      ) : (
        <div className={styles.twoColumnLayout}>
          <div className={styles.leftColumn}>
            {heading && (
              <div className={styles.headingContainer}>
                {typeof heading === 'string' ? (
                  <Text variant="h1" className={styles.heading}>
                    {heading}
                  </Text>
                ) : (
                  heading
                )}
                {headingAction}
              </div>
            )}
            {left}
          </div>
          <div className={styles.rightColumn}>{right}</div>
        </div>
      )}
      {footer}
    </div>
  );
};
