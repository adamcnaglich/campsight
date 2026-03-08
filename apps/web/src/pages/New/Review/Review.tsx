import { useState, useRef, useEffect, useCallback } from 'react';
import {
  CampgroundSearchResult,
  CampsiteSearchResult,
} from '@campsight/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { Text } from '../../../components/Text';
import { formatDateRange } from '../../../lib/dateUtils';
import styles from './Review.module.scss';

const EditIcon = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
};

export interface ReviewProps {
  selectedFacility: CampgroundSearchResult | null;
  campgroundName: string;
  selectedSites: CampsiteSearchResult[];
  startDate: string;
  endDate: string;
  onEditCampground: () => void;
  onEditCampsites: () => void;
  onEditDates: () => void;
  onStartOver: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  hasError: boolean;
}

export const Review = ({
  selectedFacility,
  campgroundName,
  selectedSites,
  startDate,
  endDate,
  onEditCampground,
  onEditCampsites,
  onEditDates,
  onStartOver,
  onConfirm,
  isSubmitting,
  hasError,
}: ReviewProps) => {
  const formattedDates = formatDateRange(startDate, endDate);
  const siteNames = selectedSites
    .map((s) => s.name)
    .join(', ')
    .trim();

  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const hasMultipleSites = selectedSites.length > 1;

  const scrollToSlide = useCallback((index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const slideWidth = el.offsetWidth;
    el.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
    setCarouselIndex(index);
  }, []);

  const goPrev = useCallback(() => {
    const next = Math.max(0, carouselIndex - 1);
    scrollToSlide(next);
  }, [carouselIndex, scrollToSlide]);

  const goNext = useCallback(() => {
    const next = Math.min(selectedSites.length - 1, carouselIndex + 1);
    scrollToSlide(next);
  }, [carouselIndex, selectedSites.length, scrollToSlide]);

  // Sync carousel index when scroll position changes (for scroll-snap)
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || !hasMultipleSites) return;
    const onScroll = () => {
      const slideWidth = el.offsetWidth;
      const index = Math.round(el.scrollLeft / slideWidth);
      setCarouselIndex(Math.min(index, selectedSites.length - 1));
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMultipleSites, selectedSites.length]);

  const getImageForSingleSite = () => {
    const site = selectedSites[0];
    if (site?.previewImageUrl) return site.previewImageUrl;
    if (selectedFacility?.previewImageUrl)
      return selectedFacility.previewImageUrl;
    return null;
  };

  return (
    <div className={styles.root}>
      <div className={styles.twoColumnLayout}>
        {/* Left column: heading + edit cards */}
        <div className={styles.leftColumn}>
          <Text variant="h1" className={styles.heading}>
            Review & Confirm
          </Text>

          <div className={styles.cardList}>
            {/* Card 1: Campground (image, text, edit) */}
            <button
              type="button"
              className={styles.editCard}
              onClick={onEditCampground}
            >
              <div className={styles.cardText}>
                <Text variant="h3" className={styles.cardRowTitle}>
                  {campgroundName.toLowerCase()}
                </Text>
                <Text variant="body" className={styles.cardRowLocation} as="p">
                  {selectedFacility?.city || selectedFacility?.stateCode
                    ? [selectedFacility.city, selectedFacility.stateCode]
                        .filter(Boolean)
                        .join(', ')
                    : 'Location not available'}
                </Text>
              </div>
              <span className={styles.editIcon}>
                <EditIcon />
              </span>
            </button>

            {/* Card 2: Campsites (text, edit) */}
            <button
              type="button"
              className={styles.editCard}
              onClick={onEditCampsites}
            >
              <div className={styles.cardText}>
                <Text variant="h3" className={styles.cardRowLabel}>
                  {selectedSites.length}{' '}
                  {selectedSites.length === 1 ? 'Campsite' : 'Campsites'}
                </Text>
                <Text variant="body" className={styles.cardRowValue}>
                  {siteNames || 'No sites selected'}
                </Text>
              </div>
              <span className={styles.editIcon}>
                <EditIcon />
              </span>
            </button>

            {/* Card 3: Timeframe (text, edit) */}
            <button
              type="button"
              className={styles.editCard}
              onClick={onEditDates}
            >
              <div className={styles.cardText}>
                <Text variant="h3" className={styles.cardRowLabel}>
                  Timeframe
                </Text>
                <Text variant="body" className={styles.cardRowValue}>
                  {formattedDates || 'No dates selected'}
                </Text>
              </div>
              <span className={styles.editIcon}>
                <EditIcon />
              </span>
            </button>
          </div>
        </div>

        <div className={styles.rightColumn}>
          {hasMultipleSites ? (
            <div
              className={styles.carousel}
              role="region"
              aria-label="Selected campsite photos"
            >
              <button
                type="button"
                className={styles.carouselArrow}
                style={{ left: 0 }}
                onClick={goPrev}
                disabled={carouselIndex === 0}
                aria-label="Previous site"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className={styles.carouselArrow}
                style={{ right: 0 }}
                onClick={goNext}
                disabled={carouselIndex === selectedSites.length - 1}
                aria-label="Next site"
              >
                <ChevronRight size={24} />
              </button>
              <div ref={carouselRef} className={styles.carouselTrack}>
                {selectedSites.map((site) => (
                  <div key={site.campsiteId} className={styles.carouselSlide}>
                    {site.previewImageUrl ? (
                      <img
                        src={site.previewImageUrl}
                        alt={site.name}
                        className={styles.siteImage}
                      />
                    ) : (
                      <div className={styles.siteImagePlaceholder}>
                        <span className={styles.siteImageIcon}>🏕️</span>
                        <Text
                          variant="body-sm"
                          className={styles.siteImageText}
                          as="p"
                        >
                          Site photo
                        </Text>
                      </div>
                    )}
                    <div className={styles.carouselFooter}>
                      <Text
                        variant="body-sm"
                        className={styles.carouselFooterText}
                        as="span"
                      >
                        {site.name.toLowerCase()}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.carouselDots} aria-hidden>
                {selectedSites.map((site, i) => (
                  <button
                    key={site.campsiteId}
                    type="button"
                    className={styles.carouselDot}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={carouselIndex === i ? 'true' : undefined}
                    onClick={() => scrollToSlide(i)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.singleImageWrapper}>
              {getImageForSingleSite() ? (
                <img
                  src={getImageForSingleSite()!}
                  alt={selectedSites[0]?.name ?? campgroundName}
                  className={styles.siteImage}
                />
              ) : (
                <div className={styles.siteImagePlaceholder}>
                  <span className={styles.siteImageIcon}>🏕️</span>
                  <Text
                    variant="body-sm"
                    className={styles.siteImageText}
                    as="p"
                  >
                    Site photo
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SelectionFooter
        clearLabel="Start Over"
        continueLabel={isSubmitting ? 'Creating...' : 'Confirm Watch'}
        onClear={onStartOver}
        onContinue={onConfirm}
        visible={true}
        continueDisabled={isSubmitting}
      />
      {hasError && (
        <Text variant="body-sm" className={styles.errorText} as="p">
          Failed to create watch. Please try again.
        </Text>
      )}
    </div>
  );
};
