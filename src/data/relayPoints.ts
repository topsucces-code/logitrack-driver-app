// Points Relais - LogiTrack Africa
// Partenaires locaux pour le retrait des colis

export type RelayPointType = 'shop' | 'kiosk' | 'supermarket' | 'pharmacy' | 'gas_station' | 'locker';

export interface RelayPoint {
  id: string;
  name: string;
  type: RelayPointType;
  address: string;
  commune: string;
  zone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  openingHours: {
    weekdays: string; // Ex: "08:00-20:00"
    saturday: string;
    sunday: string;
  };
  isOpen24h: boolean;
  hasLocker: boolean; // Casier automatique
  maxPackageSize: 'small' | 'medium' | 'large' | 'xlarge';
  maxPackageWeight: number; // En kg
  rating: number; // 1-5
  totalReviews: number;
  discount: number; // % de réduction sur la livraison
  features: string[];
  isActive: boolean;
  partnerSince: string;
}

export interface RelayPointCategory {
  type: RelayPointType;
  label: string;
  icon: string;
  description: string;
}

export const RELAY_POINT_CATEGORIES: RelayPointCategory[] = [
  { type: 'shop', label: 'Boutique', icon: '🏪', description: 'Commerce de proximité' },
  { type: 'kiosk', label: 'Kiosque', icon: '📰', description: 'Kiosque à journaux' },
  { type: 'supermarket', label: 'Supermarché', icon: '🛒', description: 'Grande surface' },
  { type: 'pharmacy', label: 'Pharmacie', icon: '💊', description: 'Pharmacie partenaire' },
  { type: 'gas_station', label: 'Station', icon: '⛽', description: 'Station service' },
  { type: 'locker', label: 'Consigne', icon: '📦', description: 'Casier automatique 24h' },
];

