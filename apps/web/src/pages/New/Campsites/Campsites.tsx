import { CampsiteSearchResult } from '@campsight/shared';
import classNames from 'classnames';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { Text } from '../../../components/Text';
import styles from './Campsites.module.scss';

export interface CampsitesProps {
  facility: CampsiteSearchResult | null;
  campsites: CampsiteSearchResult[];
  selectedSites: CampsiteSearchResult[];
  loading: boolean;
  onToggleSite: (site: CampsiteSearchResult) => void;
  onClearSelection: () => void;
  onContinue: () => void;
}

export const Campsites = ({
  facility,
  campsites,
  selectedSites,
  loading,
  onToggleSite,
  onClearSelection,
  onContinue,
}: CampsitesProps) => {
  const hasSelection = selectedSites.length > 0;

  return (
    <div className={styles.root}>
      {loading ? (
        <Text variant="body-sm" className={styles.hint} as="p">
          Loading campsites...
        </Text>
      ) : campsites.length > 0 ? (
        <div className={styles.twoColumnLayout}>
          <div className={styles.listColumn}>
            {facility && (
              <Text variant="h3" className={styles.heading}>
                {facility.campgroundName}
              </Text>
            )}
            <ul
              className={classNames(styles.campsiteList, {
                [styles.campsiteListWithFooter]: hasSelection,
              })}
            >
              {campsites.map((site) => {
                const isSelected = selectedSites.some(
                  (s) => s.campsiteId === site.campsiteId,
                );
                return (
                  <li key={site.campsiteId}>
                    <button
                      type="button"
                      className={classNames(styles.campsiteCard, {
                        [styles.campsiteCardSelected]: isSelected,
                      })}
                      onClick={() => onToggleSite(site)}
                    >
                      <div className={styles.cardPhoto}>
                        <div className={styles.photoPlaceholder}>🏕️</div>
                      </div>
                      <div className={styles.cardContent}>
                        <Text variant="h5" className={styles.cardTitle}>
                          {site.campsiteName}
                        </Text>
                        <Text
                          variant="body-sm"
                          className={styles.cardLocation}
                          as="p"
                        >
                          {site.loop
                            ? `Loop: ${site.loop}`
                            : 'Loop not specified'}
                        </Text>
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
              <Text variant="body-sm" className={styles.mapText} as="p">
                Map view coming soon
              </Text>
            </div>
          </div>
        </div>
      ) : (
        <Text variant="body-sm" className={styles.hint} as="p">
          No campsites found for this campground.
        </Text>
      )}

      <SelectionFooter
        continueLabel={`Continue with ${selectedSites.length} ${selectedSites.length === 1 ? 'Site' : 'Sites'}`}
        onClear={onClearSelection}
        onContinue={onContinue}
        visible={hasSelection}
      />
    </div>
  );
};
