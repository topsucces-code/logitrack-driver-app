// Service de tarification par zone - LogiTrack Africa
import {
  Zone,
  getAllZones,
  getZoneById,
  findNearestZone,
  ABIDJAN_COMMUNES,
} from '../data/abidjanZones';

export interface DeliveryPriceCalculation {
  basePrice: number;
  distancePrice: number;
  zoneMultiplier: number;
  peakHoursSurcharge: number;
  nightSurcharge: number;
  weightSurcharge: number;
  insuranceFee: number;
  totalPrice: number;
  estimatedTime: number; // En minutes
  currency: string;
  breakdown: PriceBreakdownItem[];
}

export interface PriceBreakdownItem {
  label: string;
  amount: number;
  type: 'base' | 'surcharge' | 'discount' | 'fee';
}

export interface DeliveryRequest {
  pickupZoneId?: string;
  deliveryZoneId?: string;
  pickupCoords?: { lat: number; lng: number };
  deliveryCoords?: { lat: number; lng: number };
  weight?: number; // En kg
  packageValue?: number; // Valeur déclarée en FCFA
  isExpress?: boolean;
  scheduledTime?: Date;
  includeInsurance?: boolean;
}

// Tarifs de base
const BASE_RATES = {
  pricePerKm: 150, // FCFA par km
  minPrice: 500, // Prix minimum
  expressMultiplier: 1.5,
  weightTiers: [
    { maxKg: 5, surcharge: 0 },
    { maxKg: 10, surcharge: 200 },
    { maxKg: 20, surcharge: 500 },
    { maxKg: 50, surcharge: 1000 },
    { maxKg: Infinity, surcharge: 2000 },
  ],
  insuranceRate: 0.02, // 2% de la valeur déclarée
  minInsurance: 200,
};

// Heures de pointe à Abidjan
const PEAK_HOURS = {
  morning: { start: 7, end: 9 },
  evening: { start: 17, end: 20 },
};

// Heures de nuit
const NIGHT_HOURS = { start: 21, end: 6 };

/**
 * Calcule le prix d'une livraison
 */
