import { CampsiteSearchResult } from '@campsight/shared';
import styles from './Campgrounds.module.scss';

export interface CampgroundsProps {
  searchResults: CampsiteSearchResult[];
  selectedFacility: CampsiteSearchResult | null;
  onSelectFacility: (facility: CampsiteSearchResult) => void;
  onChange: () => void;
  onBack: () => void;
}

export function Campgrounds({
  searchResults,
  selectedFacility,
  onSelectFacility,
  onChange,
  onBack,
}: CampgroundsProps) {
  return (
    <div className={styles.root}>
      <label className={styles.label}>Select a campground</label>
      {selectedFacility ? (
        <div className={styles.selected}>
          Selected: <strong>{selectedFacility.campgroundName}</strong>
          <button type="button" className={styles.changeBtn} onClick={onChange}>
            Change
          </button>
        </div>
      ) : (
        <p className={styles.hint}>
          {searchResults.length > 0
            ? 'Select a campground from your search results.'
            : 'Run a search in step 1 to see campgrounds.'}
        </p>
      )}
      {searchResults.length > 0 && !selectedFacility && (
        <ul className={styles.resultsList}>
          {searchResults.map((facility, i) => (
            <li key={`${facility.facilityId}-${i}`}>
              <button
                type="button"
                className={styles.resultItem}
                onClick={() => onSelectFacility(facility)}
              >
                <span className={styles.resultName}>
                  {facility.campgroundName}
                </span>
                <span className={styles.resultMeta}>
                  ID: {facility.facilityId}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.navRow}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
