import { CampsiteSearchResult } from '@campsight/shared';
import styles from './Campsites.module.scss';

export interface CampsitesProps {
  facility: CampsiteSearchResult | null;
  campsites: CampsiteSearchResult[];
  selectedSite: CampsiteSearchResult | null;
  loading: boolean;
  onSelectSite: (site: CampsiteSearchResult) => void;
  onBack: () => void;
}

export function Campsites({
  facility,
  campsites,
  selectedSite,
  loading,
  onSelectSite,
  onBack,
}: CampsitesProps) {
  return (
    <div className={styles.root}>
      <label className={styles.label}>Select a campsite</label>
      {facility && (
        <div className={styles.selected}>{facility.campgroundName}</div>
      )}
      {loading ? (
        <p className={styles.hint}>Loading campsites...</p>
      ) : campsites.length > 0 ? (
        <div className={styles.campsiteGrid}>
          {campsites.map((site) => (
            <button
              key={site.campsiteId}
              type="button"
              className={`${styles.campsiteChip} ${
                selectedSite?.campsiteId === site.campsiteId
                  ? styles.campsiteChipSelected
                  : ''
              }`}
              onClick={() => onSelectSite(site)}
            >
              <span className={styles.chipName}>{site.campsiteName}</span>
              {site.loop && (
                <span className={styles.chipLoop}>{site.loop}</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.hint}>
          No campsites found for this campground.
        </p>
      )}
      <div className={styles.navRow}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
