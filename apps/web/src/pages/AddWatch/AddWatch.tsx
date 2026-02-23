import { useState, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CampsiteSearchResult, CreateWatchDTO } from '@campsight/shared';
import { api } from '../../lib/api';
import { Search } from './Search';
import { Campgrounds } from './Campgrounds';
import { Campsites } from './Campsites';
import { Dates } from './Dates';
import { Review } from './Review';
import styles from './AddWatch.module.scss';

const STEPS = [
  { id: 1, label: 'Search' },
  { id: 2, label: 'Campgrounds' },
  { id: 3, label: 'Campsites' },
  { id: 4, label: 'Dates' },
  { id: 5, label: 'Review' },
] as const;

export function AddWatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CampsiteSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFacility, setSelectedFacility] =
    useState<CampsiteSearchResult | null>(null);
  const [campsites, setCampsites] = useState<CampsiteSearchResult[]>([]);
  const [loadingCampsites, setLoadingCampsites] = useState(false);
  const [selectedSites, setSelectedSites] = useState<CampsiteSearchResult[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const goToStep = useCallback((step: number) => {
    setCurrentStep((prev) => {
      setDirection(step > prev ? 'forward' : 'backward');
      return step;
    });
    setHighestStepReached((prev) => Math.max(prev, step));
  }, []);

  const searchFacilities = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelectedFacility(null);
    setCampsites([]);
    setSelectedSites([]);
    try {
      const results = await api.get<CampsiteSearchResult[]>(
        `/api/campsites/search?q=${encodeURIComponent(searchQuery)}`,
      );
      setSearchResults(results);
      if (results.length > 0) {
        goToStep(2);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, goToStep]);

  const searchForQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setSearchQuery(query);
      setSearching(true);
      setSelectedFacility(null);
      setCampsites([]);
      setSelectedSites([]);
      try {
        const results = await api.get<CampsiteSearchResult[]>(
          `/api/campsites/search?q=${encodeURIComponent(query)}`,
        );
        setSearchResults(results);
        if (results.length > 0) {
          goToStep(2);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    },
    [goToStep],
  );

  const selectFacility = useCallback(
    async (facility: CampsiteSearchResult) => {
      setSelectedFacility(facility);
      setLoadingCampsites(true);
      try {
        const sites = await api.get<CampsiteSearchResult[]>(
          `/api/campsites/search?facilityId=${facility.facilityId}`,
        );
        setCampsites(sites);
        goToStep(3);
      } catch (err) {
        console.error('Failed to load campsites:', err);
      } finally {
        setLoadingCampsites(false);
      }
    },
    [goToStep],
  );

  const toggleSite = useCallback((site: CampsiteSearchResult) => {
    setSelectedSites((prev) => {
      const isAlreadySelected = prev.some((s) => s.campsiteId === site.campsiteId);
      if (isAlreadySelected) {
        return prev.filter((s) => s.campsiteId !== site.campsiteId);
      } else {
        return [...prev, site];
      }
    });
  }, []);

  const clearSiteSelection = useCallback(() => {
    setSelectedSites([]);
  }, []);

  const continueToDates = useCallback(() => {
    goToStep(4);
  }, [goToStep]);

  const handleSelectCampground = useCallback(
    (facilityId: string, campgroundName: string) => {
      const facility: CampsiteSearchResult = {
        facilityId,
        campgroundName,
        campsiteId: '',
        campsiteName: '',
        loop: '',
        type: 'facility',
      };
      selectFacility(facility);
    },
    [selectFacility],
  );

  const handleCampgroundChange = useCallback(() => {
    setSelectedFacility(null);
    setCampsites([]);
    setSelectedSites([]);
    goToStep(1);
  }, [goToStep]);

  const createMutation = useMutation({
    mutationFn: (data: CreateWatchDTO) => api.post('/api/watches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watches'] });
      navigate('/');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSites.length === 0 || !startDate || !endDate) return;

    // For now, just submit the first selected site
    // TODO: Update backend to support multiple campsites
    const firstSite = selectedSites[0];
    createMutation.mutate({
      campsiteId: firstSite.campsiteId,
      campsiteName: firstSite.campsiteName,
      campgroundName:
        selectedFacility?.campgroundName || firstSite.campgroundName,
      startDate,
      endDate,
    });
  };

  const isStepComplete = (step: number) => step < highestStepReached;

  const canGoToStep = (step: number) => step <= highestStepReached;

  const campgroundName =
    selectedFacility?.campgroundName || selectedSites[0]?.campgroundName || '';

  return (
    <div className={styles.page}>
      {/* Step indicator */}
      <div className={styles.stepIndicator}>
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const complete = isStepComplete(step.id);
          const accessible = canGoToStep(step.id);
          const isLast = index === STEPS.length - 1;
          const connectorComplete = step.id < currentStep;

          return (
            <Fragment key={step.id}>
              <div className={styles.stepIndicatorItem}>
                <button
                  type="button"
                  className={`${styles.stepCircle} ${isActive ? styles.stepCircleActive : ''} ${complete ? styles.stepCircleComplete : ''} ${!accessible ? styles.stepCircleDisabled : ''}`}
                  onClick={() => accessible && goToStep(step.id)}
                  disabled={!accessible}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {step.id}
                </button>
                <span
                  className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''} ${!accessible ? styles.stepLabelDisabled : ''}`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`${styles.stepConnector} ${connectorComplete ? styles.stepConnectorComplete : ''}`}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Step content with animation */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div
          className={`${styles.stepContent} ${direction === 'forward' ? styles.slideFromRight : styles.slideFromLeft}`}
          key={currentStep}
        >
          {currentStep === 1 && (
            <Search
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSearch={searchFacilities}
              onSearchForQuery={searchForQuery}
              onSelectCampground={handleSelectCampground}
              searching={searching}
            />
          )}

          {currentStep === 2 && (
            <Campgrounds
              searchQuery={searchQuery}
              searchResults={searchResults}
              selectedFacility={selectedFacility}
              onSelectFacility={selectFacility}
              onChange={handleCampgroundChange}
              onBack={() => goToStep(1)}
            />
          )}

          {currentStep === 3 && (
            <Campsites
              facility={selectedFacility}
              campsites={campsites}
              selectedSites={selectedSites}
              loading={loadingCampsites}
              onToggleSite={toggleSite}
              onClearSelection={clearSiteSelection}
              onContinue={continueToDates}
              onBack={() => goToStep(2)}
            />
          )}

          {currentStep === 4 && (
            <Dates
              selectedSite={selectedSites[0] || null}
              campgroundName={campgroundName}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onBack={() => goToStep(3)}
              onNext={() => goToStep(5)}
            />
          )}

          {currentStep === 5 && (
            <Review
              selectedSite={selectedSites[0] || null}
              campgroundName={campgroundName}
              startDate={startDate}
              endDate={endDate}
              onBack={() => goToStep(4)}
              isSubmitting={createMutation.isPending}
              hasError={createMutation.isError}
            />
          )}
        </div>
      </form>
    </div>
  );
}
