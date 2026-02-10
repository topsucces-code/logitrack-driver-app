import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import {
  X, RefreshCw, Locate, Loader2, AlertTriangle,
  ArrowUp, ArrowLeft, ArrowRight, CornerDownLeft, CornerDownRight,
  RotateCcw, RotateCw, Navigation,
} from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useGoogleMaps } from './GoogleMapsProvider';
import {
  DRIVER_MARKER_URL,
  PICKUP_MARKER_URL,
  DELIVERY_MARKER_URL,
  MARKER_SIZE,
  MARKER_ANCHOR,
} from '../config/mapIcons';

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

/** Strip HTML tags */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/** Haversine distance in meters */
function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function formatTime(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ''}`;
}

/** Maneuver icon */
function ManeuverIcon({ maneuver, className }: { maneuver?: string; className?: string }) {
  const c = className || 'w-6 h-6';
  switch (maneuver) {
    case 'turn-left': return <CornerDownLeft className={c} />;
    case 'turn-right': return <CornerDownRight className={c} />;
    case 'turn-slight-left': case 'fork-left': case 'ramp-left': return <ArrowLeft className={c} />;
    case 'turn-slight-right': case 'fork-right': case 'ramp-right': return <ArrowRight className={c} />;
    case 'uturn-left': case 'roundabout-left': return <RotateCcw className={c} />;
    case 'uturn-right': case 'roundabout-right': return <RotateCw className={c} />;
    case 'straight': case 'merge': return <ArrowUp className={c} />;
    default: return <Navigation className={c} />;
  }
}

export function NavigationMapView({
  destination,
  destinationLabel,
  destinationType,
  onClose,
}: NavigationMapViewProps) {
  const { position, getCurrentPosition } = useLocation();
  const { isLoaded } = useGoogleMaps();

  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followDriver, setFollowDriver] = useState(true);

  // Total distance & time from Google Directions response
  const routeInfo = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]) return null;
    const leg = directions.routes[0].legs[0];
    return {
      distanceText: leg.distance?.text || '',
      distanceValue: leg.distance?.value || 0,
      durationText: leg.duration?.text || '',
      durationMin: Math.ceil((leg.duration?.value || 0) / 60),
    };
  }, [directions]);

  // --- Call DirectionsService directly ---
  const calculateRoute = useCallback((origin: { lat: number; lng: number }) => {
    if (typeof google === 'undefined' || !google.maps) {
      setRouteError('Google Maps non chargé');
      setLoading(false);
      return;
    }

    setLoading(true);
    setRouteError(null);

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setLoading(false);
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          setRouteError(null);
          // Fit bounds to show full route
          if (mapRef.current) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(origin);
            bounds.extend(destination);
            mapRef.current.fitBounds(bounds, 50);
          }
        } else {
          console.error('[Navigation] DirectionsService status:', status);
          setRouteError(`Erreur itinéraire (${status})`);
        }
      },
    );
  }, [destination]);

  // Get position and calculate route on mount
  useEffect(() => {
    if (!isLoaded) return;

    async function init() {
      let pos = position;
      if (!pos) {
        try {
          pos = await getCurrentPosition();
        } catch { /* ignore */ }
      }

      if (pos) {
        calculateRoute(pos);
      } else {
        setLoading(false);
        setRouteError('GPS indisponible. Activez la localisation.');
      }
    }

    init();
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-follow driver
  useEffect(() => {
    if (!followDriver || !mapRef.current || !position) return;
    mapRef.current.panTo(position);
    if (mapRef.current.getZoom()! < 15) mapRef.current.setZoom(16);
  }, [followDriver, position?.lat, position?.lng]);

  // --- Current turn-by-turn step ---
  const currentStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !position) return null;
    const steps = directions.routes[0].legs[0].steps;

    for (let i = 0; i < steps.length; i++) {
      const end = steps[i].end_location;
      const d = distM(position.lat, position.lng, end.lat(), end.lng());
      if (d > 40) {
        return {
          index: i,
          instruction: stripHtml(steps[i].instructions || ''),
          distToEnd: d,
          maneuver: steps[i].maneuver,
          total: steps.length,
        };
      }
    }

    return { index: steps.length - 1, instruction: 'Vous êtes arrivé à destination', distToEnd: 0, maneuver: undefined, total: steps.length };
  }, [directions, position?.lat, position?.lng]);

  const nextStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !currentStep) return null;
    const steps = directions.routes[0].legs[0].steps;
    const ni = currentStep.index + 1;
    if (ni >= steps.length) return null;
    return { instruction: stripHtml(steps[ni].instructions || ''), distText: steps[ni].distance?.text || '', maneuver: steps[ni].maneuver };
  }, [directions, currentStep]);

  const destMarkerUrl = destinationType === 'pickup' ? PICKUP_MARKER_URL : DELIVERY_MARKER_URL;

  const markerIcon = useCallback((url: string) => ({
    url,
    scaledSize: new google.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height),
    anchor: new google.maps.Point(MARKER_ANCHOR.x, MARKER_ANCHOR.y),
  }), []);

  const handleRetry = useCallback(() => {
    if (position) {
      calculateRoute(position);
    } else {
      getCurrentPosition().then(pos => { if (pos) calculateRoute(pos); });
    }
  }, [position, calculateRoute, getCurrentPosition]);

  // --- Not loaded yet ---
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-900">

      {/* === TOP BAR: Turn-by-turn OR loading/error === */}
      {currentStep && !loading ? (
        // Turn-by-turn guidance banner
        <div className="bg-primary-600 safe-top px-3 py-3 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ManeuverIcon maneuver={currentStep.maneuver} className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {currentStep.distToEnd > 0 && (
                <p className="text-white/80 text-xs font-medium">
                  dans {formatDist(currentStep.distToEnd)}
                </p>
              )}
              <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                {currentStep.instruction}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {nextStep && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
              <ManeuverIcon maneuver={nextStep.maneuver} className="w-4 h-4 text-white/60" />
              <p className="text-white/60 text-xs truncate flex-1">Puis : {nextStep.instruction}</p>
              {nextStep.distText && <span className="text-white/40 text-xs flex-shrink-0">{nextStep.distText}</span>}
            </div>
          )}
        </div>
      ) : (
        // Loading / error bar
        <div className="bg-white dark:bg-gray-800 safe-top px-3 py-2.5 flex items-center gap-2 shadow-md z-10">
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calcul de l'itinéraire...
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{destinationLabel}</p>
            )}
            {routeError && (
              <div className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                {routeError}
              </div>
            )}
          </div>
          {!loading && (
            <button onClick={handleRetry} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 flex-shrink-0">
              <RefreshCw className="w-3 h-3" />
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* === FLOATING: distance + ETA pill === */}
      {routeInfo && !loading && (
        <div className="absolute z-20 left-3 right-3" style={{ top: currentStep && nextStep ? '135px' : currentStep ? '105px' : '60px' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900 dark:text-white text-sm">{routeInfo.distanceText}</span>
              <span className="text-xs text-gray-500">{routeInfo.durationText}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleRetry} className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <RefreshCw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MAP === */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={destination}
          zoom={14}
          options={mapOptions}
          onLoad={(map) => { mapRef.current = map; }}
          onDragStart={() => setFollowDriver(false)}
        >
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#4285F4',
                  strokeWeight: 6,
                  strokeOpacity: 0.9,
                },
              }}
            />
          )}

          <MarkerF position={destination} icon={markerIcon(destMarkerUrl)} title={destinationLabel} />

          {position && (
            <MarkerF position={position} icon={markerIcon(DRIVER_MARKER_URL)} title="Vous" />
          )}
        </GoogleMap>
      </div>

      {/* === FLOATING: follow-me button === */}
      {!followDriver && position && (
        <button
          onClick={() => { setFollowDriver(true); if (mapRef.current && position) { mapRef.current.panTo(position); mapRef.current.setZoom(16); } }}
          className="absolute bottom-20 right-3 z-20 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 active:scale-95 transition-transform"
        >
          <Locate className="w-5 h-5 text-primary-500" />
        </button>
      )}

      {/* === BOTTOM BAR === */}
      <div className="bg-white dark:bg-gray-800 safe-bottom px-3 py-3 shadow-up z-10">
        <button onClick={onClose} className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors">
          Fermer
        </button>
      </div>
    </div>
  );
}
