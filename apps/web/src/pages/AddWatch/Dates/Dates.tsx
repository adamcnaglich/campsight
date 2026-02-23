import { CampsiteSearchResult } from '@campsight/shared';
import styles from './Dates.module.scss';

export interface DatesProps {
  selectedSite: CampsiteSearchResult | null;
  campgroundName: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Dates({
  selectedSite,
  campgroundName,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onBack,
  onNext,
}: DatesProps) {
  const canProceed = !!startDate && !!endDate;

  return (
    <div className={styles.root}>
      <label className={styles.label}>Set your date range</label>
      {selectedSite && (
        <div className={styles.selected}>
          {selectedSite.campsiteName} at {campgroundName}
        </div>
      )}
      <div className={styles.dateRow}>
        <div className={styles.dateField}>
          <label className={styles.dateLabel}>Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.dateField}>
          <label className={styles.dateLabel}>End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={styles.input}
            min={startDate}
            required
          />
        </div>
      </div>
      <div className={styles.navRow}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={() => canProceed && onNext()}
          disabled={!canProceed}
        >
          Next
        </button>
      </div>
    </div>
  );
}
