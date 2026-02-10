import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, DirectionsRenderer, MarkerF, PolylineF } from '@react-google-maps/api';
import {
  X, RefreshCw, Crosshair, Locate, Loader2, AlertTriangle,
  ArrowUp, ArrowLeft, ArrowRight, CornerDownLeft, CornerDownRight,
  RotateCcw, RotateCw, Flag, Navigation,
} from 'lucide-react';
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

/** Haversine distance in meters between two points */
function distMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/** Get a lucide icon for a Google Maps maneuver string */
function ManeuverIcon({ maneuver, className }: { maneuver?: string; className?: string }) {
  const cls = className || 'w-6 h-6';
  switch (maneuver) {
    case 'turn-left':
      return <CornerDownLeft className={cls} />;
    case 'turn-right':
      return <CornerDownRight className={cls} />;
    case 'turn-slight-left':
    case 'fork-left':
    case 'ramp-left':
      return <ArrowLeft className={cls} />;
    case 'turn-slight-right':
    case 'fork-right':
    case 'ramp-right':
      return <ArrowRight className={cls} />;
    case 'uturn-left':
      return <RotateCcw className={cls} />;
    case 'uturn-right':
      return <RotateCw className={cls} />;
    case 'roundabout-left':
      return <RotateCcw className={cls} />;
    case 'roundabout-right':
      return <RotateCw className={cls} />;
    case 'straight':
    case 'merge':
      return <ArrowUp className={cls} />;
    default:
      return <Navigation className={cls} />;
  }
}

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

  // --- Turn-by-turn: find current step based on driver position ---
  const currentStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !position) return null;

    const steps = directions.routes[0].legs[0].steps;

    // Find the first step whose end_location the driver hasn't reached yet
    for (let i = 0; i < steps.length; i++) {
      const end = steps[i].end_location;
      const dist = distMeters(position.lat, position.lng, end.lat(), end.lng());
      if (dist > 40) {
        // Driver hasn't reached this step's end yet → this is the current step
        // Calculate distance from driver to this step's end
        return {
          index: i,
          instruction: stripHtml(steps[i].instructions || ''),
          distanceText: steps[i].distance?.text || '',
          distanceToEnd: dist,
          maneuver: steps[i].maneuver,
          totalSteps: steps.length,
        };
      }
    }

    // All steps passed → arrived
    return {
      index: steps.length - 1,
      instruction: 'Vous êtes arrivé à destination',
      distanceText: '',
      distanceToEnd: 0,
      maneuver: undefined,
      totalSteps: steps.length,
    };
  }, [directions, position?.lat, position?.lng]);

  // Next step (the one after current)
  const nextStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !currentStep) return null;
    const steps = directions.routes[0].legs[0].steps;
    const nextIdx = currentStep.index + 1;
    if (nextIdx >= steps.length) return null;
    return {
      instruction: stripHtml(steps[nextIdx].instructions || ''),
      distanceText: steps[nextIdx].distance?.text || '',
      maneuver: steps[nextIdx].maneuver,
    };
  }, [directions, currentStep]);

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
      {/* Turn-by-turn instruction banner */}
      {currentStep && !isLoading && (
        <div className="bg-primary-600 safe-top px-3 py-3 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            {/* Maneuver icon */}
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ManeuverIcon maneuver={currentStep.maneuver} className="w-7 h-7 text-white" />
            </div>
            {/* Instruction */}
            <div className="flex-1 min-w-0">
              {currentStep.distanceToEnd > 0 && (
                <p className="text-white/80 text-xs font-medium">
                  dans {currentStep.distanceToEnd < 1000
                    ? `${Math.round(currentStep.distanceToEnd)} m`
                    : `${(currentStep.distanceToEnd / 1000).toFixed(1)} km`}
                </p>
              )}
              <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                {currentStep.instruction}
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Next step preview */}
          {nextStep && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
              <ManeuverIcon maneuver={nextStep.maneuver} className="w-4 h-4 text-white/60" />
              <p className="text-white/60 text-xs truncate flex-1">
                Puis : {nextStep.instruction}
              </p>
              {nextStep.distanceText && (
                <span className="text-white/40 text-xs flex-shrink-0">{nextStep.distanceText}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info bar: shown when no step guidance (loading, error, or fallback) */}
      {(!currentStep || isLoading) && (
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
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">
                  {destinationLabel}
                </p>
                {error && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                    <AlertTriangle className="w-3 h-3" />
                    {error}
                  </div>
                )}
              </>
            )}
          </div>
          {!isLoading && (
            <button
              onClick={refetchRoute}
              className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Calculer
            </button>
          )}
        </div>
      )}

      {/* Floating distance/ETA pill (on top of map, when step guidance is active) */}
      {currentStep && !isLoading && (remainingDistanceKm !== null || etaMinutes !== null) && (
        <div className="absolute top-auto z-20 left-3 right-3" style={{ top: currentStep && nextStep ? '140px' : '110px' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-3 py-2 flex items-center justify-between">
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
            <div className="flex items-center gap-1">
              <button
                onClick={handleRecenter}
                className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
              >
                <Crosshair className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={refetchRoute}
                className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      )}

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
