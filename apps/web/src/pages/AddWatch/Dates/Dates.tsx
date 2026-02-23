import { CampsiteSearchResult } from '@campsight/shared';
import { SelectionFooter } from '../../../components/SelectionFooter';
import styles from './Dates.module.scss';

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('en-US', options);
  const endStr = endDate.toLocaleDateString('en-US', options);
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startStr} - ${endDate.getDate()}`;
  }
  return `${startStr} - ${endStr}`;
}

export interface DatesProps {
  selectedSite: CampsiteSearchResult | null;
  selectedSitesCount: number;
  campgroundName: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClearSelection: () => void;
  onContinue: () => void;
}

export function Dates({
  selectedSite,
  selectedSitesCount,
  campgroundName,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearSelection,
  onContinue,
}: DatesProps) {
  const canProceed = !!startDate && !!endDate;
  const continueLabel = canProceed
    ? `Continue with ${formatDateRange(startDate, endDate)}`
    : '';

  return (
    <div className={styles.root}>
      <label className={styles.label}>Select your timeframe</label>
      {selectedSite && (
        <div className={styles.selected}>
            {campgroundName} • {selectedSitesCount} {selectedSitesCount === 1 ? 'Site' : 'Sites'}
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
      <SelectionFooter
        continueLabel={continueLabel}
        onClear={onClearSelection}
        onContinue={onContinue}
        visible={canProceed}
      />
    </div>
  );
}
