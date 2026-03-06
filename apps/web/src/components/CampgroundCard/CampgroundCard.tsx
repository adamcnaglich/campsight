import { ReactNode } from 'react';
import classNames from 'classnames';
import { Text } from '../Text';
import styles from './CampgroundCard.module.scss';

export interface CampgroundCardProps {
  imageSrc?: string;
  imageAlt?: string;
  campsiteName?: string;
  campgroundName?: string;
  metaLeft?: ReactNode;
  badgeLabel?: string;
  badgeActive?: boolean;
  startDate?: string;
  endDate?: string;
  actions?: ReactNode;
  as?: 'div' | 'button';
  onClick?: () => void;
  className?: string;
}

export const CampgroundCard = ({
  imageSrc,
  imageAlt = '',
  campsiteName,
  campgroundName,
  metaLeft,
  badgeLabel,
  badgeActive,
  startDate,
  endDate,
  actions,
  as: Component = 'div',
  onClick,
  className,
}: CampgroundCardProps) => {
  const isButton = Component === 'button';
  const hasMeta = metaLeft != null || badgeLabel != null;
  const hasDates = startDate != null && endDate != null;

  const combinedClassName = classNames(
    styles.card,
    { [styles.cardButton]: isButton },
    className,
  );

  return (
    <Component
      className={combinedClassName}
      {...(isButton ? { type: 'button' as const, onClick } : {})}
    >
      {imageSrc && (
        <div className={styles.cardImage}>
          <img src={imageSrc} alt={imageAlt} width={336} height={240} />
        </div>
      )}

      <div
        className={classNames(styles.cardContent, {
          [styles.hasActions]: !!actions,
        })}
      >
        {hasMeta && (
          <div className={styles.cardMeta}>
            {metaLeft != null && (
              <Text variant="caption" as="span">
                {metaLeft}
              </Text>
            )}
            {badgeLabel != null && (
              <span
                className={classNames(styles.badge, {
                  [styles.badgeActive]: badgeActive,
                  [styles.badgeInactive]: !badgeActive,
                })}
              >
                {badgeLabel}
              </span>
            )}
          </div>
        )}

        {campsiteName && (
          <Text variant="h3" className={styles.campsiteName}>
            {campsiteName}
          </Text>
        )}

        {campgroundName && (
          <Text variant="body" className={styles.campgroundName} as="p">
            {campgroundName.toLowerCase()}
          </Text>
        )}

        {hasDates && (
          <div className={styles.dates}>
            <Text variant="caption" as="span">
              {startDate}
            </Text>
            <span className={styles.dateArrow}>→</span>
            <Text variant="caption" as="span">
              {endDate}
            </Text>
          </div>
        )}

        {actions && <div className={styles.cardActions}>{actions}</div>}
      </div>
    </Component>
  );
};
