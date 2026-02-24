import { HTMLAttributes, ElementType } from 'react';
import classNames from 'classnames';
import styles from './Text.module.scss';

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'body'
  | 'body-sm'
  | 'caption';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant: TextVariant;
  as?: ElementType;
  className?: string;
  children?: React.ReactNode;
}

const VARIANT_ELEMENT: Record<TextVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  body: 'p',
  'body-sm': 'span',
  caption: 'span',
};

const VARIANT_STYLE: Record<TextVariant, string> = {
  h1: styles.h1,
  h2: styles.h2,
  h3: styles.h3,
  h4: styles.h4,
  h5: styles.h5,
  body: styles.body,
  'body-sm': styles.bodySm,
  caption: styles.caption,
};

export const Text = ({
  variant,
  as,
  className,
  children,
  ...rest
}: TextProps) => {
  const Component = (as ?? VARIANT_ELEMENT[variant]) as ElementType;
  const variantClass = VARIANT_STYLE[variant];
  const combinedClassName = classNames(variantClass, className) || undefined;

  return (
    <Component className={combinedClassName || undefined} {...rest}>
      {children}
    </Component>
  );
};
