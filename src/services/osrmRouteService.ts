/**
 * OSRM Route Service - fetches driving routes from the free OSRM API.
 * No API key required.
 */

export interface RouteResult {
  /** Leaflet-compatible [lat, lng] coordinates */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

// In-memory cache
let cachedRoute: RouteResult | null = null;
let lastFetchTime = 0;

const DEVIATION_THRESHOLD_M = 150;
const REFETCH_COOLDOWN_MS = 30_000;

/** Haversine distance in meters between two [lat, lng] points */
function haversineMeters(
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

/**
 * Fetch a driving route from OSRM.
 * Origin/destination are { lat, lng } (Leaflet convention).
 * Returns coordinates as [lat, lng][] for Leaflet Polyline.
 */
export async function fetchRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<RouteResult> {
  // OSRM expects lng,lat order
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) {
    throw new Error('OSRM: no route found');
  }

  const route = json.routes[0];
  // GeoJSON coordinates are [lng, lat] → flip to [lat, lng] for Leaflet
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    (c: [number, number]) => [c[1], c[0]] as [number, number],
  );

  const result: RouteResult = {
    coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };

  cachedRoute = result;
  lastFetchTime = Date.now();

  return result;
}

/**
 * Check if the driver has deviated from the cached route.
 * Checks against every 5th point for performance.
 */
export function isDriverDeviating(driverPos: { lat: number; lng: number }): boolean {
  if (!cachedRoute) return false;

  const coords = cachedRoute.coordinates;
  let minDist = Infinity;

  for (let i = 0; i < coords.length; i += 5) {
    const dist = haversineMeters(driverPos.lat, driverPos.lng, coords[i][0], coords[i][1]);
    if (dist < minDist) minDist = dist;
    if (minDist < DEVIATION_THRESHOLD_M) return false;
  }

  // Also check last point
  const last = coords[coords.length - 1];
  const distLast = haversineMeters(driverPos.lat, driverPos.lng, last[0], last[1]);
  if (distLast < DEVIATION_THRESHOLD_M) return false;

  return minDist >= DEVIATION_THRESHOLD_M;
}

/**
 * Whether a route refetch should be triggered (deviation + cooldown elapsed).
 */
export function shouldRefetchRoute(driverPos: { lat: number; lng: number }): boolean {
  if (!cachedRoute) return true;
  const elapsed = Date.now() - lastFetchTime;
  return isDriverDeviating(driverPos) && elapsed > REFETCH_COOLDOWN_MS;
}

/**
 * Build a straight-line fallback route (used when OSRM fails).
 */
export function buildFallbackRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): RouteResult {
  const dist = haversineMeters(origin.lat, origin.lng, destination.lat, destination.lng);
  return {
    coordinates: [[origin.lat, origin.lng], [destination.lat, destination.lng]],
    distanceMeters: dist,
    durationSeconds: (dist / 1000 / 25) * 3600, // ~25 km/h average
  };
}

/** Get remaining distance from driver to destination in km (haversine). */
export function getRemainingDistanceKm(
  driverPos: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): number {
  return haversineMeters(driverPos.lat, driverPos.lng, destination.lat, destination.lng) / 1000;
}

/** Clear route cache. */
export function clearRouteCache(): void {
  cachedRoute = null;
  lastFetchTime = 0;
}
