import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { SuggestionResult } from '@campsight/shared';
import { api } from '../../../lib/api';
import { Text } from '../../../components/Text';
import { CampgroundCard } from '../../../components/CampgroundCard';
import styles from './Search.module.scss';

export interface SearchProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchForRecArea: (recAreaId: string, displayName: string) => void;
  onSelectCampground: (facilityId: string, campgroundName: string) => void;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

interface TrendingCampground {
  entity_id: string;
  name: string;
  city: string;
  state_code: string;
  parent_name: string;
  preview_image_url: string;
}

export const Search = ({
  searchQuery,
  onSearchQueryChange,
  onSearchForRecArea,
  onSelectCampground,
}: SearchProps) => {
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get<TrendingCampground[]>('/api/trending'),
    staleTime: 10 * 60 * 1000,
  });

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const results = await api.get<SuggestionResult[]>(
        `/api/campsites/suggest?q=${encodeURIComponent(query)}`,
      );
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  const handleSelect = useCallback(
    (suggestion: SuggestionResult) => {
      if (suggestion.entityType === 'campground') {
        onSelectCampground(suggestion.entityId, suggestion.name);
      } else {
        onSearchQueryChange(suggestion.name);
        onSearchForRecArea(suggestion.entityId, suggestion.name);
      }
      setIsOpen(false);
      setSuggestions([]);
    },
    [onSelectCampground, onSearchQueryChange, onSearchForRecArea],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inInput = dropdownRef.current?.contains(target);
      const inSuggestions = suggestionsRef.current?.contains(target);
      if (!inInput && !inSuggestions) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const showDropdown = isOpen && (suggestions.length > 0 || loadingSuggestions);

  return (
    <div className={styles.root}>
      <Text variant="h1" className={styles.heading}>
        Where to?
      </Text>
      <Text variant="body" className={styles.subtext} as="p">
        Search campgrounds, parks, National Forest and more
      </Text>
      <div className={styles.searchRow}>
        <div ref={dropdownRef} className={styles.dropdownWrapper}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                setIsOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Yosemite, Glacier Point..."
              className={styles.input}
              autoComplete="off"
            />
          </div>
        </div>
        {showDropdown && (
          <ul ref={suggestionsRef} className={styles.suggestionsList}>
            {loadingSuggestions ? (
              <li className={styles.suggestionItem}>Searching...</li>
            ) : (
              suggestions.map((s, i) => (
                <li key={`${s.entityId}-${i}`}>
                  <button
                    type="button"
                    className={classNames(styles.suggestionItem, {
                      [styles.suggestionItemHighlighted]:
                        i === highlightedIndex,
                    })}
                    onClick={() => handleSelect(s)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    <span className={styles.suggestionName}>{s.name}</span>
                    <span className={styles.suggestionMeta}>
                      {s.entityType === 'campground'
                        ? 'Campground'
                        : 'Rec Area'}
                      {s.stateCode && ` · ${s.stateCode}`}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className={styles.trendingSection}>
        <Text variant="h3" className={styles.trendingHeading}>
          Available Campgrounds Nearby
        </Text>
        {trendingLoading ? (
          <div className={styles.trendingGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.trendingSkeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.trendingGrid}>
            {(trendingData ?? []).map((site) => (
              <CampgroundCard
                key={site.entity_id}
                as="button"
                imageSrc={site.preview_image_url}
                campsiteName={site.name.toLowerCase()}
                campgroundName={
                  [site.city, site.state_code].filter(Boolean).join(', ') ||
                  site.parent_name
                }
                onClick={() => onSelectCampground(site.entity_id, site.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
