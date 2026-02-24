import { createPortal } from 'react-dom';
import { Button } from '../Button';
import styles from './SelectionFooter.module.scss';

export interface SelectionFooterProps {
  clearLabel?: string;
  continueLabel: string;
  onClear: () => void;
  onContinue: () => void;
  visible: boolean;
  continueDisabled?: boolean;
}

export const SelectionFooter = ({
  clearLabel = 'Clear selection',
  continueLabel,
  onClear,
  onContinue,
  visible,
  continueDisabled = false,
}: SelectionFooterProps) => {
  if (!visible || typeof document === 'undefined') return null;

  const footer = (
    <div className={styles.footer}>
      <div className={styles.content}>
        <Button variant="outline" fullWidthOnMobile onClick={onClear}>
          {clearLabel}
        </Button>
        <Button
          variant="primary"
          fullWidthOnMobile
          onClick={onContinue}
          disabled={continueDisabled}
        >
          {continueLabel}
        </Button>
      </div>
    </div>
  );

  return createPortal(footer, document.body);
};
