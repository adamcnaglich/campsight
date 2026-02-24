import { CampsiteSearchResult } from '@campsight/shared';
import { SelectionFooter } from '../../../components/SelectionFooter';
import styles from './Review.module.scss';

const formatDateRange = (start: string, end: string): string => {
  if (!start || !end) return '';
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const startDate = new Date(y1, m1 - 1, d1);
  const endDate = new Date(y2, m2 - 1, d2);
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('en-US', options);
  const endStr = endDate.toLocaleDateString('en-US', options);
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startStr} - ${endDate.getDate()}`;
  }
  return `${startStr} - ${endStr}`;
};

const EditIcon = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
};

export interface ReviewProps {
  selectedFacility: CampsiteSearchResult | null;
  campgroundName: string;
  selectedSites: CampsiteSearchResult[];
  startDate: string;
  endDate: string;
  onEditCampground: () => void;
  onEditCampsites: () => void;
  onEditDates: () => void;
  onStartOver: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  hasError: boolean;
}

export const Review = ({
  selectedFacility,
  campgroundName,
  selectedSites,
  startDate,
  endDate,
  onEditCampground,
  onEditCampsites,
  onEditDates,
  onStartOver,
  onConfirm,
  isSubmitting,
  hasError,
}: ReviewProps) => {
  const formattedDates = formatDateRange(startDate, endDate);
  const siteNames = selectedSites
    .map((s) => s.campsiteName)
    .join(', ')
    .trim();

  return (
    <div className={styles.root}>
      <div className={styles.twoColumnLayout}>
        {/* Left column: heading + edit cards */}
        <div className={styles.leftColumn}>
          <h2 className={styles.heading}>Review & submit</h2>

          <div className={styles.cardList}>
            {/* Card 1: Campground (image, text, edit) */}
            <button
              type="button"
              className={styles.editCard}
              onClick={onEditCampground}
            >
              <div className={styles.cardImage}>
                <div className={styles.imagePlaceholder}>📷</div>
              </div>
              <div className={styles.cardText}>
                <span className={styles.cardRowTitle}>{campgroundName}</span>
                <span className={styles.cardRowLocation}>
                  {selectedFacility?.facilityId
                    ? `Facility ID: ${selectedFacility.facilityId}`
                    : 'Location not available'}
                </span>
                <span className={styles.cardRowRating}>
                  <span className={styles.stars}>
                    {'★'.repeat(5).split('').map((star, idx) => (
                      <span key={idx} className={styles.star}>
                        {star}
                      </span>
                    ))}
                  </span>
                  <span>N/A</span>
                </span>
              </div>
              <span className={styles.editIcon}>
                <EditIcon />
              </span>
            </button>

            {/* Card 2: Campsites (text, edit) */}
            <button
              type="button"
              className={styles.editCard}
              onClick={onEditCampsites}
            >
              <div className={styles.cardText}>
                <span className={styles.cardRowLabel}>
                  {selectedSites.length}{' '}
                  {selectedSites.length === 1 ? 'Campsite' : 'Campsites'}
                </span>
                <span className={styles.cardRowValue}>
                  {siteNames || 'No sites selected'}
                </span>
              </div>
              <span className={styles.editIcon}>
                <EditIcon />
              </span>
            </button>

            {/* Card 3: Timeframe (text, edit) */}
            <button
              type="button"
              className={styles.editCard}
              onClick={onEditDates}
            >
              <div className={styles.cardText}>
                <span className={styles.cardRowLabel}>Timeframe</span>
                <span className={styles.cardRowValue}>
                  {formattedDates || 'No dates selected'}
                </span>
              </div>
              <span className={styles.editIcon}>
                <EditIcon />
              </span>
            </button>
          </div>
        </div>

        {/* Right column: site image placeholder */}
        <div className={styles.rightColumn}>
          <div className={styles.siteImagePlaceholder}>
            <span className={styles.siteImageIcon}>🏕️</span>
            <p className={styles.siteImageText}>Site photo</p>
          </div>
        </div>
      </div>

      <SelectionFooter
        clearLabel="Start Over"
        continueLabel={isSubmitting ? 'Creating...' : 'Confirm Watch'}
        onClear={onStartOver}
        onContinue={onConfirm}
        visible={true}
        continueDisabled={isSubmitting}
      />
      {hasError && (
        <p className={styles.errorText}>
          Failed to create watch. Please try again.
        </p>
      )}
    </div>
  );
};
