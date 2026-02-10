import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, DirectionsRenderer, MarkerF, PolylineF } from '@react-google-maps/api';
import { X, RefreshCw, Crosshair, Locate, Loader2, AlertTriangle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useGoogleMaps } from './GoogleMapsProvider';
import { useNavigationRoute } from '../hooks/useNavigationRoute';
import {
  PICKUP_MARKER_URL,
  DELIVERY_MARKER_URL,
  DRIVER_MARKER_URL,
  MARKER_SIZE,
  MARKER_ANCHOR,
} from '../config/mapIcons';
import { formatDistance, formatTravelTime } from '../services/navigationService';

interface NavigationMapViewProps {
  destination: { lat: number; lng: number };
  destinationLabel: string;
  destinationType: 'pickup' | 'delivery';
  onClose: () => void;
}

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

export function NavigationMapView({
  destination,
  destinationLabel,
  destinationType,
  onClose,
}: NavigationMapViewProps) {
  const { position } = useLocation();
  const { isLoaded } = useGoogleMaps();

  const {
    directions,
    isLoading,
    error,
    remainingDistanceKm,
    etaMinutes,
    isFallback,
    refetchRoute,
  } = useNavigationRoute({ destination, enabled: isLoaded });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [followDriver, setFollowDriver] = useState(true);

  // Auto-follow driver position
  useEffect(() => {
    if (!followDriver || !mapRef.current || !position) return;
    mapRef.current.panTo(position);
    if (mapRef.current.getZoom()! < 15) {
      mapRef.current.setZoom(16);
    }
  }, [followDriver, position?.lat, position?.lng]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(destination);
    if (position) bounds.extend(position);
    mapRef.current.fitBounds(bounds, 50);
  }, [destination, position]);

  const handleFollowMe = useCallback(() => {
    setFollowDriver(true);
    if (mapRef.current && position) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(16);
    }
  }, [position]);

  const destMarkerUrl = destinationType === 'pickup' ? PICKUP_MARKER_URL : DELIVERY_MARKER_URL;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Fit bounds on load
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(destination);
    if (position) bounds.extend(position);
    map.fitBounds(bounds, 50);
  }, [destination, position]);

  const markerIcon = useCallback((url: string) => ({
    url,
    scaledSize: new google.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height),
    anchor: new google.maps.Point(MARKER_ANCHOR.x, MARKER_ANCHOR.y),
  }), []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-900">
      {/* Top bar: distance + ETA */}
      <div className="bg-white dark:bg-gray-800 safe-top px-3 py-2.5 flex items-center gap-2 shadow-md z-10">
        <button
          onClick={onClose}
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Calcul de l'itinéraire...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {remainingDistanceKm !== null && (
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {formatDistance(remainingDistanceKm)}
                  </span>
                )}
                {etaMinutes !== null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ~{formatTravelTime(etaMinutes)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {destinationLabel}
              </p>
            </>
          )}
          {error && (
            <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleRecenter}
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0"
          title="Recentrer"
        >
          <Crosshair className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={refetchRoute}
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0"
          title="Recalculer"
        >
          <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={destination}
          zoom={14}
          options={mapOptions}
          onLoad={onMapLoad}
          onDragStart={() => setFollowDriver(false)}
        >
          {/* Route via DirectionsRenderer */}
          {directions && !isFallback && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#3B82F6',
                  strokeWeight: 5,
                  strokeOpacity: 0.8,
                },
              }}
            />
          )}

          {/* Fallback straight line when Directions fails */}
          {isFallback && position && (
            <PolylineF
              path={[position, destination]}
              options={{
                strokeColor: '#9CA3AF',
                strokeWeight: 5,
                strokeOpacity: 0,
                icons: [{
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                  offset: '0',
                  repeat: '15px',
                }],
              }}
            />
          )}

          {/* Destination marker */}
          <MarkerF
            position={destination}
            icon={markerIcon(destMarkerUrl)}
            title={destinationLabel}
          />

          {/* Driver marker (updates in real-time) */}
          {position && (
            <MarkerF
              position={position}
              icon={markerIcon(DRIVER_MARKER_URL)}
              title="Votre position"
            />
          )}
        </GoogleMap>
        )}
      </div>

      {/* Floating follow-me button (when auto-follow is off) */}
      {!followDriver && position && (
        <button
          onClick={handleFollowMe}
          className="absolute bottom-20 right-3 z-20 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
        >
          <Locate className="w-5 h-5 text-primary-500" />
        </button>
      )}

      {/* Bottom bar */}
      <div className="bg-white dark:bg-gray-800 safe-bottom px-3 py-3 shadow-up z-10">
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
