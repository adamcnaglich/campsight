import { useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import styles from './MapView.module.scss';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface MapViewProps {
  markers: MapMarker[];
  selectedIds?: string[];
  onMarkerClick?: (id: string) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

function FitBounds({
  markers,
  selectedIds,
}: {
  markers: MapMarker[];
  selectedIds?: string[];
}) {
  const map = useMap();
  const prevMarkersKey = useRef('');

  useEffect(() => {
    if (!map || markers.length === 0) return;

    const key = markers.map((m) => m.id).join(',');
    if (key === prevMarkersKey.current) return;
    prevMarkersKey.current = key;

    if (markers.length === 1) {
      map.panTo({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(13);
      return;
    }

    const lats = markers.map((m) => m.lat);
    const lngs = markers.map((m) => m.lng);
    const bounds = {
      south: Math.min(...lats),
      north: Math.max(...lats),
      west: Math.min(...lngs),
      east: Math.max(...lngs),
    };
    map.fitBounds(bounds, 48);
  }, [map, markers]);

  useEffect(() => {
    if (!map || !selectedIds?.length) return;
    const selectedMarkers = markers.filter((m) => selectedIds.includes(m.id));
    if (selectedMarkers.length === 0) return;
    if (selectedMarkers.length === 1) {
      map.panTo({
        lat: selectedMarkers[0].lat,
        lng: selectedMarkers[0].lng,
      });
      return;
    }
    const lats = selectedMarkers.map((m) => m.lat);
    const lngs = selectedMarkers.map((m) => m.lng);
    map.fitBounds(
      {
        south: Math.min(...lats),
        north: Math.max(...lats),
        west: Math.min(...lngs),
        east: Math.max(...lngs),
      },
      48,
    );
  }, [map, selectedIds, markers]);

  return null;
}

export const MapView = ({
  markers,
  selectedIds = [],
  onMarkerClick,
}: MapViewProps) => {
  const handleClick = useCallback(
    (id: string) => {
      onMarkerClick?.(id);
    },
    [onMarkerClick],
  );

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}>🗺️</span>
        <p className={styles.placeholderText}>
          Add VITE_GOOGLE_MAPS_API_KEY to enable maps
        </p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          mapTypeId="hybrid"
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="campsight-map"
          gestureHandling="greedy"
          disableDefaultUI
          styles={[
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'water',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ]}
          className={styles.map}
        >
          <FitBounds markers={markers} selectedIds={selectedIds} />
          {markers.map((marker) => {
            const isSelected = selectedIds.includes(marker.id);
            return (
              <AdvancedMarker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                title={marker.label}
                onClick={() => handleClick(marker.id)}
                zIndex={isSelected ? 1000 : 1}
              >
                <div
                  className={styles.markerDot}
                  data-selected={isSelected || undefined}
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
};
