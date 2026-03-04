import { CampsiteSearchResult } from '@campsight/shared';
import classNames from 'classnames';
import { Text } from '../../../components/Text';
import styles from './Campgrounds.module.scss';

export interface CampgroundsProps {
  searchDisplayName: string;
  searchResults: CampsiteSearchResult[];
  selectedFacility: CampsiteSearchResult | null;
  onSelectFacility: (facility: CampsiteSearchResult) => void;
  onChange: () => void;
}

export const Campgrounds = ({
  searchDisplayName,
  searchResults,
  selectedFacility,
  onSelectFacility,
}: CampgroundsProps) => {
  return (
    <div className={styles.root}>
      {searchResults.length > 0 ? (
        <div className={styles.twoColumnLayout}>
          <div className={styles.listColumn}>
            {(selectedFacility?.campgroundName || searchDisplayName) && (
              <Text variant="h1" className={styles.heading}>
                {selectedFacility?.campgroundName || searchDisplayName}
              </Text>
            )}
            <ul className={styles.resultsList}>
              {searchResults.map((facility, i) => {
                const isSelected =
                  selectedFacility?.facilityId === facility.facilityId;
                return (
                  <li key={`${facility.facilityId}-${i}`}>
                    <button
                      type="button"
                      className={classNames(styles.resultCard, {
                        [styles.resultCardSelected]: isSelected,
                      })}
                      onClick={() => onSelectFacility(facility)}
                    >
                      <div className={styles.cardPhoto}>
                        <div className={styles.photoPlaceholder}>📷</div>
                      </div>
                      <div className={styles.cardContent}>
                        <Text variant="h3">{facility.campgroundName}</Text>
                        <Text
                          variant="body"
                          className={styles.cardLocation}
                          as="p"
                        >
                          {facility.facilityId
                            ? `Facility ID: ${facility.facilityId}`
                            : 'Location not available'}
                        </Text>
                        <div className={styles.cardRating}>
                          <div className={styles.stars}>
                            {'★'
                              .repeat(5)
                              .split('')
                              .map((star, idx) => (
                                <span key={idx} className={styles.star}>
                                  {star}
                                </span>
                              ))}
                          </div>
                          <Text
                            variant="caption"
                            className={styles.ratingNumber}
                          >
                            (N/A)
                          </Text>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className={styles.mapColumn}>
            <div className={styles.mapPlaceholder}>
              <span className={styles.mapIcon}>🗺️</span>
              <Text variant="body-sm" className={styles.mapText} as="p">
                Map view coming soon
              </Text>
            </div>
          </div>
        </div>
      ) : (
        <Text variant="body-sm" className={styles.hint} as="p">
          Run a search in step 1 to see campgrounds.
        </Text>
      )}
    </div>
  );
};
