import L from 'leaflet';

// Fix Leaflet marker icons - use local files for offline support
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/markers/marker-icon-2x.png',
  iconUrl: '/markers/marker-icon.png',
  shadowUrl: '/markers/marker-shadow.png',
});

export const pickupIcon = new L.Icon({
  iconUrl: '/markers/marker-icon-2x-green.png',
  shadowUrl: '/markers/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const deliveryIcon = new L.Icon({
  iconUrl: '/markers/marker-icon-2x-red.png',
  shadowUrl: '/markers/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const driverIcon = new L.Icon({
  iconUrl: '/markers/marker-icon-2x-blue.png',
  shadowUrl: '/markers/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
