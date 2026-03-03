import { ElementType, ReactNode, ButtonHTMLAttributes } from 'react';
import classNames from 'classnames';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';
export type ButtonLevel = 'success' | 'danger';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'as'> {
  /** Variant of the button */
  variant?: ButtonVariant;
  /** Level of the button */
  level?: ButtonLevel;
  /** Render as another element, e.g. Link */
  as?: ElementType;
  /** Padding by size only: default = 12px 24px, small = 10px 20px, compact = 6px 14px */
  size?: 'compact' | 'small' | 'medium' | 'large';
  /** Full width (100%) */
  fullWidth?: boolean;
  /** Full width on mobile breakpoint (480px) */
  fullWidthOnMobile?: boolean;
  /** Icon rendered before children */
  icon?: ReactNode;
}

const VARIANT_STYLE: Record<ButtonVariant, string> = {
  primary: styles.primary,
  outline: styles.outline,
  ghost: styles.ghost,
};

const LEVEL_STYLE: Record<ButtonLevel, string> = {
  success: styles.success,
  danger: styles.danger,
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
  level,
  fullWidth,
  fullWidthOnMobile,
  icon,
  as: Component = 'button',
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) => {
  const variantClass = VARIANT_STYLE[variant];
  const levelClass = level ? LEVEL_STYLE[level] : undefined;
  const sizeClass = SIZE_STYLE[size];
  const widthClass = fullWidth
    ? styles.fullWidth
    : fullWidthOnMobile
      ? styles.fullWidthOnMobile
      : undefined;
  const combinedClassName = classNames(
    styles.button,
    variantClass,
    levelClass,
    sizeClass,
    widthClass,
    className,
    { [styles.hasIcon]: !!icon },
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
