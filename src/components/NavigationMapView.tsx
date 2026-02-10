import { Component, useCallback, useEffect, useRef, useState, type ReactNode, type ErrorInfo } from 'react';
import { GoogleMap, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import {
  X, RefreshCw, Locate, Loader2, AlertTriangle,
  ArrowUp, ArrowLeft, ArrowRight, CornerDownLeft, CornerDownRight,
  RotateCcw, RotateCw, Navigation, Volume2, VolumeX, CheckCircle,
} from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useGoogleMaps } from './GoogleMapsProvider';
import { useNavigationVoice } from '../hooks/useNavigationVoice';
import { NAVIGATION_MAP_STYLE } from '../config/navigationMapStyle';
import {
  DRIVER_MARKER_URL,
  PICKUP_MARKER_URL,
  DELIVERY_MARKER_URL,
  MARKER_SIZE,
  MARKER_ANCHOR,
} from '../config/mapIcons';

// ==================== CONSTANTS ====================
const DEVIATION_THRESHOLD_M = 100;
const REROUTE_COOLDOWN_MS = 15_000;
const ARRIVAL_THRESHOLD_M = 50;
const VOICE_ANNOUNCE_THRESHOLD_M = 200;
const ARRIVAL_AUTO_CLOSE_MS = 5_000;

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