export function calculateDeliveryPrice(request: DeliveryRequest): DeliveryPriceCalculation {
  const breakdown: PriceBreakdownItem[] = [];

  // Trouver les zones
  let pickupZone: Zone | null = null;
  let deliveryZone: Zone | null = null;

  if (request.pickupZoneId) {
    pickupZone = getZoneById(request.pickupZoneId) || null;
  } else if (request.pickupCoords) {
    pickupZone = findNearestZone(request.pickupCoords.lat, request.pickupCoords.lng);
  }

  if (request.deliveryZoneId) {
    deliveryZone = getZoneById(request.deliveryZoneId) || null;
  } else if (request.deliveryCoords) {
    deliveryZone = findNearestZone(request.deliveryCoords.lat, request.deliveryCoords.lng);
  }

  // Prix de base de la zone de livraison
  const baseZoneFee = deliveryZone?.baseDeliveryFee || 1000;
  breakdown.push({ label: 'Frais de zone', amount: baseZoneFee, type: 'base' });

  // Calcul de la distance
  let distanceKm = 5; // Distance par défaut
  if (pickupZone && deliveryZone) {
    distanceKm = calculateDistanceBetweenZones(pickupZone, deliveryZone);
  }

  const distancePrice = Math.round(distanceKm * BASE_RATES.pricePerKm);
  breakdown.push({ label: `Distance (${distanceKm.toFixed(1)} km)`, amount: distancePrice, type: 'base' });

  // Multiplicateur de zone
  const zoneMultiplier = deliveryZone?.priceMultiplier || 1.0;
  const zoneAdjustment = Math.round((baseZoneFee + distancePrice) * (zoneMultiplier - 1));
  if (zoneAdjustment !== 0) {
    breakdown.push({
      label: zoneMultiplier > 1 ? 'Supplément zone premium' : 'Réduction zone',
      amount: zoneAdjustment,
      type: zoneAdjustment > 0 ? 'surcharge' : 'discount',
    });
  }

  // Vérifier les heures de pointe et de nuit
  const deliveryTime = request.scheduledTime || new Date();
  const hour = deliveryTime.getHours();

  let peakHoursSurcharge = 0;
  if (isPeakHour(hour) && deliveryZone) {
    peakHoursSurcharge = Math.round((baseZoneFee + distancePrice) * (deliveryZone.peakHoursSurcharge / 100));
    breakdown.push({ label: 'Supplément heure de pointe', amount: peakHoursSurcharge, type: 'surcharge' });
  }

  let nightSurcharge = 0;
  if (isNightHour(hour) && deliveryZone) {
    nightSurcharge = Math.round((baseZoneFee + distancePrice) * (deliveryZone.nightSurcharge / 100));
    breakdown.push({ label: 'Supplément nuit', amount: nightSurcharge, type: 'surcharge' });
  }

  // Supplément poids
  let weightSurcharge = 0;
  if (request.weight) {
    const tier = BASE_RATES.weightTiers.find(t => request.weight! <= t.maxKg);
    weightSurcharge = tier?.surcharge || 0;
    if (weightSurcharge > 0) {
      breakdown.push({ label: `Poids (${request.weight} kg)`, amount: weightSurcharge, type: 'surcharge' });
    }
  }

  // Express
  let expressMultiplier = 1;
  if (request.isExpress) {
    expressMultiplier = BASE_RATES.expressMultiplier;
    const expressSurcharge = Math.round((baseZoneFee + distancePrice) * (expressMultiplier - 1));
    breakdown.push({ label: 'Livraison express', amount: expressSurcharge, type: 'surcharge' });
  }

  // Assurance
  let insuranceFee = 0;
  if (request.includeInsurance && request.packageValue) {
    insuranceFee = Math.max(
      Math.round(request.packageValue * BASE_RATES.insuranceRate),
      BASE_RATES.minInsurance
    );
    breakdown.push({ label: 'Assurance colis', amount: insuranceFee, type: 'fee' });
  }

  // Calcul du total
  const subtotal = baseZoneFee + distancePrice + zoneAdjustment + peakHoursSurcharge + nightSurcharge + weightSurcharge;
  const totalWithExpress = Math.round(subtotal * expressMultiplier);
  const totalPrice = Math.max(totalWithExpress + insuranceFee, BASE_RATES.minPrice);

  // Estimation du temps
  const baseTime = deliveryZone
    ? ABIDJAN_COMMUNES.find(c => c.zones.some(z => z.id === deliveryZone!.id))?.averageDeliveryTime || 30
    : 30;
  const estimatedTime = Math.round(baseTime + distanceKm * 2); // +2 min par km

  return {
    basePrice: baseZoneFee,
    distancePrice,
    zoneMultiplier,
    peakHoursSurcharge,
    nightSurcharge,
    weightSurcharge,
    insuranceFee,
    totalPrice,
    estimatedTime,
    currency: 'FCFA',
    breakdown,
  };
}

/**
 * Vérifie si la livraison est possible dans une zone à une heure donnée
 */
