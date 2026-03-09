import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
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
  /** Optional search bar (e.g. for steps 2 and 3). When set, headingAction moves to the same row as the search input. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
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
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
}: StepLayoutProps) => {
  const showSearch =
    onSearchChange != null && searchValue !== undefined;

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
            {heading != null && (
              <div
                className={
                  showSearch
                    ? `${styles.headingContainer} ${styles.headingContainerWithSearch}`
                    : `${styles.headingContainer} ${styles.headingContainerNoSearch}`
                }
              >
                {typeof heading === 'string' ? (
                  <Text variant="h1" className={styles.heading}>
                    {heading}
                  </Text>
                ) : (
                  heading
                )}
                {!showSearch && headingAction}
              </div>
            )}
            {showSearch && (
              <div
                className={`${styles.searchRow} ${styles.searchRowNoIndent} ${styles.searchRowAlignCards}`}
              >
                <div className={styles.searchInputWrapper}>
                  <span className={styles.searchIcon} aria-hidden>
                    <Search size={20} />
                  </span>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className={
                      searchValue.trim().length > 0
                        ? `${styles.searchInput} ${styles.searchInputWithClear}`
                        : styles.searchInput
                    }
                    autoComplete="off"
                  />
                  {searchValue.trim().length > 0 && (
                    <button
                      type="button"
                      className={styles.searchClearButton}
                      onClick={() => onSearchChange('')}
                      aria-label="Clear search"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
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