export const RELAY_POINTS: RelayPoint[] = [
  // COCODY
  {
    id: 'rp-cocody-001',
    name: 'Boutique Koffi & Co',
    type: 'shop',
    address: 'Rue des Jardins, Deux Plateaux',
    commune: 'Cocody',
    zone: 'cocody-deux-plateaux',
    coordinates: { lat: 5.3620, lng: -3.9920 },
    phone: '+225 07 00 00 01',
    openingHours: {
      weekdays: '07:00-21:00',
      saturday: '08:00-20:00',
      sunday: '09:00-14:00',
    },
    isOpen24h: false,
    hasLocker: false,
    maxPackageSize: 'medium',
    maxPackageWeight: 15,
    rating: 4.7,
    totalReviews: 156,
    discount: 20,
    features: ['Climatisé', 'Paiement Mobile Money', 'Parking'],
    isActive: true,
    partnerSince: '2024-01',
  },
  {
    id: 'rp-cocody-002',
    name: 'Carrefour Market Riviera',
    type: 'supermarket',
    address: 'Riviera 2, Carrefour Palmeraie',
    commune: 'Cocody',
    zone: 'cocody-riviera',
    coordinates: { lat: 5.3560, lng: -3.9680 },
    phone: '+225 07 00 00 02',
    openingHours: {
      weekdays: '08:00-22:00',
      saturday: '08:00-22:00',
      sunday: '09:00-20:00',
    },
    isOpen24h: false,
    hasLocker: true,
    maxPackageSize: 'xlarge',
    maxPackageWeight: 50,
    rating: 4.8,
    totalReviews: 423,
    discount: 25,
    features: ['Casiers automatiques', 'Parking gratuit', 'Retrait express'],
    isActive: true,
    partnerSince: '2023-06',
  },
  {
    id: 'rp-cocody-003',
    name: 'Pharmacie des Deux Plateaux',
    type: 'pharmacy',
    address: 'Boulevard des Martyrs',
    commune: 'Cocody',
    zone: 'cocody-deux-plateaux',
    coordinates: { lat: 5.3590, lng: -3.9880 },
    phone: '+225 07 00 00 03',
    openingHours: {
      weekdays: '07:30-22:00',
      saturday: '08:00-21:00',
      sunday: '09:00-13:00',
    },
    isOpen24h: false,
    hasLocker: false,
    maxPackageSize: 'small',
    maxPackageWeight: 5,
    rating: 4.9,
    totalReviews: 89,
    discount: 15,
    features: ['Réfrigéré disponible', 'Produits fragiles acceptés'],
    isActive: true,
    partnerSince: '2024-03',
  },
  {
    id: 'rp-cocody-004',
    name: 'Consigne LogiTrack Angré',
    type: 'locker',
    address: 'Carrefour Château, Angré',
    commune: 'Cocody',
    zone: 'cocody-angre',
    coordinates: { lat: 5.3710, lng: -3.9840 },
    phone: '+225 07 00 00 04',
    openingHours: {
      weekdays: '00:00-23:59',
      saturday: '00:00-23:59',
      sunday: '00:00-23:59',
    },
    isOpen24h: true,
    hasLocker: true,
    maxPackageSize: 'large',
    maxPackageWeight: 30,
    rating: 4.6,
    totalReviews: 67,
    discount: 30,
    features: ['24h/24', 'Code SMS', 'Vidéosurveillance'],
    isActive: true,
    partnerSince: '2024-06',
  },

  // PLATEAU
  {
    id: 'rp-plateau-001',
    name: 'Espace Business Center',
    type: 'shop',
    address: 'Avenue Franchet d\'Esperey',
    commune: 'Plateau',
    zone: 'plateau-centre',
    coordinates: { lat: 5.3210, lng: -4.0180 },
    phone: '+225 07 00 00 05',
    openingHours: {
      weekdays: '08:00-18:00',
      saturday: '09:00-13:00',
      sunday: 'Fermé',
    },
    isOpen24h: false,
    hasLocker: true,
    maxPackageSize: 'medium',
    maxPackageWeight: 20,
    rating: 4.5,
    totalReviews: 234,
    discount: 20,
    features: ['Zone bureau', 'Casiers sécurisés', 'WiFi gratuit'],
    isActive: true,
    partnerSince: '2023-09',
  },

  // MARCORY
  {
    id: 'rp-marcory-001',
    name: 'Total Zone 4',
    type: 'gas_station',
    address: 'Boulevard VGE, Zone 4',
    commune: 'Marcory',
    zone: 'marcory-zone4',
    coordinates: { lat: 5.3080, lng: -3.9920 },
    phone: '+225 07 00 00 06',
    openingHours: {
      weekdays: '06:00-23:00',
      saturday: '06:00-23:00',
      sunday: '07:00-22:00',
    },
    isOpen24h: false,
    hasLocker: true,
    maxPackageSize: 'large',
    maxPackageWeight: 25,
    rating: 4.4,
    totalReviews: 178,
    discount: 20,
    features: ['Parking gratuit', 'Boutique 24h', 'Casiers'],
    isActive: true,
    partnerSince: '2024-02',
  },
  {
    id: 'rp-marcory-002',
    name: 'Kiosque Mamie Rose',
    type: 'kiosk',
    address: 'Marché de Marcory',
    commune: 'Marcory',
    zone: 'marcory-residentiel',
    coordinates: { lat: 5.3040, lng: -3.9870 },
    phone: '+225 07 00 00 07',
    openingHours: {
      weekdays: '06:00-20:00',
      saturday: '06:00-18:00',
      sunday: '07:00-14:00',
    },
    isOpen24h: false,
    hasLocker: false,
    maxPackageSize: 'small',
    maxPackageWeight: 10,
    rating: 4.8,
    totalReviews: 312,
    discount: 25,
    features: ['Très connu localement', 'Paiement cash accepté'],
    isActive: true,
    partnerSince: '2023-04',
  },

  // YOPOUGON
  {
    id: 'rp-yopougon-001',
    name: 'Prosuma Yopougon',
    type: 'supermarket',
    address: 'Carrefour Selmer',
    commune: 'Yopougon',
    zone: 'yopougon-maroc',
    coordinates: { lat: 5.3420, lng: -4.0780 },
    phone: '+225 07 00 00 08',
    openingHours: {
      weekdays: '08:00-21:00',
      saturday: '08:00-21:00',
      sunday: '09:00-14:00',
    },
    isOpen24h: false,
    hasLocker: true,
    maxPackageSize: 'xlarge',
    maxPackageWeight: 50,
    rating: 4.3,
    totalReviews: 567,
    discount: 30,
    features: ['Grand espace', 'Casiers XL disponibles', 'Parking'],
    isActive: true,
    partnerSince: '2023-01',
  },
  {
    id: 'rp-yopougon-002',
    name: 'Boutique Tanti Aïcha',
    type: 'shop',
    address: 'Niangon Sud',
    commune: 'Yopougon',
    zone: 'yopougon-niangon',
    coordinates: { lat: 5.3480, lng: -4.1020 },
    phone: '+225 07 00 00 09',
    openingHours: {
      weekdays: '07:00-22:00',
      saturday: '07:00-22:00',
      sunday: '08:00-18:00',
    },
    isOpen24h: false,
    hasLocker: false,
    maxPackageSize: 'medium',
    maxPackageWeight: 15,
    rating: 4.9,
    totalReviews: 234,
    discount: 25,
    features: ['Très accueillante', 'Ouvert tard', 'Connu dans le quartier'],
    isActive: true,
    partnerSince: '2024-01',
  },

  // ABOBO
  {
    id: 'rp-abobo-001',
    name: 'Espace Colis Abobo Gare',
    type: 'shop',
    address: 'Près de la Gare Routière',
    commune: 'Abobo',
    zone: 'abobo-gare',
    coordinates: { lat: 5.4180, lng: -4.0220 },
    phone: '+225 07 00 00 10',
    openingHours: {
      weekdays: '06:00-20:00',
      saturday: '06:00-20:00',
      sunday: '08:00-14:00',
    },
    isOpen24h: false,
    hasLocker: false,
    maxPackageSize: 'large',
    maxPackageWeight: 30,
    rating: 4.2,
    totalReviews: 189,
    discount: 35,
    features: ['Près des transports', 'Tarifs populaires'],
    isActive: true,
    partnerSince: '2023-08',
  },

  // TREICHVILLE
  {
    id: 'rp-treich-001',
    name: 'Galeries de Treichville',
    type: 'shop',
    address: 'Avenue 21, près du Port',
    commune: 'Treichville',
    zone: 'treichville-centre',
    coordinates: { lat: 5.2990, lng: -4.0020 },
    phone: '+225 07 00 00 11',
    openingHours: {
      weekdays: '08:00-19:00',
      saturday: '08:00-17:00',
      sunday: 'Fermé',
    },
    isOpen24h: false,
    hasLocker: false,
    maxPackageSize: 'xlarge',
    maxPackageWeight: 100,
    rating: 4.1,
    totalReviews: 156,
    discount: 20,
    features: ['Gros colis acceptés', 'Zone commerciale'],
    isActive: true,
    partnerSince: '2023-11',
  },

  // PORT-BOUËT
  {
    id: 'rp-portbouet-001',
    name: 'Shell Aéroport',
    type: 'gas_station',
    address: 'Boulevard de l\'Aéroport',
    commune: 'Port-Bouët',
    zone: 'portbouet-aeroport',
    coordinates: { lat: 5.2580, lng: -3.9320 },
    phone: '+225 07 00 00 12',
    openingHours: {
      weekdays: '00:00-23:59',
      saturday: '00:00-23:59',
      sunday: '00:00-23:59',
    },
    isOpen24h: true,
    hasLocker: true,
    maxPackageSize: 'large',
    maxPackageWeight: 30,
    rating: 4.6,
    totalReviews: 289,
    discount: 15,
    features: ['24h/24', 'Près aéroport', 'Casiers automatiques'],
    isActive: true,
    partnerSince: '2023-05',
  },
];

