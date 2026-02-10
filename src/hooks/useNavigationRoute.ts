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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const destRef = useRef(destination);
  destRef.current = destination;
  const hasFetchedRef = useRef(false);

  const doFetchRoute = useCallback(async (origin: { lat: number; lng: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchDirections(origin, destRef.current);
      setDirections(result);
      setIsFallback(false);
      setError(null);
    } catch (err: any) {
      console.error('[Navigation] Directions error:', err?.message || err);
      setDirections(null);
      setIsFallback(true);
      setError('Itinéraire indisponible, ligne directe affichée');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch route when enabled and we have (or can get) a position
  useEffect(() => {
    if (!enabled) return;
    // Already fetched successfully
    if (hasFetchedRef.current && directions) return;

    let cancelled = false;

    async function init() {
      let pos = position;

      // If no cached position, request one on-demand
      if (!pos) {
        try {
          pos = await getCurrentPosition();
        } catch {
          // GPS failed
        }
      }

      if (cancelled) return;

      if (pos) {
        hasFetchedRef.current = true;
        await doFetchRoute(pos);
      } else {
        setIsLoading(false);
        setError('Position GPS indisponible. Activez la localisation.');
      }
    }

    init();

    return () => {
      cancelled = true;
      clearRouteCache();
      hasFetchedRef.current = false;
    };
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
    clearRouteCache();
    hasFetchedRef.current = false;
    if (position) {
      doFetchRoute(position);
    } else {
      // Try to get position first
      getCurrentPosition().then((pos) => {
        if (pos) doFetchRoute(pos);
      });
    }
  }, [position, doFetchRoute, getCurrentPosition]);

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
