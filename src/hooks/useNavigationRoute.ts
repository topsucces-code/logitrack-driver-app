import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from '../contexts/LocationContext';
import {
  fetchRoute,
  buildFallbackRoute,
  shouldRefetchRoute,
  getRemainingDistanceKm,
  clearRouteCache,
  type RouteResult,
} from '../services/osrmRouteService';
import { estimateTravelTime } from '../services/navigationService';

interface UseNavigationRouteOptions {
  destination: { lat: number; lng: number };
  enabled: boolean;
}

interface UseNavigationRouteReturn {
  route: RouteResult | null;
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
  const { position } = useLocation();
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const destRef = useRef(destination);
  destRef.current = destination;

  const doFetchRoute = useCallback(async (origin: { lat: number; lng: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchRoute(origin, destRef.current);
      setRoute(result);
      setIsFallback(false);
    } catch (err) {
      // Fallback to straight line
      const fallback = buildFallbackRoute(origin, destRef.current);
      setRoute(fallback);
      setIsFallback(true);
      setError('Itinéraire indisponible, ligne directe affichée');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch when enabled + position available
  useEffect(() => {
    if (!enabled || !position) return;
    doFetchRoute(position);
    return () => { clearRouteCache(); };
  }, [enabled, !!position]); // Only re-run when enabled toggles or position first appears

  // Update remaining distance/ETA on position changes
  useEffect(() => {
    if (!enabled || !position || !route) return;

    const dist = getRemainingDistanceKm(position, destRef.current);
    setRemainingDistanceKm(dist);
    setEtaMinutes(estimateTravelTime(dist, 'moto'));

    // Check for deviation and auto-refetch
    if (shouldRefetchRoute(position)) {
      doFetchRoute(position);
    }
  }, [enabled, position?.lat, position?.lng, route, doFetchRoute]);

  const refetchRoute = useCallback(() => {
    if (position) {
      clearRouteCache();
      doFetchRoute(position);
    }
  }, [position, doFetchRoute]);

  return {
    route,
    isLoading,
    error,
    remainingDistanceKm,
    etaMinutes,
    isFallback,
    refetchRoute,
  };
}