export function isDeliveryAllowed(zoneId: string, scheduledTime?: Date): {
  allowed: boolean;
  reason?: string;
} {
  const zone = getZoneById(zoneId);
  if (!zone) {
    return { allowed: true }; // Zone inconnue = pas de restriction
  }

  const time = scheduledTime || new Date();
  const hour = time.getHours();
  const timeStr = `${hour.toString().padStart(2, '0')}:00`;

  if (zone.restrictions?.noDeliveryHours) {
    for (const range of zone.restrictions.noDeliveryHours) {
      const [start, end] = range.split('-');
      if (isTimeInRange(timeStr, start, end)) {
        return {
          allowed: false,
          reason: `Livraisons non autorisées dans cette zone entre ${start} et ${end}`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Vérifie si la valeur du colis est autorisée dans une zone
 */
export function isPackageValueAllowed(zoneId: string, value: number): {
  allowed: boolean;
  maxValue?: number;
} {
  const zone = getZoneById(zoneId);
  if (!zone?.restrictions?.maxPackageValue) {
    return { allowed: true };
  }

  return {
    allowed: value <= zone.restrictions.maxPackageValue,
    maxValue: zone.restrictions.maxPackageValue,
  };
}

/**
 * Obtient les zones triées par popularité
 */
export function getPopularZones(limit = 10): Zone[] {
  const communes = [...ABIDJAN_COMMUNES].sort((a, b) => b.popularity - a.popularity);
  const zones: Zone[] = [];

  for (const commune of communes) {
    for (const zone of commune.zones) {
      if (zones.length < limit) {
        zones.push(zone);
      }
    }
  }

  return zones;
}

/**
 * Recherche de zones par nom
 */
export function searchZones(query: string): Zone[] {
  const lowerQuery = query.toLowerCase();
  return getAllZones().filter(
    zone =>
      zone.name.toLowerCase().includes(lowerQuery) ||
      zone.commune.toLowerCase().includes(lowerQuery) ||
      zone.popularAreas.some(area => area.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Obtient les statistiques d'une zone
 */
export function getZoneStats(zoneId: string): {
  zone: Zone | null;
  riskLabel: string;
  riskColor: string;
  priceCategory: string;
  restrictions: string[];
} {
  const zone = getZoneById(zoneId);
  if (!zone) {
    return {
      zone: null,
      riskLabel: 'Inconnu',
      riskColor: 'gray',
      priceCategory: 'Standard',
      restrictions: [],
    };
  }

  const riskLabels = {
    low: 'Faible',
    medium: 'Modéré',
    high: 'Élevé',
  };

  const riskColors = {
    low: 'green',
    medium: 'yellow',
    high: 'red',
  };

  let priceCategory = 'Standard';
  if (zone.priceMultiplier >= 1.3) priceCategory = 'Premium';
  else if (zone.priceMultiplier >= 1.1) priceCategory = 'Supérieur';
  else if (zone.priceMultiplier < 1) priceCategory = 'Économique';

  const restrictions: string[] = [];
  if (zone.restrictions?.noDeliveryHours) {
    restrictions.push(`Pas de livraison: ${zone.restrictions.noDeliveryHours.join(', ')}`);
  }
  if (zone.restrictions?.requiresEscort) {
    restrictions.push('Escorte requise');
  }
  if (zone.restrictions?.maxPackageValue) {
    restrictions.push(`Valeur max: ${formatCurrency(zone.restrictions.maxPackageValue)}`);
  }

  return {
    zone,
    riskLabel: riskLabels[zone.riskLevel],
    riskColor: riskColors[zone.riskLevel],
    priceCategory,
    restrictions,
  };
}

// Helpers
function calculateDistanceBetweenZones(zone1: Zone, zone2: Zone): number {
  const R = 6371;
  const dLat = toRad(zone2.coordinates.lat - zone1.coordinates.lat);
  const dLng = toRad(zone2.coordinates.lng - zone1.coordinates.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(zone1.coordinates.lat)) *
      Math.cos(toRad(zone2.coordinates.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function isPeakHour(hour: number): boolean {
  return (
    (hour >= PEAK_HOURS.morning.start && hour < PEAK_HOURS.morning.end) ||
    (hour >= PEAK_HOURS.evening.start && hour < PEAK_HOURS.evening.end)
  );
}

function isNightHour(hour: number): boolean {
  return hour >= NIGHT_HOURS.start || hour < NIGHT_HOURS.end;
}

function isTimeInRange(time: string, start: string, end: string): boolean {
  if (start <= end) {
    return time >= start && time < end;
  } else {
    // Range spans midnight
    return time >= start || time < end;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-CI', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}
