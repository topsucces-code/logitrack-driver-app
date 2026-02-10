/**
 * Google Directions Service — replaces osrmRouteService.
 * Uses the Google Maps JS DirectionsService (loaded via @react-google-maps/api).
 */

// In-memory cache
let cachedResult: google.maps.DirectionsResult | null = null;
let cachedOrigin: { lat: number; lng: number } | null = null;
let lastFetchTime = 0;

const DEVIATION_THRESHOLD_M = 150;
const REFETCH_COOLDOWN_MS = 30_000;

/** Haversine distance in meters */
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
 * Fetch driving directions via google.maps.DirectionsService.
 * Must be called AFTER the Google Maps JS API is loaded.
 */
export async function fetchDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<google.maps.DirectionsResult> {
  const service = new google.maps.DirectionsService();

  const result = await service.route({
    origin,
    destination,
    travelMode: google.maps.TravelMode.DRIVING,
  });

  cachedResult = result;
  cachedOrigin = origin;
  lastFetchTime = Date.now();

  return result;
}

/** Get remaining distance from driver to destination in km (haversine). */
export function getRemainingDistanceKm(
  driverPos: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): number {
  return haversineMeters(driverPos.lat, driverPos.lng, destination.lat, destination.lng) / 1000;
}

/**
 * Whether the driver has deviated from the cached route.
 * Checks proximity against overview path points.
 */
function isDriverDeviating(driverPos: { lat: number; lng: number }): boolean {
  if (!cachedResult?.routes?.[0]) return false;

  const path = cachedResult.routes[0].overview_path;
  if (!path?.length) return false;

  let minDist = Infinity;
  for (let i = 0; i < path.length; i += 5) {
    const pt = path[i];
    const dist = haversineMeters(driverPos.lat, driverPos.lng, pt.lat(), pt.lng());
    if (dist < DEVIATION_THRESHOLD_M) return false;
    if (dist < minDist) minDist = dist;
  }

  // Also check last point
  const last = path[path.length - 1];
  const distLast = haversineMeters(driverPos.lat, driverPos.lng, last.lat(), last.lng());
  if (distLast < DEVIATION_THRESHOLD_M) return false;

  return minDist >= DEVIATION_THRESHOLD_M;
}

/** Whether a route refetch should be triggered (deviation + cooldown elapsed). */
export function shouldRefetchRoute(driverPos: { lat: number; lng: number }): boolean {
  if (!cachedResult) return true;
  const elapsed = Date.now() - lastFetchTime;
  return isDriverDeviating(driverPos) && elapsed > REFETCH_COOLDOWN_MS;
}

/** Clear route cache. */
export function clearRouteCache(): void {
  cachedResult = null;
  cachedOrigin = null;
  lastFetchTime = 0;
}
