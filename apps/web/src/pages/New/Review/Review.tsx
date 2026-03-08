import {
  CampgroundSearchResult,
  CampsiteSearchResult,
} from '@campsight/shared';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { Text } from '../../../components/Text';
import { StepLayout } from '../../../components/StepLayout';
import { formatDateRange } from '../../../lib/dateUtils';
import styles from './Review.module.scss';

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
  selectedFacility: CampgroundSearchResult | null;
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
    .map((s) => s.name)
    .join(', ')
    .trim();

  const campgroundImageUrl = selectedFacility?.previewImageUrl ?? null;

  return (
    <StepLayout
      heading="Review & Confirm"
      left={
        <div className={styles.cardList}>
          <button
            type="button"
            className={styles.editCard}
            onClick={onEditCampground}
          >
            <div className={styles.cardText}>
              <Text variant="h3" className={styles.cardRowTitle}>
                {campgroundName.toLowerCase()}
              </Text>
              <Text variant="body" className={styles.cardRowLocation} as="p">
                {selectedFacility?.city || selectedFacility?.stateCode
                  ? [selectedFacility.city, selectedFacility.stateCode]
                      .filter(Boolean)
                      .join(', ')
                  : 'Location not available'}
              </Text>
            </div>
            <span className={styles.editIcon}>
              <EditIcon />
            </span>
          </button>

          <button
            type="button"
            className={styles.editCard}
            onClick={onEditCampsites}
          >
            <div className={styles.cardText}>
              <Text variant="h3" className={styles.cardRowLabel}>
                {selectedSites.length}{' '}
                {selectedSites.length === 1 ? 'Campsite' : 'Campsites'}
              </Text>
              <Text variant="body" className={styles.cardRowValue}>
                {siteNames || 'No sites selected'}
              </Text>
            </div>
            <span className={styles.editIcon}>
              <EditIcon />
            </span>
          </button>

          <button
            type="button"
            className={styles.editCard}
            onClick={onEditDates}
          >
            <div className={styles.cardText}>
              <Text variant="h3" className={styles.cardRowLabel}>
                Timeframe
              </Text>
              <Text variant="body" className={styles.cardRowValue}>
                {formattedDates || 'No dates selected'}
              </Text>
            </div>
            <span className={styles.editIcon}>
              <EditIcon />
            </span>
          </button>
        </div>
      }
      right={
        <div className={styles.singleImageWrapper}>
          {campgroundImageUrl ? (
            <img
              src={campgroundImageUrl}
              alt={campgroundName}
              className={styles.siteImage}
            />
          ) : (
            <div className={styles.siteImagePlaceholder}>
              <span className={styles.siteImageIcon}>🏕️</span>
              <Text
                variant="body-sm"
                className={styles.siteImageText}
                as="p"
              >
                Campground photo
              </Text>
            </div>
          )}
        </div>
      }
      footer={
        <>
          <SelectionFooter
            clearLabel="Start Over"
            continueLabel={isSubmitting ? 'Creating...' : 'Confirm Watch'}
            onClear={onStartOver}
            onContinue={onConfirm}
            visible={true}
            continueDisabled={isSubmitting}
          />
          {hasError && (
            <Text variant="body-sm" className={styles.errorText} as="p">
              Failed to create watch. Please try again.
            </Text>
          )}
        </>
      }
    />
  );
};
