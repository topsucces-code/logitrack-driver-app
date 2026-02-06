/**
 * Route Optimization Service
 * Optimizes delivery routes using nearest-neighbor algorithm
 * and distance matrix calculations
 */

import { supabase } from '../lib/supabase';

export interface DeliveryStop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  priority?: 'high' | 'normal' | 'low';
  timeWindow?: {
    start: string; // HH:mm format
    end: string;
  };
  estimatedDuration?: number; // minutes at stop
  type: 'pickup' | 'delivery';
}

export interface OptimizedRoute {
  stops: DeliveryStop[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  savings: {
    distance: number; // km saved
    time: number; // minutes saved
    percentage: number;
  };
  segments: RouteSegment[];
}

export interface RouteSegment {
  from: DeliveryStop;
  to: DeliveryStop;
  distance: number;
  duration: number;
}

// Haversine formula to calculate distance between two points
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Build distance matrix between all stops
function buildDistanceMatrix(stops: DeliveryStop[]): number[][] {
  const n = stops.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        matrix[i][j] = haversineDistance(
          stops[i].lat,
          stops[i].lng,
          stops[j].lat,
          stops[j].lng
        );
      }
    }
  }

  return matrix;
}

// Calculate total route distance
function calculateTotalDistance(
  stops: DeliveryStop[],
  distanceMatrix: number[][]
): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const fromIndex = stops.findIndex((s) => s.id === stops[i].id);
    const toIndex = stops.findIndex((s) => s.id === stops[i + 1].id);
    total += distanceMatrix[fromIndex][toIndex];
  }
  return total;
}

// Estimate duration based on distance (average speed 30 km/h in urban areas)
function estimateDuration(distanceKm: number): number {
  const avgSpeedKmh = 30;
  return (distanceKm / avgSpeedKmh) * 60; // minutes
}

// Nearest neighbor algorithm for route optimization
function nearestNeighborOptimization(
  stops: DeliveryStop[],
  startIndex: number = 0
): DeliveryStop[] {
  if (stops.length <= 2) return stops;

  const n = stops.length;
  const distanceMatrix = buildDistanceMatrix(stops);
  const visited: boolean[] = new Array(n).fill(false);
  const route: DeliveryStop[] = [];

  // Start from the first stop (usually current location or first pickup)
  let currentIndex = startIndex;
  visited[currentIndex] = true;
  route.push(stops[currentIndex]);

  // Prioritize high priority stops
  const highPriorityIndices = stops
    .map((s, i) => (s.priority === 'high' ? i : -1))
    .filter((i) => i !== -1 && i !== startIndex);

  // Visit high priority stops first
  for (const hpIndex of highPriorityIndices) {
    if (!visited[hpIndex]) {
      visited[hpIndex] = true;
      route.push(stops[hpIndex]);
      currentIndex = hpIndex;
    }
  }

  // Then visit remaining stops using nearest neighbor
  for (let i = route.length; i < n; i++) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;

    for (let j = 0; j < n; j++) {
      if (!visited[j] && distanceMatrix[currentIndex][j] < nearestDistance) {
        nearestDistance = distanceMatrix[currentIndex][j];
        nearestIndex = j;
      }
    }

    if (nearestIndex !== -1) {
      visited[nearestIndex] = true;
      route.push(stops[nearestIndex]);
      currentIndex = nearestIndex;
    }
  }

  return route;
}

