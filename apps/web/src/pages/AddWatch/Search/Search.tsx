import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../lib/api';
import styles from './Search.module.scss';

export interface SearchSuggestion {
  entity_id: string;
  entity_type: string;
  name: string;
  text?: string;
  parent_name?: string;
  state_code?: string;
}

export interface SuggestResponse {
  content_suggestions: unknown[];
  inventory_suggestions: SearchSuggestion[];
  merchandise_suggestions: unknown;
  suggestions: SearchSuggestion[];
}

export interface SearchProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onSearchForQuery: (query: string, displayName?: string) => void;
  onSelectCampground: (facilityId: string, campgroundName: string) => void;
  searching: boolean;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

const TRENDING_CAMPGROUNDS = [
  { id: '1', image: 'https://picsum.photos/seed/camp1/400/240', title: 'Yosemite Pines RV Resort', location: 'Groveland, CA' },
  { id: '2', image: 'https://picsum.photos/seed/camp2/400/240', title: 'Upper Pines Campground', location: 'Yosemite Valley, CA' },
  { id: '3', image: 'https://picsum.photos/seed/camp3/400/240', title: 'Tuolumne Meadows Campground', location: 'Tuolumne, CA' },
  { id: '4', image: 'https://picsum.photos/seed/camp4/400/240', title: 'Crater Lake Mazama Village', location: 'Klamath Falls, OR' },
  { id: '5', image: 'https://picsum.photos/seed/camp5/400/240', title: 'Jenny Lake Campground', location: 'Grand Teton, WY' },
  { id: '6', image: 'https://picsum.photos/seed/camp6/400/240', title: 'Moraine Park Campground', location: 'Estes Park, CO' },
] as const;

export function Search({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onSearchForQuery,
  onSelectCampground,
  searching,
}: SearchProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const data = await api.get<SuggestResponse>(
        `/api/campsites/suggest?q=${encodeURIComponent(query)}`
      );
      const campgrounds =
        data.inventory_suggestions?.filter(
          (s) => s.entity_type === 'campground'
        ) || [];
      const recAreas =
        data.suggestions?.filter((s) => s.entity_type === 'recarea') || [];
      setSuggestions([...campgrounds, ...recAreas]);
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
    (suggestion: SearchSuggestion) => {
      if (suggestion.entity_type === 'campground') {
        onSelectCampground(suggestion.entity_id, suggestion.name);
      } else {
        const query = suggestion.name || suggestion.text || '';
        const displayName = suggestion.name || suggestion.text || '';
        onSearchQueryChange(query);
        onSearchForQuery(query, displayName);
      }
      setIsOpen(false);
      setSuggestions([]);
    },
    [onSelectCampground, onSearchQueryChange, onSearchForQuery]
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
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') onSearch();
      return;
    }
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

  const showDropdown =
    isOpen && (suggestions.length > 0 || loadingSuggestions);

  return (
    <div className={styles.root}>
      <h2 className={styles.heading}>Where to?</h2>
      <p className={styles.subtext}>
        Search campgrounds, parks, National Forest and more
      </p>
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
        <button
          type="button"
          onClick={onSearch}
          disabled={searching || !searchQuery.trim()}
          className={styles.searchBtn}
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        {showDropdown && (
          <ul ref={suggestionsRef} className={styles.suggestionsList}>
            {loadingSuggestions ? (
              <li className={styles.suggestionItem}>Searching...</li>
            ) : (
              suggestions.map((s, i) => (
                <li key={`${s.entity_id || s.name}-${i}`}>
                  <button
                    type="button"
                    className={`${styles.suggestionItem} ${i === highlightedIndex ? styles.suggestionItemHighlighted : ''}`}
                    onClick={() => handleSelect(s)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    <span className={styles.suggestionName}>
                      {s.name || s.text}
                    </span>
                    {s.entity_type && (
                      <span className={styles.suggestionMeta}>
                        {s.entity_type === 'campground'
                          ? 'Campground'
                          : s.entity_type === 'recarea'
                            ? 'Rec Area'
                            : s.entity_type}
                        {s.state_code && ` · ${s.state_code}`}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className={styles.trendingSection}>
        <h3 className={styles.trendingHeading}>Trending Campgrounds</h3>
        <div className={styles.trendingGrid}>
          {TRENDING_CAMPGROUNDS.map((campground) => (
            <button
              key={campground.id}
              type="button"
              className={styles.trendingCard}
              onClick={() =>
                onSelectCampground(campground.id, campground.title)
              }
            >
              <div
                className={styles.trendingCardImage}
                style={{ backgroundImage: `url(${campground.image})` }}
              />
              <span className={styles.trendingCardTitle}>{campground.title}</span>
              <span className={styles.trendingCardLocation}>
                {campground.location}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
