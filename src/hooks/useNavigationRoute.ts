import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from '../contexts/LocationContext';
import {
  fetchDirections,
  getRemainingDistanceKm,
  shouldRefetchRoute,
  clearRouteCache,
} from '../services/googleDirectionsService';
import { estimateTravelTime } from '../services/navigationService';

interface UseNavigationRouteOptions {
  destination: { lat: number; lng: number };
  enabled: boolean;
}

interface UseNavigationRouteReturn {
  directions: google.maps.DirectionsResult | null;
  isLoading: boolean;
  error: string | null;
  remainingDistanceKm: number | null;
  etaMinutes: number | null;
  isFallback: boolean;
  refetchRoute: () => void;
}

export function useNavigationRoute({
  destination,
  enabled,
}: UseNavigationRouteOptions): UseNavigationRouteReturn {
  const { position, getCurrentPosition } = useLocation();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const destRef = useRef(destination);
  destRef.current = destination;
  const fetchedRef = useRef(false);

  const doFetchRoute = useCallback(async (origin: { lat: number; lng: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchDirections(origin, destRef.current);
      setDirections(result);
      setIsFallback(false);
    } catch (err) {
      // Fallback: no directions, just show straight line
      setDirections(null);
      setIsFallback(true);
      setError('Itinéraire indisponible, ligne directe affichée');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch when enabled - try to get position if not available
  useEffect(() => {
    if (!enabled || fetchedRef.current) return;

    async function init() {
      let pos = position;
      if (!pos) {
        // Try to get GPS position on demand
        pos = await getCurrentPosition();
      }
      if (pos) {
        fetchedRef.current = true;
        doFetchRoute(pos);
      }
    }

    init();
    return () => { clearRouteCache(); fetchedRef.current = false; };
  }, [enabled, !!position]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update remaining distance/ETA on position changes
  useEffect(() => {
    if (!enabled || !position) return;

    const dist = getRemainingDistanceKm(position, destRef.current);
    setRemainingDistanceKm(dist);
    setEtaMinutes(estimateTravelTime(dist, 'moto'));

    // Check for deviation and auto-refetch
    if (shouldRefetchRoute(position)) {
      doFetchRoute(position);
    }
  }, [enabled, position?.lat, position?.lng, directions, doFetchRoute]);

  const refetchRoute = useCallback(() => {
    if (position) {
      clearRouteCache();
      doFetchRoute(position);
    }
  }, [position, doFetchRoute]);

  return {
    directions,
    isLoading,
    error,
    remainingDistanceKm,
    etaMinutes,
    isFallback,
    refetchRoute,
  };
}
