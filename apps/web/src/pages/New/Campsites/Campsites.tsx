import { useMemo } from 'react';
import {
  CampgroundSearchResult,
  CampsiteSearchResult,
} from '@campsight/shared';
import classNames from 'classnames';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { Text } from '../../../components/Text';
import { MapView, MapMarker } from '../../../components/MapView';
import { StepLayout } from '../../../components/StepLayout';
import { Button } from '../../../components/Button';
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

/** Natural sort: "1" < "2" < "10" < "100" instead of "1" < "10" < "100" < "2" */
function naturalCompare(a: string, b: string): number {
  const tokenize = (s: string) => s.match(/(\d+|\D+)/g) ?? [];
  const aParts = tokenize(a);
  const bParts = tokenize(b);
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    const aNum = parseInt(aPart, 10);
    const bNum = parseInt(bPart, 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      const c = (aPart ?? '').localeCompare(bPart ?? '');
      if (c !== 0) return c;
    }
  }
  return aParts.length - bParts.length;
}

function buildDetailLine(site: CampsiteSearchResult): string {
  const parts: string[] = [];
  if (site.type) parts.push(site.type.toLowerCase());
  if (site.typeOfUse) parts.push(site.typeOfUse);
  if (site.maxOccupants != null)
    parts.push(`${site.maxOccupants} max occupants`);
  if (site.maxVehicles != null) parts.push(`${site.maxVehicles} max vehicles`);
  return parts.join('  •  ');
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
    () => [...campsites].sort((a, b) => naturalCompare(a.name, b.name)),
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
    <StepLayout
      heading={facility ? facility.name.toLowerCase() : undefined}
      headingAction={
        <Button
          variant="ghost"
          size="small"
          level="success"
          className={styles.selectAllButton}
          onClick={() => {
            if (hasSelection) {
              onClearSelection();
            } else {
              const selectedIds = new Set(
                selectedSites.map((s) => s.campsiteId),
              );
              campsites
                .filter((s) => !selectedIds.has(s.campsiteId))
                .forEach((site) => onToggleSite(site));
            }
          }}
        >
          {hasSelection ? 'Select None' : 'Select all'}
        </Button>
      }
      loading={loading}
      loadingMessage="Loading campsites..."
      isEmpty={campsites.length === 0}
      emptyState={
        <Text variant="body-sm" className={styles.hint} as="p">
          No campsites found for this campground.
        </Text>
      }
      left={
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
                      {site.loop ? `, Loop: ${site.loop.toLowerCase()}` : ''}
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
      }
      right={
        <MapView
          markers={markers}
          selectedIds={selectedMarkerIds}
          onMarkerClick={(id) => {
            const site = campsites.find((s) => s.campsiteId === id);
            if (site) onToggleSite(site);
          }}
        />
      }
      footer={
        <SelectionFooter
          continueLabel={`Continue with ${selectedSites.length} ${selectedSites.length === 1 ? 'Site' : 'Sites'}`}
          onClear={onClearSelection}
          onContinue={onContinue}
          visible={hasSelection}
        />
      }
    />
  );
};
