import { useMemo } from 'react';
import { CampgroundSearchResult } from '@campsight/shared';
import classNames from 'classnames';
import { Text } from '../../../components/Text';
import { MapView, MapMarker } from '../../../components/MapView';
import styles from './Campgrounds.module.scss';

export interface CampgroundsProps {
  searchDisplayName: string;
  searchResults: CampgroundSearchResult[];
  selectedFacility: CampgroundSearchResult | null;
  onSelectFacility: (facility: CampgroundSearchResult) => void;
  onChange: () => void;
}

function StarRating({
  rating,
  count,
}: {
  rating: number | null;
  count: number;
}) {
  const filled = rating != null ? Math.round(rating) : 0;

  return (
    <div className={styles.cardRating}>
      <div className={styles.stars}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <span
            key={idx}
            className={classNames(styles.star, {
              [styles.starFilled]: idx < filled,
            })}
          >
            ★
          </span>
        ))}
      </div>
      <Text variant="caption" className={styles.ratingNumber}>
        {rating != null ? `${rating.toFixed(1)} (${count})` : '(N/A)'}
      </Text>
    </div>
  );
}

export const Campgrounds = ({
  searchDisplayName,
  searchResults,
  selectedFacility,
  onSelectFacility,
}: CampgroundsProps) => {
  const markers: MapMarker[] = useMemo(
    () =>
      searchResults
        .filter((f) => f.latitude && f.longitude)
        .map((f) => ({
          id: f.entityId,
          lat: Number(f.latitude),
          lng: Number(f.longitude),
          label: f.name,
        })),
    [searchResults],
  );

  return (
    <div className={styles.root}>
      {searchResults.length > 0 ? (
        <div className={styles.twoColumnLayout}>
          <div className={styles.listColumn}>
            {(searchDisplayName || selectedFacility?.name) && (
              <Text variant="h1" className={styles.heading}>
                {searchDisplayName || selectedFacility?.name}
              </Text>
            )}
            <ul className={styles.resultsList}>
              {searchResults.map((facility, i) => {
                const isSelected =
                  selectedFacility?.entityId === facility.entityId;
                return (
                  <li key={`${facility.entityId}-${i}`}>
                    <button
                      type="button"
                      className={classNames(styles.resultCard, {
                        [styles.resultCardSelected]: isSelected,
                      })}
                      onClick={() => onSelectFacility(facility)}
                    >
                      <div className={styles.cardPhoto}>
                        {facility.previewImageUrl ? (
                          <img
                            src={facility.previewImageUrl}
                            alt={facility.name}
                            className={styles.cardImage}
                          />
                        ) : (
                          <div className={styles.photoPlaceholder}>📷</div>
                        )}
                      </div>
                      <div className={styles.cardContent}>
                        <Text variant="h3">{facility.name}</Text>
                        <Text
                          variant="body"
                          className={styles.cardLocation}
                          as="p"
                        >
                          {[facility.city, facility.stateCode]
                            .filter(Boolean)
                            .join(', ') || 'Location not available'}
                        </Text>
                        <StarRating
                          rating={facility.averageRating}
                          count={facility.numberOfRatings}
                        />
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
              selectedIds={
                selectedFacility ? [selectedFacility.entityId] : []
              }
              onMarkerClick={(id) => {
                const facility = searchResults.find((f) => f.entityId === id);
                if (facility) onSelectFacility(facility);
              }}
            />
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