// ==================== MAP ERROR BOUNDARY ====================
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('[MapEB] crash:', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-gray-200 p-4">
          <AlertTriangle className="w-8 h-8 text-orange-400 mb-2" />
          <p className="text-gray-600 text-sm text-center">Carte indisponible</p>
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

function formatEta(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Minimum distance from a point to a polyline (array of LatLng) */
function distToPolyline(
  point: { lat: number; lng: number },
  path: google.maps.LatLng[],
): number {
  let minDist = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distToSegment(
      point,
      { lat: path[i].lat(), lng: path[i].lng() },
      { lat: path[i + 1].lat(), lng: path[i + 1].lng() },
    );
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/** Distance from point P to segment AB (in meters, approximate flat-earth for short distances) */
function distToSegment(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  // Convert to meters (approximate at equatorial latitudes — good enough for < 1km)
  const R = 6371000;
  const toRad = Math.PI / 180;
  const cosLat = Math.cos(p.lat * toRad);
  const px = (p.lng - a.lng) * toRad * R * cosLat;
  const py = (p.lat - a.lat) * toRad * R;
  const bx = (b.lng - a.lng) * toRad * R * cosLat;
  const by = (b.lat - a.lat) * toRad * R;

  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);

  let t = (px * bx + py * by) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = t * bx;
  const projY = t * by;
  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
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
  const { position, heading, speed, getCurrentPosition } = useLocation();
  const { isLoaded } = useGoogleMaps();

  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followDriver, setFollowDriver] = useState(true);
  const [isRerouting, setIsRerouting] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);

  // Refs for forward-only step tracking & reroute cooldown
  const currentStepIndexRef = useRef(0);
  const lastRerouteRef = useRef(0);
  const arrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice guidance
  const {
    announceStep,
    announceArrival,
    announceRerouting,
    resetStepTracking,
    silence,
  } = useNavigationVoice(voiceMuted);

  // ---- Calculate route ----
  const calculateRoute = useCallback((origin: { lat: number; lng: number }, isReroute = false) => {
    if (typeof google === 'undefined' || !google.maps) {
      setRouteError('Google Maps non chargé');
      setLoading(false);
      return;
    }

    if (isReroute) {
      setIsRerouting(true);
    } else {
      setLoading(true);
    }
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
        setIsRerouting(false);
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          setRouteError(null);
          if (isReroute) {
            // Reset step tracking after reroute
            currentStepIndexRef.current = 0;
            resetStepTracking();
          }
          if (!isReroute && mapRef.current) {
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
  }, [destination, resetStepTracking]);

  // ---- Init on mount ----
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

  // ---- Auto-follow with heading rotation ----
  useEffect(() => {
    if (!followDriver || !mapRef.current || !position) return;
    mapRef.current.panTo(position);
    if ((mapRef.current.getZoom() ?? 0) < 15) mapRef.current.setZoom(16);

    // Rotate map to match heading
    if (heading !== null && heading > 0) {
      const map = mapRef.current;
      if (typeof map.setHeading === 'function') {
        map.setHeading(heading);
      }
      if (typeof map.setTilt === 'function') {
        map.setTilt(45);
      }
    }
  }, [followDriver, position?.lat, position?.lng, heading]);

  // ---- Forward-only current step tracking ----
  const currentStep = (() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !position) return null;
    const steps = directions.routes[0].legs[0].steps;
    const startIdx = currentStepIndexRef.current;

    // Forward-only scan from current index
    for (let i = startIdx; i < steps.length; i++) {
      const end = steps[i].end_location;
      const d = distM(position.lat, position.lng, end.lat(), end.lng());
      if (d > 40) {
        currentStepIndexRef.current = i;
        return { index: i, instruction: stripHtml(steps[i].instructions || ''), distToEnd: d, maneuver: steps[i].maneuver, total: steps.length };
      }
    }
    currentStepIndexRef.current = steps.length - 1;
    return { index: steps.length - 1, instruction: 'Vous êtes arrivé à destination', distToEnd: 0, maneuver: undefined, total: steps.length };
  })();

  // ---- Next step ----
  const nextStep = (() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !currentStep) return null;
    const steps = directions.routes[0].legs[0].steps;
    const ni = currentStep.index + 1;
    if (ni >= steps.length) return null;
    return { instruction: stripHtml(steps[ni].instructions || ''), distText: steps[ni].distance?.text || '', maneuver: steps[ni].maneuver };
  })();

  // ---- Dynamic ETA & distance (sum remaining steps) ----
  const dynamicRouteInfo = (() => {
    if (!directions?.routes?.[0]?.legs?.[0]?.steps || !currentStep || !position) return null;
    const steps = directions.routes[0].legs[0].steps;
    const idx = currentStep.index;

    let totalDistM = 0;
    let totalDurS = 0;

    // Partial distance for current step
    const curStepDist = steps[idx].distance?.value ?? 0;
    const curStepDur = steps[idx].duration?.value ?? 0;
    if (curStepDist > 0) {
      const ratio = Math.min(currentStep.distToEnd / curStepDist, 1);
      totalDistM += curStepDist * ratio;
      totalDurS += curStepDur * ratio;
    }

    // Sum remaining full steps
    for (let i = idx + 1; i < steps.length; i++) {
      totalDistM += steps[i].distance?.value ?? 0;
      totalDurS += steps[i].duration?.value ?? 0;
    }

    return {
      distanceText: formatDist(totalDistM),
      durationText: formatEta(totalDurS),
    };
  })();

  // ---- Voice announcements for upcoming step ----
  useEffect(() => {
    if (!currentStep || hasArrived) return;
    if (currentStep.distToEnd > 0 && currentStep.distToEnd <= VOICE_ANNOUNCE_THRESHOLD_M) {
      announceStep(currentStep.index, currentStep.instruction);
    }
  }, [currentStep?.index, currentStep?.distToEnd, hasArrived, announceStep]);

  // ---- Auto-reroute on deviation ----
  useEffect(() => {
    if (!position || !directions || loading || isRerouting || hasArrived) return;

    const path = directions.routes?.[0]?.overview_path;
    if (!path || path.length < 2) return;

    const dist = distToPolyline(position, path);
    if (dist > DEVIATION_THRESHOLD_M) {
      const now = Date.now();
      if (now - lastRerouteRef.current < REROUTE_COOLDOWN_MS) return;
      lastRerouteRef.current = now;

      announceRerouting();
      calculateRoute(position, true);
    }
  }, [position?.lat, position?.lng, directions, loading, isRerouting, hasArrived, announceRerouting, calculateRoute]);

  // ---- Arrival detection ----
  useEffect(() => {
    if (!position || hasArrived) return;
    const d = distM(position.lat, position.lng, destination.lat, destination.lng);
    if (d < ARRIVAL_THRESHOLD_M) {
      setHasArrived(true);
      announceArrival();
      arrivalTimerRef.current = setTimeout(onClose, ARRIVAL_AUTO_CLOSE_MS);
    }
  }, [position?.lat, position?.lng, destination, hasArrived, announceArrival, onClose]);

  // Cleanup arrival timer
  useEffect(() => {
    return () => {
      if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current);
    };
  }, []);

  // ---- Mute toggle side-effect ----
  useEffect(() => {
    if (voiceMuted) silence();
  }, [voiceMuted, silence]);

  const destMarkerUrl = destinationType === 'pickup' ? PICKUP_MARKER_URL : DELIVERY_MARKER_URL;

  const handleRetry = useCallback(() => {
    if (position) {
      calculateRoute(position);
    } else {
      getCurrentPosition().then(pos => { if (pos) calculateRoute(pos); });
    }
  }, [position, calculateRoute, getCurrentPosition]);

  const handleDragStart = useCallback(() => {
    setFollowDriver(false);
    // Reset heading/tilt when user drags
    if (mapRef.current) {
      if (typeof mapRef.current.setHeading === 'function') mapRef.current.setHeading(0);
      if (typeof mapRef.current.setTilt === 'function') mapRef.current.setTilt(0);
    }
  }, []);

  const handleRefollow = useCallback(() => {
    setFollowDriver(true);
    if (mapRef.current && position) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(16);
    }
  }, [position]);

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

      {/* ARRIVAL BANNER */}
      {hasArrived ? (
        <div className="bg-green-600 safe-top px-3 py-4 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-white flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-bold text-base">Vous êtes arrivé !</p>
              <p className="text-white/80 text-xs mt-0.5">{destinationLabel}</p>
            </div>
            <button onClick={onClose} className="px-3 py-1.5 bg-white/20 rounded-lg text-white text-xs font-medium">
              OK
            </button>
          </div>
        </div>
      ) : currentStep && !loading ? (
        /* TOP BAR — turn-by-turn instructions */
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
        /* LOADING / ERROR BAR */
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

      {/* ROUTE INFO PILL — dynamic ETA/distance + speed */}
      {dynamicRouteInfo && !loading && !hasArrived && (
        <div className="absolute z-20 left-3 right-3" style={{ top: currentStep && nextStep ? '140px' : currentStep ? '110px' : '65px' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900 dark:text-white text-sm">{dynamicRouteInfo.distanceText}</span>
              <span className="text-xs text-gray-500">~ {dynamicRouteInfo.durationText}</span>
              {speed !== null && speed > 0 && (
                <span className="text-xs font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                  {Math.round(speed)} km/h
                </span>
              )}
            </div>
            <button onClick={handleRetry} className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* REROUTING OVERLAY */}
      {isRerouting && (
        <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-black/70 rounded-xl px-5 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span className="text-white text-sm font-medium">Recalcul en cours...</span>
          </div>
        </div>
      )}

      {/* MAP */}
      <div className="flex-1 relative">
        <MapErrorBoundary>
          {isLoaded && typeof google !== 'undefined' && google.maps ? (
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
                gestureHandling: 'greedy',
                styles: NAVIGATION_MAP_STYLE,
              }}
              onLoad={(map) => { mapRef.current = map; }}
              onDragStart={handleDragStart}
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
        </MapErrorBoundary>
      </div>

      {/* MAP OVERLAY BUTTONS */}
      <div className="absolute bottom-20 right-3 z-20 flex flex-col gap-2">
        {/* Voice mute/unmute */}
        <button
          onClick={() => setVoiceMuted(m => !m)}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 active:scale-95 transition-transform"
        >
          {voiceMuted
            ? <VolumeX className="w-5 h-5 text-gray-400" />
            : <Volume2 className="w-5 h-5 text-primary-500" />
          }
        </button>

        {/* Re-center */}
        {!followDriver && position && (
          <button
            onClick={handleRefollow}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 active:scale-95 transition-transform"
          >
            <Locate className="w-5 h-5 text-primary-500" />
          </button>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="bg-white dark:bg-gray-800 safe-bottom px-3 py-3 shadow-up z-10">
        {hasArrived ? (
          <button onClick={onClose} className="w-full py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white">
            Terminé
          </button>
        ) : (
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200">
            Fermer
          </button>
        )}
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
