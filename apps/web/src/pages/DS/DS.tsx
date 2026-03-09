import { Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import type { ButtonVariant, ButtonLevel } from '../../components/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './DS.module.scss';

const VARIANTS: ButtonVariant[] = ['primary', 'outline', 'ghost'];

const LEVELS: ButtonLevel[] = ['success', 'danger'];

const SIZES = ['compact', 'small', 'medium', 'large'] as const;

const ButtonSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className={styles.section}>
    <Text variant="h3" className={styles.sectionTitle}>
      {title}
    </Text>
    <div className={styles.sectionContent}>{children}</div>
  </section>
);

export const DS = () => {
  useDocumentTitle('Design System');
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Text variant="h1" className={styles.title}>
          Design System
        </Text>
        <Text variant="body" className={styles.subtitle}>
          Button component permutations
        </Text>
      </header>

      <ButtonSection title="Variants">
        <div className={styles.grid}>
          {VARIANTS.map((variant) => (
            <div key={variant} className={styles.item}>
              <Text variant="body-sm" className={styles.label}>
                {variant}
              </Text>
              <Button variant={variant}>{variant}</Button>
            </div>
          ))}
        </div>
      </ButtonSection>

      <ButtonSection title="Levels">
        <div className={styles.grid}>
          {LEVELS.map((level) => (
            <div key={level} className={styles.item}>
              <Text variant="body-sm" className={styles.label}>
                {level}
              </Text>
              <Button variant="primary" level={level}>
                {level}
              </Button>
            </div>
          ))}
          <div className={styles.item}>
            <Text variant="body-sm" className={styles.label}>
              outline + danger
            </Text>
            <Button variant="outline" level="danger">
              Delete
            </Button>
          </div>
        </div>
      </ButtonSection>

      <ButtonSection title="Sizes">
        <div className={styles.grid}>
          {SIZES.map((size) => (
            <div key={size} className={styles.item}>
              <Text variant="body-sm" className={styles.label}>
                {size}
              </Text>
              <Button size={size} variant="primary">
                {size}
              </Button>
            </div>
          ))}
        </div>
      </ButtonSection>

      <ButtonSection title="States">
        <div className={styles.grid}>
          <div className={styles.item}>
            <Text variant="body-sm" className={styles.label}>
              default
            </Text>
            <Button variant="primary">Default</Button>
          </div>
          <div className={styles.item}>
            <Text variant="body-sm" className={styles.label}>
              disabled
            </Text>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </div>
      </ButtonSection>

      <ButtonSection title="With icon">
        <div className={styles.grid}>
          {VARIANTS.map((variant) => (
            <div key={variant} className={styles.item}>
              <Text variant="body-sm" className={styles.label}>
                {variant}
              </Text>
              <Button
                variant={variant}
                icon={<Plus size={16} aria-hidden />}
              >
                Add item
              </Button>
            </div>
          ))}
        </div>
      </ButtonSection>

      <ButtonSection title="Width modifiers">
        <div className={styles.stack}>
          <div className={styles.item}>
            <Text variant="body-sm" className={styles.label}>
              fullWidth
            </Text>
            <Button variant="primary" fullWidth>
              Full width button
            </Button>
          </div>
          <div className={styles.item}>
            <Text variant="body-sm" className={styles.label}>
              fullWidthOnMobile (resize to &lt;480px)
            </Text>
            <Button variant="outline" fullWidthOnMobile>
              Full width on mobile
            </Button>
          </div>
        </div>
      </ButtonSection>

      <ButtonSection title="All variants × sizes">
        <div className={styles.table}>
          <div className={styles.tableRow}>
            <div className={styles.tableCell} />
            {SIZES.map((size) => (
              <div key={size} className={styles.tableCell}>
                <Text variant="caption">{size}</Text>
              </div>
            ))}
          </div>
          {VARIANTS.map((variant) => (
            <div key={variant} className={styles.tableRow}>
              <div className={styles.tableCell}>
                <Text variant="body-sm">{variant}</Text>
              </div>
              {SIZES.map((size) => (
                <div key={size} className={styles.tableCell}>
                  <Button variant={variant} size={size}>
                    Label
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ButtonSection>
    </div>
  );
};
