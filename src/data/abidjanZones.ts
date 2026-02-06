// Données des Zones et Quartiers d'Abidjan
// Tarification dynamique par zone

export interface Zone {
  id: string;
  name: string;
  commune: string;
  type: 'residential' | 'commercial' | 'industrial' | 'mixed';
  riskLevel: 'low' | 'medium' | 'high';
  priceMultiplier: number; // Multiplicateur de prix (1.0 = normal)
  baseDeliveryFee: number; // Frais de base en FCFA
  peakHoursSurcharge: number; // Supplément heures de pointe (%)
  nightSurcharge: number; // Supplément nuit (%)
  coordinates: {
    lat: number;
    lng: number;
  };
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  popularAreas: string[];
  restrictions?: {
    noDeliveryHours?: string[]; // Ex: ["22:00-06:00"]
    requiresEscort?: boolean;
    maxPackageValue?: number;
  };
}

export interface Commune {
  id: string;
  name: string;
  zones: Zone[];
  averageDeliveryTime: number; // En minutes
  popularity: number; // 1-10
}

// Les 13 communes d'Abidjan avec leurs quartiers
export const ABIDJAN_COMMUNES: Commune[] = [
  {
    id: 'cocody',
    name: 'Cocody',
    averageDeliveryTime: 25,
    popularity: 9,
    zones: [
      {
        id: 'cocody-deux-plateaux',
        name: 'Deux Plateaux',
        commune: 'Cocody',
        type: 'residential',
        riskLevel: 'low',
        priceMultiplier: 1.2,
        baseDeliveryFee: 1500,
        peakHoursSurcharge: 20,
        nightSurcharge: 30,
        coordinates: { lat: 5.3600, lng: -3.9900 },
        popularAreas: ['Vallon', 'ENA', '7ème Tranche', '8ème Tranche'],
      },
      {
        id: 'cocody-riviera',
        name: 'Riviera',
        commune: 'Cocody',
        type: 'residential',
        riskLevel: 'low',
        priceMultiplier: 1.3,
        baseDeliveryFee: 1500,
        peakHoursSurcharge: 20,
        nightSurcharge: 30,
        coordinates: { lat: 5.3550, lng: -3.9700 },
        popularAreas: ['Riviera 2', 'Riviera 3', 'Riviera Palmeraie', 'Riviera Faya', 'Bonoumin'],
      },
      {
        id: 'cocody-angre',
        name: 'Angré',
        commune: 'Cocody',
        type: 'mixed',
        riskLevel: 'low',
        priceMultiplier: 1.1,
        baseDeliveryFee: 1200,
        peakHoursSurcharge: 15,
        nightSurcharge: 25,
        coordinates: { lat: 5.3700, lng: -3.9850 },
        popularAreas: ['Château', 'Djibi', 'Anono'],
      },
      {
        id: 'cocody-blockhauss',
        name: 'Blockhauss',
        commune: 'Cocody',
        type: 'residential',
        riskLevel: 'low',
        priceMultiplier: 1.15,
        baseDeliveryFee: 1300,
        peakHoursSurcharge: 15,
        nightSurcharge: 25,
        coordinates: { lat: 5.3450, lng: -4.0050 },
        popularAreas: ['II Plateaux', 'Attoban'],
      },
    ],
  },
  {
    id: 'plateau',
    name: 'Plateau',
    averageDeliveryTime: 20,
    popularity: 10,
    zones: [
      {
        id: 'plateau-centre',
        name: 'Centre Administratif',
        commune: 'Plateau',
        type: 'commercial',
        riskLevel: 'low',
        priceMultiplier: 1.4,
        baseDeliveryFee: 2000,
        peakHoursSurcharge: 30,
        nightSurcharge: 50,
        coordinates: { lat: 5.3200, lng: -4.0200 },
        popularAreas: ['Rue du Commerce', 'Avenue Franchet d\'Esperey', 'Boulevard de la République'],
        restrictions: {
          noDeliveryHours: ['12:00-14:00'], // Pause déjeuner embouteillages
        },
      },
    ],
  },
  {
    id: 'marcory',
    name: 'Marcory',
    averageDeliveryTime: 22,
    popularity: 8,
    zones: [
      {
        id: 'marcory-zone4',
        name: 'Zone 4',
        commune: 'Marcory',
        type: 'commercial',
        riskLevel: 'low',
        priceMultiplier: 1.25,
        baseDeliveryFee: 1400,
        peakHoursSurcharge: 25,
        nightSurcharge: 35,
        coordinates: { lat: 5.3100, lng: -3.9900 },
        popularAreas: ['Zone 4C', 'Biétry'],
      },
      {
        id: 'marcory-residentiel',
        name: 'Marcory Résidentiel',
        commune: 'Marcory',
        type: 'residential',
        riskLevel: 'low',
        priceMultiplier: 1.1,
        baseDeliveryFee: 1200,
        peakHoursSurcharge: 15,
        nightSurcharge: 25,
        coordinates: { lat: 5.3050, lng: -3.9850 },
        popularAreas: ['Anoumabo', 'Sans Fil'],
      },
    ],
  },
  {
    id: 'treichville',
    name: 'Treichville',
    averageDeliveryTime: 25,
    popularity: 7,
    zones: [
      {
        id: 'treichville-port',
        name: 'Zone Portuaire',
        commune: 'Treichville',
        type: 'industrial',
        riskLevel: 'medium',
        priceMultiplier: 1.3,
        baseDeliveryFee: 1500,
        peakHoursSurcharge: 20,
        nightSurcharge: 40,
        coordinates: { lat: 5.2950, lng: -4.0100 },
        popularAreas: ['Port', 'Gare de Marchandises'],
        restrictions: {
          requiresEscort: true,
        },
      },
      {
        id: 'treichville-centre',
        name: 'Treichville Centre',
        commune: 'Treichville',
        type: 'commercial',
        riskLevel: 'medium',
        priceMultiplier: 1.15,
        baseDeliveryFee: 1200,
        peakHoursSurcharge: 20,
        nightSurcharge: 35,
        coordinates: { lat: 5.3000, lng: -4.0000 },
        popularAreas: ['Marché de Treichville', 'Avenue 21'],
      },
    ],
  },
  {
    id: 'koumassi',
    name: 'Koumassi',
    averageDeliveryTime: 28,
    popularity: 6,
    zones: [
      {
        id: 'koumassi-centre',
        name: 'Koumassi Centre',
        commune: 'Koumassi',
        type: 'mixed',
        riskLevel: 'medium',
        priceMultiplier: 1.0,
        baseDeliveryFee: 1000,
        peakHoursSurcharge: 15,
        nightSurcharge: 30,
        coordinates: { lat: 5.2950, lng: -3.9600 },
        popularAreas: ['Remblais', 'Grand Campement', 'Sicogi'],
      },
    ],
  },
  {
    id: 'portbouet',
    name: 'Port-Bouët',
    averageDeliveryTime: 35,
    popularity: 5,
    zones: [
      {
        id: 'portbouet-aeroport',
        name: 'Zone Aéroport',
        commune: 'Port-Bouët',
        type: 'commercial',
        riskLevel: 'low',
        priceMultiplier: 1.4,
        baseDeliveryFee: 1800,
        peakHoursSurcharge: 25,
        nightSurcharge: 40,
        coordinates: { lat: 5.2600, lng: -3.9300 },
        popularAreas: ['Aéroport FHB', 'Zone Franche'],
      },
      {
        id: 'portbouet-vridi',
        name: 'Vridi',
        commune: 'Port-Bouët',
        type: 'industrial',
        riskLevel: 'high',
        priceMultiplier: 1.2,
        baseDeliveryFee: 1300,
        peakHoursSurcharge: 20,
        nightSurcharge: 50,
        coordinates: { lat: 5.2700, lng: -4.0200 },
        popularAreas: ['Vridi Canal', 'Zone Industrielle'],
        restrictions: {
          noDeliveryHours: ['20:00-06:00'],
          maxPackageValue: 500000,
        },
      },
    ],
  },
  {
    id: 'yopougon',
    name: 'Yopougon',
    averageDeliveryTime: 35,
    popularity: 8,
    zones: [
      {
        id: 'yopougon-maroc',
        name: 'Maroc/Selmer',
        commune: 'Yopougon',
        type: 'residential',
        riskLevel: 'medium',
        priceMultiplier: 1.0,
        baseDeliveryFee: 1000,
        peakHoursSurcharge: 15,
        nightSurcharge: 35,
        coordinates: { lat: 5.3400, lng: -4.0800 },
        popularAreas: ['Maroc', 'Selmer', 'Sicogi'],
      },
      {
        id: 'yopougon-niangon',
        name: 'Niangon',
        commune: 'Yopougon',
        type: 'residential',
        riskLevel: 'medium',
        priceMultiplier: 0.95,
        baseDeliveryFee: 900,
        peakHoursSurcharge: 10,
        nightSurcharge: 30,
        coordinates: { lat: 5.3500, lng: -4.1000 },
        popularAreas: ['Niangon Nord', 'Niangon Sud', 'Lokoa'],
      },
      {
        id: 'yopougon-wassakara',
        name: 'Wassakara',
        commune: 'Yopougon',
        type: 'mixed',
        riskLevel: 'high',
        priceMultiplier: 0.9,
        baseDeliveryFee: 800,
        peakHoursSurcharge: 10,
        nightSurcharge: 40,
        coordinates: { lat: 5.3600, lng: -4.1100 },
        popularAreas: ['Wassakara', 'Yaoséhi'],
        restrictions: {
          noDeliveryHours: ['21:00-06:00'],
        },
      },
      {
        id: 'yopougon-zone-industrielle',
        name: 'Zone Industrielle',
        commune: 'Yopougon',
        type: 'industrial',
        riskLevel: 'low',
        priceMultiplier: 1.2,
        baseDeliveryFee: 1400,
        peakHoursSurcharge: 20,
        nightSurcharge: 30,
        coordinates: { lat: 5.3300, lng: -4.0900 },
        popularAreas: ['Zone Industrielle', 'FILTISAC'],
      },
    ],
  },
  {
    id: 'abobo',
    name: 'Abobo',
    averageDeliveryTime: 40,
    popularity: 7,
    zones: [
      {
        id: 'abobo-gare',
        name: 'Abobo Gare',
        commune: 'Abobo',
        type: 'commercial',
        riskLevel: 'medium',
        priceMultiplier: 0.95,
        baseDeliveryFee: 900,
        peakHoursSurcharge: 15,
        nightSurcharge: 35,
        coordinates: { lat: 5.4200, lng: -4.0200 },
        popularAreas: ['Gare Routière', 'Marché Gouro'],
      },
      {
        id: 'abobo-pk18',
        name: 'PK18',
        commune: 'Abobo',
        type: 'residential',
        riskLevel: 'high',
        priceMultiplier: 0.85,
        baseDeliveryFee: 800,
        peakHoursSurcharge: 10,
        nightSurcharge: 45,
        coordinates: { lat: 5.4400, lng: -4.0300 },
        popularAreas: ['PK18', 'Anonkoua Kouté'],
        restrictions: {
          noDeliveryHours: ['20:00-07:00'],
        },
      },
      {
        id: 'abobo-avocatier',
        name: 'Avocatier',
        commune: 'Abobo',
        type: 'residential',
        riskLevel: 'medium',
        priceMultiplier: 0.9,
        baseDeliveryFee: 850,
        peakHoursSurcharge: 10,
        nightSurcharge: 35,
        coordinates: { lat: 5.4100, lng: -4.0400 },
        popularAreas: ['Avocatier', 'Belleville'],
      },
    ],
  },
  {
    id: 'adjame',
    name: 'Adjamé',
    averageDeliveryTime: 25,
    popularity: 8,
    zones: [
      {
        id: 'adjame-marche',
        name: 'Grand Marché',
        commune: 'Adjamé',
        type: 'commercial',
        riskLevel: 'high',
        priceMultiplier: 1.1,
        baseDeliveryFee: 1100,
        peakHoursSurcharge: 25,
        nightSurcharge: 50,
        coordinates: { lat: 5.3550, lng: -4.0250 },
        popularAreas: ['Forum', 'Roxy', 'Bracodi'],
        restrictions: {
          noDeliveryHours: ['20:00-07:00'],
        },
      },
      {
        id: 'adjame-220-logements',
        name: '220 Logements',
        commune: 'Adjamé',
        type: 'residential',
        riskLevel: 'medium',
        priceMultiplier: 0.95,
        baseDeliveryFee: 900,
        peakHoursSurcharge: 15,
        nightSurcharge: 30,
        coordinates: { lat: 5.3650, lng: -4.0300 },
        popularAreas: ['220 Logements', 'Liberté'],
      },
    ],
  },
  {
    id: 'attecoube',
    name: 'Attécoubé',
    averageDeliveryTime: 30,
    popularity: 5,
    zones: [
      {
        id: 'attecoube-centre',
        name: 'Attécoubé Centre',
        commune: 'Attécoubé',
        type: 'residential',
        riskLevel: 'high',
        priceMultiplier: 0.85,
        baseDeliveryFee: 800,
        peakHoursSurcharge: 10,
        nightSurcharge: 45,
        coordinates: { lat: 5.3350, lng: -4.0450 },
        popularAreas: ['Agban Village', 'Santé'],
        restrictions: {
          noDeliveryHours: ['19:00-07:00'],
          maxPackageValue: 300000,
        },
      },
    ],
  },
  {
    id: 'bingerville',
    name: 'Bingerville',
    averageDeliveryTime: 40,
    popularity: 4,
    zones: [
      {
        id: 'bingerville-centre',
        name: 'Bingerville Centre',
        commune: 'Bingerville',
        type: 'residential',
        riskLevel: 'low',
        priceMultiplier: 1.1,
        baseDeliveryFee: 1200,
        peakHoursSurcharge: 15,
        nightSurcharge: 25,
        coordinates: { lat: 5.3500, lng: -3.8900 },
        popularAreas: ['Centre-ville', 'Cité CNPS'],
      },
    ],
  },
  {
    id: 'songon',
    name: 'Songon',
    averageDeliveryTime: 50,
    popularity: 3,
    zones: [
      {
        id: 'songon-agban',
        name: 'Songon Agban',
        commune: 'Songon',
        type: 'residential',
        riskLevel: 'medium',
        priceMultiplier: 0.9,
        baseDeliveryFee: 1000,
        peakHoursSurcharge: 10,
        nightSurcharge: 40,
        coordinates: { lat: 5.3700, lng: -4.1500 },
        popularAreas: ['Songon Agban', 'Songon Kassemblé'],
        restrictions: {
          noDeliveryHours: ['18:00-07:00'],
        },
      },
    ],
  },
  {
    id: 'anyama',
    name: 'Anyama',
    averageDeliveryTime: 45,
    popularity: 4,
    zones: [
      {
        id: 'anyama-centre',
        name: 'Anyama Centre',
        commune: 'Anyama',
        type: 'mixed',
        riskLevel: 'medium',
        priceMultiplier: 0.9,
        baseDeliveryFee: 950,
        peakHoursSurcharge: 10,
        nightSurcharge: 35,
        coordinates: { lat: 5.4900, lng: -4.0500 },
        popularAreas: ['Gare', 'Marché'],
      },
    ],
  },
];

// Fonction helper pour obtenir toutes les zones
export function getAllZones(): Zone[] {
  return ABIDJAN_COMMUNES.flatMap(commune => commune.zones);
}

// Fonction helper pour trouver une zone par ID
export function getZoneById(zoneId: string): Zone | undefined {
  return getAllZones().find(zone => zone.id === zoneId);
}

// Fonction helper pour trouver une commune par ID
export function getCommuneById(communeId: string): Commune | undefined {
  return ABIDJAN_COMMUNES.find(commune => commune.id === communeId);
}

// Fonction pour trouver la zone la plus proche d'une position GPS
export function findNearestZone(lat: number, lng: number): Zone | null {
  const zones = getAllZones();
  let nearestZone: Zone | null = null;
  let minDistance = Infinity;

  zones.forEach(zone => {
    const distance = calculateDistance(lat, lng, zone.coordinates.lat, zone.coordinates.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestZone = zone;
    }
  });

  return nearestZone;
}

// Calcul de distance Haversine
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
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
