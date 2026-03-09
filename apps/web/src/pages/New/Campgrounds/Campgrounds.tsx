import { useMemo, useState } from 'react';
import { CampgroundSearchResult } from '@campsight/shared';
import classNames from 'classnames';
import { Text } from '../../../components/Text';
import { MapView, MapMarker } from '../../../components/MapView';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { StepLayout } from '../../../components/StepLayout';
import styles from './Campgrounds.module.scss';

export interface CampgroundsProps {
  searchDisplayName: string;
  searchResults: CampgroundSearchResult[];
  selectedFacility: CampgroundSearchResult | null;
  onSelectFacility: (facility: CampgroundSearchResult) => void;
  onClearSelection: () => void;
  onContinue: () => void;
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
          <span key={idx} className={styles.star}>
            {idx < filled ? '★' : '☆'}
          </span>
        ))}
      </div>
      <Text variant="caption" className={styles.ratingNumber}>
        {rating != null ? `(${count})` : '(N/A)'}
      </Text>
    </div>
  );
}

export const Campgrounds = ({
  searchDisplayName,
  searchResults,
  selectedFacility,
  onSelectFacility,
  onClearSelection,
  onContinue,
}: CampgroundsProps) => {
  const [searchFilter, setSearchFilter] = useState('');

  const filteredResults = useMemo(
    () =>
      searchFilter.trim()
        ? searchResults.filter((f) =>
            f.name.toLowerCase().includes(searchFilter.toLowerCase()),
          )
        : searchResults,
    [searchResults, searchFilter],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      filteredResults
        .filter((f) => f.latitude && f.longitude)
        .map((f) => ({
          id: f.entityId,
          lat: Number(f.latitude),
          lng: Number(f.longitude),
          label: f.name,
        })),
    [filteredResults],
  );

  return (
    <StepLayout
      heading={searchDisplayName || selectedFacility?.name}
      searchValue={searchFilter}
      onSearchChange={setSearchFilter}
      searchPlaceholder="Search campgrounds..."
      isEmpty={searchResults.length === 0}
      emptyState={
        <Text variant="body-sm" className={styles.hint} as="p">
          Run a search in step 1 to see campgrounds.
        </Text>
      }
      left={
        <ul
          className={classNames(styles.resultsList, {
            [styles.resultsListWithFooter]: !!selectedFacility,
          })}
        >
          {filteredResults.map((facility, i) => {
            const isSelected = selectedFacility?.entityId === facility.entityId;
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
                    <Text variant="h3" className={styles.cardName}>
                      {facility.name.toLowerCase()}
                    </Text>
                    <Text variant="body" className={styles.cardLocation} as="p">
                      {[facility.city, facility.stateCode]
                        .filter(Boolean)
                        .join(', ') || 'Location not available'}{' '}
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
      }
      right={
        <MapView
          markers={markers}
          selectedIds={selectedFacility ? [selectedFacility.entityId] : []}
          onMarkerClick={(id) => {
            const facility = searchResults.find((f) => f.entityId === id);
            if (facility) onSelectFacility(facility);
          }}
        />
      }
      footer={
        <SelectionFooter
          continueLabel="Continue"
          onClear={onClearSelection}
          onContinue={onContinue}
          visible={!!selectedFacility}
        />
      }
    />
  );
};
