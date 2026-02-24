import { CampsiteSearchResult } from '@campsight/shared';
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
              <h2 className={styles.heading}>
                {selectedFacility?.campgroundName || searchDisplayName}
              </h2>
            )}
            <ul className={styles.resultsList}>
              {searchResults.map((facility, i) => {
                const isSelected =
                  selectedFacility?.facilityId === facility.facilityId;
                return (
                  <li key={`${facility.facilityId}-${i}`}>
                    <button
                      type="button"
                      className={`${styles.resultCard} ${isSelected ? styles.resultCardSelected : ''}`}
                      onClick={() => onSelectFacility(facility)}
                    >
                      <div className={styles.cardPhoto}>
                        <div className={styles.photoPlaceholder}>📷</div>
                      </div>
                      <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>
                          {facility.campgroundName}
                        </h3>
                        <p className={styles.cardLocation}>
                          {facility.facilityId
                            ? `Facility ID: ${facility.facilityId}`
                            : 'Location not available'}
                        </p>
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
                          <span className={styles.ratingNumber}>N/A</span>
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
              <p className={styles.mapText}>Map view coming soon</p>
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.hint}>
          Run a search in step 1 to see campgrounds.
        </p>
      )}
    </div>
  );
};
