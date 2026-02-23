import { createPortal } from 'react-dom';
import styles from './SelectionFooter.module.scss';

export interface SelectionFooterProps {
  clearLabel?: string;
  continueLabel: string;
  onClear: () => void;
  onContinue: () => void;
  visible: boolean;
  continueDisabled?: boolean;
}

export function SelectionFooter({
  clearLabel = 'Clear selection',
  continueLabel,
  onClear,
  onContinue,
  visible,
  continueDisabled = false,
}: SelectionFooterProps) {
  if (!visible || typeof document === 'undefined') return null;

  const footer = (
    <div className={styles.footer}>
      <div className={styles.content}>
        <button type="button" className={styles.clearBtn} onClick={onClear}>
          {clearLabel}
        </button>
        <button
          type="button"
          className={styles.continueBtn}
          onClick={onContinue}
          disabled={continueDisabled}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );

  return createPortal(footer, document.body);
}
