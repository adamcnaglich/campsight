import { useMemo } from 'react';
import { CampgroundSearchResult, CampsiteSearchResult } from '@campsight/shared';
import classNames from 'classnames';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { Text } from '../../../components/Text';
import { MapView, MapMarker } from '../../../components/MapView';
import styles from './Campsites.module.scss';

export interface CampsitesProps {
  facility: CampgroundSearchResult | null;
  campsites: CampsiteSearchResult[];
  selectedSites: CampsiteSearchResult[];
  loading: boolean;
  onToggleSite: (site: CampsiteSearchResult) => void;
  onClearSelection: () => void;
  onContinue: () => void;
}

function buildDetailLine(site: CampsiteSearchResult): string {
  const parts: string[] = [];
  if (site.type) parts.push(site.type);
  if (site.typeOfUse) parts.push(site.typeOfUse);
  if (site.maxOccupants != null) parts.push(`${site.maxOccupants} max occupants`);
  if (site.maxVehicles != null) parts.push(`${site.maxVehicles} max vehicles`);
  return parts.join(' - ');
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

  const sortedCampsites = useMemo(
    () => [...campsites].sort((a, b) => a.name.localeCompare(b.name)),
    [campsites],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      campsites
        .filter((s) => s.latitude && s.longitude)
        .map((s) => ({
          id: s.campsiteId,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          label: s.name,
        })),
    [campsites],
  );

  const selectedMarkerIds = useMemo(
    () => selectedSites.map((s) => s.campsiteId),
    [selectedSites],
  );

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
              <Text variant="h1" className={styles.heading}>
                {facility.name.toLowerCase()}
              </Text>
            )}
            <ul
              className={classNames(styles.campsiteList, {
                [styles.campsiteListWithFooter]: hasSelection,
              })}
            >
              {sortedCampsites.map((site) => {
                const isSelected = selectedSites.some(
                  (s) => s.campsiteId === site.campsiteId,
                );
                const detailLine = buildDetailLine(site);
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
                        {site.previewImageUrl ? (
                          <img
                            src={site.previewImageUrl}
                            alt={`Site ${site.name}`}
                            className={styles.cardImage}
                          />
                        ) : (
                          <div className={styles.photoPlaceholder}>🏕️</div>
                        )}
                      </div>
                      <div className={styles.cardContent}>
                        <Text variant="h3" className={styles.cardTitle}>
                          Site: {site.name}
                          {site.loop ? `, Loop: ${site.loop}` : ''}
                        </Text>
                        {detailLine && (
                          <Text
                            variant="caption"
                            className={styles.cardDetail}
                            as="p"
                          >
                            {detailLine}
                          </Text>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className={styles.mapColumn}>
            <MapView
              markers={markers}
              selectedId={selectedMarkerIds[0] ?? null}
              onMarkerClick={(id) => {
                const site = campsites.find((s) => s.campsiteId === id);
                if (site) onToggleSite(site);
              }}
            />
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
