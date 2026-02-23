import { CampsiteSearchResult } from '@campsight/shared';
import styles from './Review.module.scss';

export interface ReviewProps {
  selectedSite: CampsiteSearchResult | null;
  campgroundName: string;
  startDate: string;
  endDate: string;
  onBack: () => void;
  isSubmitting: boolean;
  hasError: boolean;
}

export function Review({
  selectedSite,
  campgroundName,
  startDate,
  endDate,
  onBack,
  isSubmitting,
  hasError,
}: ReviewProps) {
  return (
    <div className={styles.root}>
      <label className={styles.label}>Review & submit</label>
      <div className={styles.reviewSummary}>
        <p>
          <strong>Campsite:</strong> {selectedSite?.campsiteName}
        </p>
        <p>
          <strong>Campground:</strong> {campgroundName}
        </p>
        <p>
          <strong>Dates:</strong> {startDate} to {endDate}
        </p>
      </div>
      <div className={styles.navRow}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Back
        </button>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Start Watching'}
        </button>
      </div>
      {hasError && (
        <p className={styles.errorText}>
          Failed to create watch. Please try again.
        </p>
      )}
    </div>
  );
}
