import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type ErrorInfo } from 'react';
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

// ==================== ERROR BOUNDARY ====================
interface EBProps { children: ReactNode; onClose: () => void; }
interface EBState { error: string | null; }

class NavErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('[NavMap] crash:', err, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center p-6">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-white text-center mb-2 font-semibold">Erreur de navigation</p>
          <p className="text-gray-400 text-sm text-center mb-6">{this.state.error}</p>
          <button onClick={this.props.onClose} className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium">
            Fermer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== TYPES ====================
interface NavigationMapViewProps {
  destination: { lat: number; lng: number };
  destinationLabel: string;
  destinationType: 'pickup' | 'delivery';
  onClose: () => void;
}

// ==================== HELPERS ====================
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

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

// ==================== INNER COMPONENT ====================
function NavigationMapInner({
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

  // Route info from Google
  const routeInfo = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]) return null;
    const leg = directions.routes[0].legs[0];
    return {
      distanceText: leg.distance?.text || '',
      durationText: leg.duration?.text || '',
    };
  }, [directions]);

  // Call DirectionsService
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
          if (mapRef.current) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(origin);
            bounds.extend(destination);
            mapRef.current.fitBounds(bounds, 50);
          }
        } else {
          setRouteError(`Erreur: ${status}`);
        }
      },
    );
  }, [destination]);

  // Init on mount
  useEffect(() => {
    if (!isLoaded) return;

    (async () => {
      let pos = position;
      if (!pos) {
        try { pos = await getCurrentPosition(); } catch { /* */ }
      }
      if (pos) {
        calculateRoute(pos);
      } else {
        setLoading(false);
        setRouteError('GPS indisponible. Activez la localisation.');
      }
    })();
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-follow
  useEffect(() => {
    if (!followDriver || !mapRef.current || !position) return;
    mapRef.current.panTo(position);
    if ((mapRef.current.getZoom() ?? 0) < 15) mapRef.current.setZoom(16);
  }, [followDriver, position?.lat, position?.lng]);

  // Current step
  const currentStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !position) return null;
    const steps = directions.routes[0].legs[0].steps;
    for (let i = 0; i < steps.length; i++) {
      const end = steps[i].end_location;
      const d = distM(position.lat, position.lng, end.lat(), end.lng());
      if (d > 40) {
        return { index: i, instruction: stripHtml(steps[i].instructions || ''), distToEnd: d, maneuver: steps[i].maneuver, total: steps.length };
      }
    }
    return { index: steps.length - 1, instruction: 'Vous êtes arrivé à destination', distToEnd: 0, maneuver: undefined, total: steps.length };
  }, [directions, position?.lat, position?.lng]);

  // Next step
  const nextStep = useMemo(() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !currentStep) return null;
    const steps = directions.routes[0].legs[0].steps;
    const ni = currentStep.index + 1;
    if (ni >= steps.length) return null;
    return { instruction: stripHtml(steps[ni].instructions || ''), distText: steps[ni].distance?.text || '', maneuver: steps[ni].maneuver };
  }, [directions, currentStep]);

  const destMarkerUrl = destinationType === 'pickup' ? PICKUP_MARKER_URL : DELIVERY_MARKER_URL;

  const handleRetry = useCallback(() => {
    if (position) {
      calculateRoute(position);
    } else {
      getCurrentPosition().then(pos => { if (pos) calculateRoute(pos); });
    }
  }, [position, calculateRoute, getCurrentPosition]);

  // Build marker icon only when google is available
  const getIcon = useCallback((url: string) => {
    if (typeof google === 'undefined' || !google.maps) return undefined;
    return {
      url,
      scaledSize: new google.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height),
      anchor: new google.maps.Point(MARKER_ANCHOR.x, MARKER_ANCHOR.y),
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gray-900">

      {/* TOP BAR */}
      {currentStep && !loading ? (
        <div className="bg-primary-600 safe-top px-3 py-3 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ManeuverIcon maneuver={currentStep.maneuver} className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {currentStep.distToEnd > 0 && (
                <p className="text-white/80 text-xs font-medium">dans {formatDist(currentStep.distToEnd)}</p>
              )}
              <p className="text-white font-semibold text-sm leading-tight line-clamp-2">{currentStep.instruction}</p>
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

      {/* ROUTE INFO PILL */}
      {routeInfo && !loading && (
        <div className="absolute z-20 left-3 right-3" style={{ top: currentStep && nextStep ? '140px' : currentStep ? '110px' : '65px' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900 dark:text-white text-sm">{routeInfo.distanceText}</span>
              <span className="text-xs text-gray-500">{routeInfo.durationText}</span>
            </div>
            <button onClick={handleRetry} className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* MAP */}
      <div className="flex-1 relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={destination}
            zoom={14}
            options={{
              disableDefaultUI: true,
              zoomControl: false,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            }}
            onLoad={(map) => { mapRef.current = map; }}
            onDragStart={() => setFollowDriver(false)}
          >
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: { strokeColor: '#4285F4', strokeWeight: 6, strokeOpacity: 0.9 },
                }}
              />
            )}
            <MarkerF position={destination} icon={getIcon(destMarkerUrl)} title={destinationLabel} />
            {position && <MarkerF position={position} icon={getIcon(DRIVER_MARKER_URL)} title="Vous" />}
          </GoogleMap>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* FOLLOW BUTTON */}
      {!followDriver && position && (
        <button
          onClick={() => { setFollowDriver(true); if (mapRef.current && position) { mapRef.current.panTo(position); mapRef.current.setZoom(16); } }}
          className="absolute bottom-20 right-3 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 active:scale-95 transition-transform"
        >
          <Locate className="w-5 h-5 text-primary-500" />
        </button>
      )}

      {/* BOTTOM BAR */}
      <div className="bg-white dark:bg-gray-800 safe-bottom px-3 py-3 shadow-up z-10">
        <button onClick={onClose} className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200">
          Fermer
        </button>
      </div>
    </div>
  );
}

// ==================== EXPORTED WRAPPER WITH ERROR BOUNDARY ====================
export function NavigationMapView(props: NavigationMapViewProps) {
  return (
    <NavErrorBoundary onClose={props.onClose}>
      <NavigationMapInner {...props} />
    </NavErrorBoundary>
  );
}
