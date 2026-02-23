import styles from './SelectionFooter.module.scss';

export interface SelectionFooterProps {
  clearLabel?: string;
  continueLabel: string;
  onClear: () => void;
  onContinue: () => void;
  visible: boolean;
}

export function SelectionFooter({
  clearLabel = 'Clear selection',
  continueLabel,
  onClear,
  onContinue,
  visible,
}: SelectionFooterProps) {
  if (!visible) return null;

  return (
    <div className={styles.footer}>
      <div className={styles.content}>
        <button type="button" className={styles.clearBtn} onClick={onClear}>
          {clearLabel}
        </button>
        <button type="button" className={styles.continueBtn} onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