// Fonctions helper

export function getRelayPointsByZone(zoneId: string): RelayPoint[] {
  return RELAY_POINTS.filter(rp => rp.zone === zoneId && rp.isActive);
}

export function getRelayPointsByCommune(commune: string): RelayPoint[] {
  return RELAY_POINTS.filter(rp => rp.commune.toLowerCase() === commune.toLowerCase() && rp.isActive);
}

export function getRelayPointsByType(type: RelayPointType): RelayPoint[] {
  return RELAY_POINTS.filter(rp => rp.type === type && rp.isActive);
}

export function getRelayPointById(id: string): RelayPoint | undefined {
  return RELAY_POINTS.find(rp => rp.id === id);
}

export function getNearestRelayPoints(lat: number, lng: number, limit = 5): RelayPoint[] {
  return RELAY_POINTS
    .filter(rp => rp.isActive)
    .map(rp => ({
      ...rp,
      distance: calculateDistance(lat, lng, rp.coordinates.lat, rp.coordinates.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function get24hRelayPoints(): RelayPoint[] {
  return RELAY_POINTS.filter(rp => rp.isOpen24h && rp.isActive);
}

export function getRelayPointsWithLockers(): RelayPoint[] {
  return RELAY_POINTS.filter(rp => rp.hasLocker && rp.isActive);
}

export function searchRelayPoints(query: string): RelayPoint[] {
  const lowerQuery = query.toLowerCase();
  return RELAY_POINTS.filter(
    rp =>
      rp.isActive &&
      (rp.name.toLowerCase().includes(lowerQuery) ||
        rp.address.toLowerCase().includes(lowerQuery) ||
        rp.commune.toLowerCase().includes(lowerQuery))
  );
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function isRelayPointOpen(relayPoint: RelayPoint, date = new Date()): boolean {
  if (relayPoint.isOpen24h) return true;

  const day = date.getDay();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTime = hours * 60 + minutes;

  let schedule: string;
  if (day === 0) {
    schedule = relayPoint.openingHours.sunday;
  } else if (day === 6) {
    schedule = relayPoint.openingHours.saturday;
  } else {
    schedule = relayPoint.openingHours.weekdays;
  }

  if (schedule === 'Fermé') return false;

  const [openStr, closeStr] = schedule.split('-');
  const [openH, openM] = openStr.split(':').map(Number);
  const [closeH, closeM] = closeStr.split(':').map(Number);

  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  return currentTime >= openTime && currentTime < closeTime;
}
