import { useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
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
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

function FitBounds({
  markers,
  selectedId,
}: {
  markers: MapMarker[];
  selectedId?: string | null;
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
    if (!map || !selectedId) return;
    const marker = markers.find((m) => m.id === selectedId);
    if (marker) {
      map.panTo({ lat: marker.lat, lng: marker.lng });
    }
  }, [map, selectedId, markers]);

  return null;
}

export const MapView = ({
  markers,
  selectedId,
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
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="campsight-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          className={styles.map}
        >
          <FitBounds markers={markers} selectedId={selectedId} />
          {markers.map((marker) => {
            const isSelected = marker.id === selectedId;
            return (
              <AdvancedMarker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                title={marker.label}
                onClick={() => handleClick(marker.id)}
              >
                <Pin
                  background={isSelected ? '#2563eb' : '#ef4444'}
                  glyphColor="#fff"
                  borderColor={isSelected ? '#1d4ed8' : '#dc2626'}
                  scale={isSelected ? 1.3 : 1}
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
};
