import { Capacitor } from '@capacitor/core';

export interface NavigationDestination {
  latitude: number;
  longitude: number;
  label?: string;
}

export type NavigationApp = 'google_maps' | 'waze' | 'apple_maps' | 'default';

// Check if app is available (only works on native)
function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Get platform
function getPlatform(): 'ios' | 'android' | 'web' {
  if (Capacitor.getPlatform() === 'ios') return 'ios';
  if (Capacitor.getPlatform() === 'android') return 'android';
  return 'web';
}

// Open Google Maps
export function openGoogleMaps(destination: NavigationDestination): void {
  const { latitude, longitude, label } = destination;
  const platform = getPlatform();

  let url: string;

  if (platform === 'ios') {
    // iOS: Use comgooglemaps URL scheme, fallback to web
    url = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;

    // Try to open app, fallback to web
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.click();

    // Fallback after short delay
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 500);
  } else if (platform === 'android') {
    // Android: Use geo intent
    url = `google.navigation:q=${latitude},${longitude}`;
    window.location.href = url;
  } else {
    // Web: Open in new tab (use link click to avoid popup blocker)
    url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Open Waze
export function openWaze(destination: NavigationDestination): void {
  const { latitude, longitude } = destination;
  const platform = getPlatform();

  let url: string;

  if (platform === 'ios' || platform === 'android') {
    // Native: Use Waze deep link
    url = `waze://?ll=${latitude},${longitude}&navigate=yes`;

    // Try to open app
    window.location.href = url;

    // Fallback to web after delay
    setTimeout(() => {
      window.open(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`, '_blank');
    }, 500);
  } else {
    // Web: use link click to avoid popup blocker
    url = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Open Apple Maps (iOS only)
export function openAppleMaps(destination: NavigationDestination): void {
  const { latitude, longitude, label } = destination;

  let url = `maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;

  if (label) {
    url += `&dname=${encodeURIComponent(label)}`;
  }

  window.location.href = url;
}

// Open default maps app based on platform
export function openDefaultMaps(destination: NavigationDestination): void {
  const platform = getPlatform();

  if (platform === 'ios') {
    openAppleMaps(destination);
  } else {
    openGoogleMaps(destination);
  }
}

// Navigate to destination with app selection
export function navigateTo(
  destination: NavigationDestination,
  app: NavigationApp = 'default'
): void {
  switch (app) {
    case 'google_maps':
      openGoogleMaps(destination);
      break;
    case 'waze':
      openWaze(destination);
      break;
    case 'apple_maps':
      openAppleMaps(destination);
      break;
    case 'default':
    default:
      openDefaultMaps(destination);
      break;
  }
}

// Get available navigation apps
export function getAvailableNavigationApps(): { id: NavigationApp; name: string; icon: string }[] {
  const platform = getPlatform();

  const apps: { id: NavigationApp; name: string; icon: string }[] = [
    { id: 'google_maps', name: 'Google Maps', icon: '🗺️' },
    { id: 'waze', name: 'Waze', icon: '🚗' },
  ];

  if (platform === 'ios') {
    apps.push({ id: 'apple_maps', name: 'Apple Plans', icon: '🍎' });
  }

  return apps;
}

// Calculate distance between two points (Haversine formula)
export function calculateDistance(
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
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Estimate travel time (rough estimate based on distance and average speed)
export function estimateTravelTime(distanceKm: number, vehicleType: string = 'moto'): number {
  // Average speeds in km/h (accounting for traffic in African cities)
  const speeds: Record<string, number> = {
    moto: 25,
    tricycle: 20,
    voiture: 20,
    velo: 12,
  };

  const speed = speeds[vehicleType] || 20;
  return Math.ceil((distanceKm / speed) * 60); // Return minutes
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

// Format time for display
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}
