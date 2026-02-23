import { CampsiteSearchResult } from '@campsight/shared';
import { SelectionFooter } from '../../../components/SelectionFooter';
import styles from './Campsites.module.scss';

export interface CampsitesProps {
  facility: CampsiteSearchResult | null;
  campsites: CampsiteSearchResult[];
  selectedSites: CampsiteSearchResult[];
  loading: boolean;
  onToggleSite: (site: CampsiteSearchResult) => void;
  onClearSelection: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export function Campsites({
  facility,
  campsites,
  selectedSites,
  loading,
  onToggleSite,
  onClearSelection,
  onContinue,
  onBack,
}: CampsitesProps) {
  const hasSelection = selectedSites.length > 0;

  return (
    <div className={styles.root}>
      {loading ? (
        <p className={styles.hint}>Loading campsites...</p>
      ) : campsites.length > 0 ? (
        <div className={styles.twoColumnLayout}>
          <div className={styles.listColumn}>
            {facility && (
              <h2 className={styles.heading}>{facility.campgroundName}</h2>
            )}
            <ul className={styles.campsiteList}>
              {campsites.map((site) => {
                const isSelected = selectedSites.some(
                  (s) => s.campsiteId === site.campsiteId,
                );
                return (
                  <li key={site.campsiteId}>
                    <button
                      type="button"
                      className={`${styles.campsiteCard} ${isSelected ? styles.campsiteCardSelected : ''}`}
                      onClick={() => onToggleSite(site)}
                    >
                      <div className={styles.cardPhoto}>
                        <div className={styles.photoPlaceholder}>🏕️</div>
                      </div>
                      <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>
                          {site.campsiteName}
                        </h3>
                        <p className={styles.cardLocation}>
                          {site.loop
                            ? `Loop: ${site.loop}`
                            : 'Loop not specified'}
                        </p>
                        <div className={styles.cardType}>
                          <span className={styles.typeLabel}>Type:</span>
                          <span className={styles.typeValue}>
                            {site.type || 'N/A'}
                          </span>
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
        <p className={styles.hint}>No campsites found for this campground.</p>
      )}

      <SelectionFooter
        continueLabel={`Continue with ${selectedSites.length} ${selectedSites.length === 1 ? 'Site' : 'Sites'}`}
        onClear={onClearSelection}
        onContinue={onContinue}
        visible={hasSelection}
      />
    </div>
  );
}
