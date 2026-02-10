import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { X, Navigation, RefreshCw, Crosshair, Loader2, AlertTriangle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useNavigationRoute } from '../hooks/useNavigationRoute';
import { pickupIcon, deliveryIcon, driverIcon } from '../config/mapIcons';
import { openGoogleMaps } from '../services/navigationService';
import { formatDistance, formatTravelTime } from '../services/navigationService';

interface NavigationMapViewProps {
  destination: { lat: number; lng: number };
  destinationLabel: string;
  /** 'pickup' uses green marker, 'delivery' uses red marker */
  destinationType: 'pickup' | 'delivery';
  onClose: () => void;
}

/** Sub-component that controls map bounds (needs useMap inside MapContainer) */
function MapBoundsController({
  driverPos,
  destination,
  recenterFlag,
}: {
  driverPos: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
  recenterFlag: number;
}) {
  const map = useMap();

  // Fit bounds on mount and when recenter is requested
  useEffect(() => {
    const points: [number, number][] = [[destination.lat, destination.lng]];
    if (driverPos) {
      points.push([driverPos.lat, driverPos.lng]);
    }
    if (points.length >= 2) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [50, 50] });
    } else {
      map.setView([destination.lat, destination.lng], 15);
    }
  }, [recenterFlag]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Update driver marker position without re-rendering the whole map */
function DriverMarkerUpdater({ position }: { position: { lat: number; lng: number } | null }) {
  if (!position) return null;
  return (
    <Marker position={[position.lat, position.lng]} icon={driverIcon}>
      <Popup>Votre position</Popup>
    </Marker>
  );
}

export function NavigationMapView({
  destination,
  destinationLabel,
  destinationType,
  onClose,
}: NavigationMapViewProps) {
  const { position } = useLocation();

  const {
    route,
    isLoading,
    error,
    remainingDistanceKm,
    etaMinutes,
    isFallback,
    refetchRoute,
  } = useNavigationRoute({ destination, enabled: true });

  const [recenterFlag, setRecenterFlag] = useState(0);

  const handleRecenter = useCallback(() => {
    setRecenterFlag((f) => f + 1);
  }, []);

  const handleOpenGoogleMaps = useCallback(() => {
    openGoogleMaps({
      latitude: destination.lat,
      longitude: destination.lng,
      label: destinationLabel,
    });
  }, [destination, destinationLabel]);

  const destMarkerIcon = destinationType === 'pickup' ? pickupIcon : deliveryIcon;

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
        <MapContainer
          center={[destination.lat, destination.lng]}
          zoom={14}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />

          {/* Route polyline */}
          {route && (
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: isFallback ? '#9CA3AF' : '#3B82F6',
                weight: 5,
                opacity: 0.8,
                dashArray: isFallback ? '10, 10' : undefined,
              }}
            />
          )}

          {/* Destination marker */}
          <Marker position={[destination.lat, destination.lng]} icon={destMarkerIcon}>
            <Popup>{destinationLabel}</Popup>
          </Marker>

          {/* Driver marker (updates in real-time) */}
          <DriverMarkerUpdater position={position} />

          {/* Bounds controller */}
          <MapBoundsController
            driverPos={position}
            destination={destination}
            recenterFlag={recenterFlag}
          />
        </MapContainer>
      </div>

      {/* Bottom bar */}
      <div className="bg-white dark:bg-gray-800 safe-bottom px-3 py-3 flex gap-2 shadow-up z-10">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
        >
          Fermer
        </button>
        <button
          onClick={handleOpenGoogleMaps}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Navigation className="w-4 h-4" />
          Google Maps
        </button>
      </div>
    </div>
  );
}
