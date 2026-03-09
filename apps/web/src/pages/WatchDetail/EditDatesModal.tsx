import { useCallback, useState, useEffect } from 'react';
import { Button } from '../../components/Button';
import { DateRangePicker } from '../../components/DateRangePicker';
import { Text } from '../../components/Text';
import styles from './EditDatesModal.module.scss';

export interface EditDatesModalProps {
  isOpen: boolean;
  startDate: string;
  endDate: string;
  onSave: (startDate: string, endDate: string) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export const EditDatesModal = ({
  isOpen,
  startDate,
  endDate,
  onSave,
  onClose,
  isSaving = false,
}: EditDatesModalProps) => {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  useEffect(() => {
    if (isOpen) {
      setLocalStart(startDate);
      setLocalEnd(endDate);
    }
  }, [isOpen, startDate, endDate]);

  const canSave = !!localStart && !!localEnd;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave(localStart, localEnd);
  }, [canSave, localStart, localEnd, onSave]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dates-title"
    >
      <div className={styles.panel}>
        <Text variant="h2" id="edit-dates-title" className={styles.title}>
          Edit timeframe
        </Text>
        <div className={styles.pickerWrapper}>
          <DateRangePicker
            startDate={localStart}
            endDate={localEnd}
            onRangeChange={(start, end) => {
              setLocalStart(start);
              setLocalEnd(end);
            }}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            type="button"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
