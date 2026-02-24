import { ElementType, ReactNode, ButtonHTMLAttributes } from 'react';
import classNames from 'classnames';
import styles from './Button.module.scss';

export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'subtle'
  | 'danger'
  | 'outlineDanger';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'as'> {
  variant?: ButtonVariant;
  /** Render as another element, e.g. Link */
  as?: ElementType;
  /** Padding by size only: default = 12px 24px, small = 10px 20px, compact = 6px 14px */
  size?: 'compact' | 'small' | 'medium' | 'large';
  /** Full width (100%) */
  fullWidth?: boolean;
  /** Full width on mobile breakpoint (480px) */
  fullWidthOnMobile?: boolean;
  /** Active/selected state (e.g. current nav page) */
  active?: boolean;
  /** Icon rendered before children */
  icon?: ReactNode;
}

const VARIANT_STYLE: Record<ButtonVariant, string> = {
  primary: styles.primary,
  outline: styles.outline,
  subtle: styles.subtle,
  danger: styles.danger,
  outlineDanger: styles.outlineDanger,
};

const SIZE_STYLE: Partial<Record<NonNullable<ButtonProps['size']>, string>> = {
  compact: styles.compact,
  small: styles.small,
  medium: styles.medium,
  large: styles.large,
};

export const Button = ({
  variant = 'primary',
  size = 'small',
  fullWidth,
  fullWidthOnMobile,
  active,
  icon,
  as: Component = 'button',
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) => {
  const variantClass = VARIANT_STYLE[variant];
  const sizeClass = SIZE_STYLE[size];
  const widthClass = fullWidth
    ? styles.fullWidth
    : fullWidthOnMobile
      ? styles.fullWidthOnMobile
      : undefined;
  const combinedClassName = classNames(
    styles.button,
    variantClass,
    sizeClass,
    widthClass,
    { [styles.active]: active },
    className,
  );

  const componentProps =
    Component === 'button'
      ? { type, ...rest }
      : (rest as Record<string, unknown>);

  return (
    <Component className={combinedClassName} {...componentProps}>
      {icon}
      {children}
    </Component>
  );
};
