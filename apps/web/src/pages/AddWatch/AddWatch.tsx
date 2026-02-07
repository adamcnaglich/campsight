import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CampsiteSearchResult, CreateWatchDTO } from '@campsight/shared';
import { api } from '../../lib/api';
import styles from './AddWatch.module.scss';

export function AddWatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CampsiteSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<CampsiteSearchResult | null>(null);
  const [campsites, setCampsites] = useState<CampsiteSearchResult[]>([]);
  const [loadingCampsites, setLoadingCampsites] = useState(false);
  const [selectedSite, setSelectedSite] = useState<CampsiteSearchResult | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const searchFacilities = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelectedFacility(null);
    setCampsites([]);
    setSelectedSite(null);
    try {
      const results = await api.get<CampsiteSearchResult[]>(
        `/api/campsites/search?q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectFacility = useCallback(async (facility: CampsiteSearchResult) => {
    setSelectedFacility(facility);
    setSearchResults([]);
    setLoadingCampsites(true);
    try {
      const sites = await api.get<CampsiteSearchResult[]>(
        `/api/campsites/search?facilityId=${facility.facilityId}`
      );
      setCampsites(sites);
    } catch (err) {
      console.error('Failed to load campsites:', err);
    } finally {
      setLoadingCampsites(false);
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: CreateWatchDTO) => api.post('/api/watches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watches'] });
      navigate('/');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !startDate || !endDate) return;

    createMutation.mutate({
      campsiteId: selectedSite.campsiteId,
      campsiteName: selectedSite.campsiteName,
      campgroundName: selectedFacility?.campgroundName || selectedSite.campgroundName,
      startDate,
      endDate,
    });
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Add a Watch</h1>
      <p className={styles.subtitle}>
        Search for a campground, select a specific campsite, and set your date range.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Step 1: Search for campground */}
        <div className={styles.section}>
          <label className={styles.label}>
            <span className={styles.step}>1</span>
            Search for a campground
          </label>
          <div className={styles.searchRow}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchFacilities())}
              placeholder="e.g. Yosemite, Glacier Point..."
              className={styles.input}
            />
            <button
              type="button"
              onClick={searchFacilities}
              disabled={searching || !searchQuery.trim()}
              className={styles.searchBtn}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <ul className={styles.resultsList}>
              {searchResults.map((facility, i) => (
                <li key={`${facility.facilityId}-${i}`}>
                  <button
                    type="button"
                    className={styles.resultItem}
                    onClick={() => selectFacility(facility)}
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

          {selectedFacility && (
            <div className={styles.selected}>
              Selected: <strong>{selectedFacility.campgroundName}</strong>
            </div>
          )}
        </div>

        {/* Step 2: Pick a campsite */}
        {selectedFacility && (
          <div className={styles.section}>
            <label className={styles.label}>
              <span className={styles.step}>2</span>
              Select a campsite
            </label>
            {loadingCampsites ? (
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
                    onClick={() => setSelectedSite(site)}
                  >
                    <span className={styles.chipName}>{site.campsiteName}</span>
                    {site.loop && (
                      <span className={styles.chipLoop}>{site.loop}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.hint}>No campsites found for this campground.</p>
            )}
          </div>
        )}

        {/* Step 3: Date range */}
        {selectedSite && (
          <div className={styles.section}>
            <label className={styles.label}>
              <span className={styles.step}>3</span>
              Set your date range
            </label>
            <div className={styles.dateRow}>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.input}
                  min={startDate}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        {selectedSite && startDate && endDate && (
          <div className={styles.submitSection}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Start Watching'}
            </button>
            {createMutation.isError && (
              <p className={styles.errorText}>
                Failed to create watch. Please try again.
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