// 2-opt improvement for local optimization
function twoOptImprovement(
  stops: DeliveryStop[],
  distanceMatrix: number[][]
): DeliveryStop[] {
  if (stops.length <= 3) return stops;

  let improved = true;
  let route = [...stops];

  while (improved) {
    improved = false;

    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        // Check if swapping would improve the route
        const oldDistance =
          distanceMatrix[stops.findIndex((s) => s.id === route[i - 1].id)][
            stops.findIndex((s) => s.id === route[i].id)
          ] +
          distanceMatrix[stops.findIndex((s) => s.id === route[j].id)][
            stops.findIndex((s) => s.id === route[j + 1].id)
          ];

        const newDistance =
          distanceMatrix[stops.findIndex((s) => s.id === route[i - 1].id)][
            stops.findIndex((s) => s.id === route[j].id)
          ] +
          distanceMatrix[stops.findIndex((s) => s.id === route[i].id)][
            stops.findIndex((s) => s.id === route[j + 1].id)
          ];

        if (newDistance < oldDistance) {
          // Reverse the segment between i and j
          const newRoute = [
            ...route.slice(0, i),
            ...route.slice(i, j + 1).reverse(),
            ...route.slice(j + 1),
          ];
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

// Main optimization function
export function optimizeRoute(
  stops: DeliveryStop[],
  currentLocation?: { lat: number; lng: number }
): OptimizedRoute {
  if (stops.length === 0) {
    return {
      stops: [],
      totalDistance: 0,
      totalDuration: 0,
      savings: { distance: 0, time: 0, percentage: 0 },
      segments: [],
    };
  }

  // Add current location as first stop if provided
  let allStops = [...stops];
  if (currentLocation) {
    const startStop: DeliveryStop = {
      id: 'current-location',
      name: 'Position actuelle',
      address: 'Ma position',
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      type: 'pickup',
    };
    allStops = [startStop, ...stops];
  }

  // Build distance matrix
  const distanceMatrix = buildDistanceMatrix(allStops);

  // Calculate original route distance
  const originalDistance = calculateTotalDistance(allStops, distanceMatrix);

  // Apply nearest neighbor algorithm
  let optimizedStops = nearestNeighborOptimization(allStops, 0);

  // Apply 2-opt improvement
  optimizedStops = twoOptImprovement(optimizedStops, distanceMatrix);

  // Remove current location from result if it was added
  if (currentLocation) {
    optimizedStops = optimizedStops.filter((s) => s.id !== 'current-location');
  }

  // Calculate optimized route metrics
  const optimizedAllStops = currentLocation
    ? [
        {
          id: 'current-location',
          name: 'Position actuelle',
          address: 'Ma position',
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          type: 'pickup' as const,
        },
        ...optimizedStops,
      ]
    : optimizedStops;

  const optimizedDistanceMatrix = buildDistanceMatrix(optimizedAllStops);
  const optimizedDistance = calculateTotalDistance(
    optimizedAllStops,
    optimizedDistanceMatrix
  );

  // Build segments
  const segments: RouteSegment[] = [];
  for (let i = 0; i < optimizedAllStops.length - 1; i++) {
    const fromStop = optimizedAllStops[i];
    const toStop = optimizedAllStops[i + 1];
    const distance = haversineDistance(
      fromStop.lat,
      fromStop.lng,
      toStop.lat,
      toStop.lng
    );
    segments.push({
      from: fromStop,
      to: toStop,
      distance: Math.round(distance * 10) / 10,
      duration: Math.round(estimateDuration(distance)),
    });
  }

  // Calculate totals
  const totalDistance = Math.round(optimizedDistance * 10) / 10;
  const totalDuration =
    Math.round(estimateDuration(optimizedDistance)) +
    optimizedStops.reduce((sum, s) => sum + (s.estimatedDuration || 5), 0);

  // Calculate savings
  const distanceSaved = Math.round((originalDistance - optimizedDistance) * 10) / 10;
  const timeSaved = Math.round(estimateDuration(distanceSaved));
  const percentage =
    originalDistance > 0
      ? Math.round((distanceSaved / originalDistance) * 100)
      : 0;

  return {
    stops: optimizedStops,
    totalDistance,
    totalDuration,
    savings: {
      distance: Math.max(0, distanceSaved),
      time: Math.max(0, timeSaved),
      percentage: Math.max(0, percentage),
    },
    segments,
  };
}

// Get pending deliveries for the driver from Supabase
export async function getPendingDeliveries(
  driverId: string
): Promise<DeliveryStop[]> {
  const { data, error } = await supabase
    .from('logitrack_deliveries')
    .select('id, delivery_contact_name, delivery_address, delivery_latitude, delivery_longitude, is_express, is_fragile, route_position, created_at')
    .eq('driver_id', driverId)
    .in('status', ['accepted', 'picked_up'])
    .not('delivery_latitude', 'is', null)
    .not('delivery_longitude', 'is', null)
    .order('route_position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    name: row.delivery_contact_name || 'Livraison',
    address: row.delivery_address || '',
    lat: parseFloat(row.delivery_latitude),
    lng: parseFloat(row.delivery_longitude),
    type: 'delivery' as const,
    priority: row.is_express ? 'high' as const : 'normal' as const,
    estimatedDuration: 5,
  }));
}

// Format duration for display
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}min`;
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
