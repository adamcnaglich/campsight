import { useState, useCallback, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CampgroundSearchResult,
  CampsiteSearchResult,
  CreateWatchDTO,
  FacilityDetail,
} from '@campsight/shared';
import classNames from 'classnames';
import { api } from '../../lib/api';
import { Text } from '../../components/Text';
import { Search } from './Search';
import { Campgrounds } from './Campgrounds';
import { Campsites } from './Campsites';
import { Dates } from './Dates';
import { Review } from './Review';
import styles from './New.module.scss';

const STEPS = [
  { id: 1, label: 'Search' },
  { id: 2, label: 'Campgrounds' },
  { id: 3, label: 'Campsites' },
  { id: 4, label: 'Dates' },
  { id: 5, label: 'Review' },
] as const;

export const New = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchName, setSelectedSearchName] = useState('');
  const [searchResults, setSearchResults] = useState<CampgroundSearchResult[]>(
    [],
  );
  const [selectedFacility, setSelectedFacility] =
    useState<CampgroundSearchResult | null>(null);
  const [campsites, setCampsites] = useState<CampsiteSearchResult[]>([]);
  const [loadingCampsites, setLoadingCampsites] = useState(false);
  const [selectedSites, setSelectedSites] = useState<CampsiteSearchResult[]>(
    [],
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const goToStep = useCallback((step: number) => {
    setCurrentStep((prev) => {
      setDirection(step > prev ? 'forward' : 'backward');
      return step;
    });
    setHighestStepReached((prev) => Math.max(prev, step));
  }, []);

  const searchForRecArea = useCallback(
    async (recAreaId: string, displayName: string) => {
      setSearchQuery(displayName);
      setSelectedSearchName(displayName);
      setSelectedFacility(null);
      setCampsites([]);
      setSelectedSites([]);
      setStartDate('');
      setEndDate('');
      setHighestStepReached(1);
      try {
        const results = await api.get<CampgroundSearchResult[]>(
          `/api/campsites/search?recAreaId=${encodeURIComponent(recAreaId)}`,
        );
        setSearchResults(results);
        if (results.length > 0) {
          goToStep(2);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    },
    [goToStep],
  );

  const fetchCampsites = useCallback(
    async (facilityId: string, campground?: CampgroundSearchResult) => {
      if (campground) {
        setSelectedFacility(campground);
      }
      setLoadingCampsites(true);
      try {
        const sites = await api.get<CampsiteSearchResult[]>(
          `/api/campsites/search?facilityId=${encodeURIComponent(facilityId)}`,
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

  const selectFacility = useCallback(
    (facility: CampgroundSearchResult) => {
      fetchCampsites(facility.entityId, facility);
    },
    [fetchCampsites],
  );

  const handleSelectCampground = useCallback(
    async (
      facilityId: string,
      campgroundName: string,
      options?: {
        previewImageUrl?: string;
        city?: string;
        stateCode?: string;
      },
    ) => {
      setSearchResults([]);
      setSelectedSites([]);
      setStartDate('');
      setEndDate('');
      setHighestStepReached(1);

      const preselected: CampgroundSearchResult = {
        entityId: facilityId,
        name: campgroundName,
        city: options?.city ?? '',
        stateCode: options?.stateCode ?? '',
        previewImageUrl: options?.previewImageUrl ?? '',
        latitude: '',
        longitude: '',
        averageRating: null,
        numberOfRatings: 0,
      };
      setSelectedFacility(preselected);
      setSelectedSearchName(campgroundName);

      fetchCampsites(facilityId);

      try {
        const detail = await api.get<FacilityDetail>(
          `/api/campsites/facility/${encodeURIComponent(facilityId)}`,
        );

        if (detail.parentRecAreaName) {
          setSelectedSearchName(detail.parentRecAreaName);
        }

        if (detail.parentRecAreaId) {
          const results = await api.get<CampgroundSearchResult[]>(
            `/api/campsites/search?recAreaId=${encodeURIComponent(detail.parentRecAreaId)}`,
          );
          setSearchResults(results);

          const match = results.find((r) => r.entityId === facilityId);
          if (match) {
            setSelectedFacility(match);
          }
        }
      } catch (err) {
        console.error('Failed to fetch sibling campgrounds:', err);
      }
    },
    [fetchCampsites],
  );

  const toggleSite = useCallback((site: CampsiteSearchResult) => {
    setSelectedSites((prev) => {
      const isAlreadySelected = prev.some(
        (s) => s.campsiteId === site.campsiteId,
      );
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

  const clearDatesSelection = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  const continueToDates = useCallback(() => {
    goToStep(4);
  }, [goToStep]);

  const continueToReview = useCallback(() => {
    goToStep(5);
  }, [goToStep]);

  const handleCampgroundChange = useCallback(() => {
    setSelectedFacility(null);
    setCampsites([]);
    setSelectedSites([]);
    goToStep(1);
  }, [goToStep]);

  const handleStartOver = useCallback(() => {
    setSearchQuery('');
    setSelectedSearchName('');
    setSearchResults([]);
    setSelectedFacility(null);
    setCampsites([]);
    setSelectedSites([]);
    setStartDate('');
    setEndDate('');
    setHighestStepReached(1);
    goToStep(1);
  }, [goToStep]);

  const handleConfirm = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: CreateWatchDTO) => api.post('/api/watches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watches'] });
      navigate('/dashboard');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSites.length === 0 || !startDate || !endDate) return;

    createMutation.mutate({
      campgroundName: selectedFacility?.name || selectedSites[0].campgroundName,
      recAreaName: selectedSearchName || undefined,
      imageUrl: selectedFacility?.previewImageUrl || undefined,
      sites: selectedSites.map((s) => ({
        campsiteId: s.campsiteId,
        campsiteName: s.name,
        loop: s.loop || undefined,
      })),
      startDate,
      endDate,
    });
  };

  const isStepComplete = (step: number) => step < highestStepReached;

  const canGoToStep = (step: number) => step <= highestStepReached;

  const campgroundName =
    selectedFacility?.name || selectedSites[0]?.campgroundName || '';

  const isFillLayout = currentStep === 2 || currentStep === 3;

  return (
    <div
      className={classNames(styles.page, { [styles.pageFill]: isFillLayout })}
      data-fill-layout={isFillLayout ? '' : undefined}
    >
      {currentStep !== 1 && (
      <div className={styles.stepIndicator}>
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const complete = isStepComplete(step.id);
          const accessible = canGoToStep(step.id);
          const isLast = index === STEPS.length - 1;
          const connectorComplete = step.id < currentStep;
          const displayNumber = index + 1;

          return (
            <Fragment key={step.id}>
              <button
                type="button"
                className={classNames(styles.stepIndicatorItem, {
                  [styles.stepIndicatorItemDisabled]: !accessible,
                })}
                onClick={() => {
                  if (accessible) {
                    if (step.id === 1) setSearchQuery('');
                    goToStep(step.id);
                  }
                }}
                disabled={!accessible}
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={classNames(styles.stepCircle, {
                    [styles.stepCircleActive]: isActive,
                    [styles.stepCircleComplete]: complete,
                    [styles.stepCircleDisabled]: !accessible,
                  })}
                >
                  {displayNumber}
                </div>
                <Text
                  variant="body-sm"
                  as="span"
                  className={classNames(styles.stepLabel, {
                    [styles.stepLabelActive]: isActive,
                    [styles.stepLabelComplete]: complete,
                    [styles.stepLabelDisabled]: !accessible,
                  })}
                >
                  {step.label}
                </Text>
              </button>
              {!isLast && (
                <div
                  className={classNames(styles.stepConnector, {
                    [styles.stepConnectorComplete]: connectorComplete,
                  })}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={classNames(styles.form, { [styles.formFill]: isFillLayout })}
      >
        <div
          className={classNames(styles.stepContent, {
            [styles.slideFromRight]: direction === 'forward',
            [styles.slideFromLeft]: direction !== 'forward',
          })}
          key={currentStep}
        >
          {currentStep === 1 && (
            <Search
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSearchForRecArea={searchForRecArea}
              onSelectCampground={handleSelectCampground}
            />
          )}

          {currentStep === 2 && (
            <Campgrounds
              searchDisplayName={selectedSearchName}
              searchResults={searchResults}
              selectedFacility={selectedFacility}
              onSelectFacility={selectFacility}
              onChange={handleCampgroundChange}
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
            />
          )}

          {currentStep === 4 && (
            <Dates
              selectedSite={selectedSites[0] || null}
              selectedSitesCount={selectedSites.length}
              campgroundName={campgroundName}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClearSelection={clearDatesSelection}
              onContinue={continueToReview}
            />
          )}

          {currentStep === 5 && (
            <Review
              selectedFacility={selectedFacility}
              campgroundName={campgroundName}
              selectedSites={selectedSites}
              startDate={startDate}
              endDate={endDate}
              onEditCampground={() => goToStep(2)}
              onEditCampsites={() => goToStep(3)}
              onEditDates={() => goToStep(4)}
              onStartOver={handleStartOver}
              onConfirm={handleConfirm}
              isSubmitting={createMutation.isPending}
              hasError={createMutation.isError}
            />
          )}
        </div>
      </form>
    </div>
  );
};
