import { describe, it, expect, vi } from 'vitest';
import {
  calculateDeliveryPrice,
  isDeliveryAllowed,
  isPackageValueAllowed,
  searchZones,
  getZoneStats,
  getPopularZones,
} from '../zonePricingService';

// ---- calculateDeliveryPrice ----
describe('calculateDeliveryPrice', () => {
  it('retourne un prix avec les champs attendus', () => {
    const result = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'cocody-riviera',
    });
    expect(result).toHaveProperty('totalPrice');
    expect(result).toHaveProperty('basePrice');
    expect(result).toHaveProperty('distancePrice');
    expect(result).toHaveProperty('currency', 'FCFA');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('estimatedTime');
    expect(result.totalPrice).toBeGreaterThan(0);
  });

  it('applique le prix minimum (500 FCFA)', () => {
    // Même zone, distance quasi-nulle, mais minimum s'applique
    const result = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'cocody-deux-plateaux',
    });
    expect(result.totalPrice).toBeGreaterThanOrEqual(500);
  });

  it('applique le supplément express (x1.5)', () => {
    const normal = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'marcory-zone4',
    });
    const express = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'marcory-zone4',
      isExpress: true,
    });
    expect(express.totalPrice).toBeGreaterThan(normal.totalPrice);
  });

  it('applique le supplément poids pour > 5 kg', () => {
    const light = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'marcory-zone4',
      weight: 3,
    });
    const heavy = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'marcory-zone4',
      weight: 15,
    });
    expect(heavy.totalPrice).toBeGreaterThan(light.totalPrice);
    expect(heavy.weightSurcharge).toBe(500); // tier 10-20 kg
  });

  it('calcule l\'assurance (2% de la valeur, min 200 FCFA)', () => {
    const result = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'marcory-zone4',
      includeInsurance: true,
      packageValue: 50000,
    });
    expect(result.insuranceFee).toBe(1000); // 2% * 50000
  });

  it('applique l\'assurance minimum (200 FCFA)', () => {
    const result = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'marcory-zone4',
      includeInsurance: true,
      packageValue: 5000,
    });
    // 2% * 5000 = 100, mais min 200
    expect(result.insuranceFee).toBe(200);
  });

  it('applique le supplément heures de pointe', () => {
    // 8h = heure de pointe (7-9)
    const peakTime = new Date();
    peakTime.setHours(8, 0, 0, 0);

    const result = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'cocody-riviera',
      scheduledTime: peakTime,
    });
    expect(result.peakHoursSurcharge).toBeGreaterThan(0);
  });

  it('applique le supplément nuit', () => {
    // 22h = nuit (21-6)
    const nightTime = new Date();
    nightTime.setHours(22, 0, 0, 0);

    const result = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'cocody-riviera',
      scheduledTime: nightTime,
    });
    expect(result.nightSurcharge).toBeGreaterThan(0);
  });

  it('pas de supplément horaire en dehors des heures de pointe/nuit', () => {
    // 14h = normal
    const normalTime = new Date();
    normalTime.setHours(14, 0, 0, 0);

    const result = calculateDeliveryPrice({
      pickupZoneId: 'cocody-deux-plateaux',
      deliveryZoneId: 'cocody-riviera',
      scheduledTime: normalTime,
    });
    expect(result.peakHoursSurcharge).toBe(0);
    expect(result.nightSurcharge).toBe(0);
  });

  it('gère les coordonnées GPS au lieu des IDs de zone', () => {
    const result = calculateDeliveryPrice({
      pickupCoords: { lat: 5.36, lng: -3.99 },
      deliveryCoords: { lat: 5.31, lng: -3.99 },
    });
    expect(result.totalPrice).toBeGreaterThan(0);
  });

  it('utilise des valeurs par défaut quand les zones sont introuvables', () => {
    const result = calculateDeliveryPrice({
      pickupZoneId: 'zone-inexistante',
      deliveryZoneId: 'zone-inexistante-2',
    });
    expect(result.totalPrice).toBeGreaterThan(0);
    expect(result.basePrice).toBe(1000); // default
  });
});

// ---- isDeliveryAllowed ----
describe('isDeliveryAllowed', () => {
  it('autorise la livraison dans une zone sans restrictions', () => {
    const result = isDeliveryAllowed('cocody-deux-plateaux');
    expect(result.allowed).toBe(true);
  });

  it('refuse la livraison pendant les heures interdites', () => {
    // Plateau Centre: pas de livraison 12:00-14:00
    const noon = new Date();
    noon.setHours(12, 30, 0, 0);
    const result = isDeliveryAllowed('plateau-centre', noon);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('autorise la livraison en dehors des heures interdites', () => {
    const morning = new Date();
    morning.setHours(10, 0, 0, 0);
    const result = isDeliveryAllowed('plateau-centre', morning);
    expect(result.allowed).toBe(true);
  });

  it('autorise pour une zone inconnue', () => {
    const result = isDeliveryAllowed('zone-fictive');
    expect(result.allowed).toBe(true);
  });
});

// ---- isPackageValueAllowed ----
describe('isPackageValueAllowed', () => {
  it('autorise toute valeur dans une zone sans restriction', () => {
    const result = isPackageValueAllowed('cocody-deux-plateaux', 1000000);
    expect(result.allowed).toBe(true);
  });

  it('refuse une valeur au-dessus du max', () => {
    // Vridi: maxPackageValue = 500000
    const result = isPackageValueAllowed('portbouet-vridi', 600000);
    expect(result.allowed).toBe(false);
    expect(result.maxValue).toBe(500000);
  });

  it('autorise une valeur en dessous du max', () => {
    const result = isPackageValueAllowed('portbouet-vridi', 200000);
    expect(result.allowed).toBe(true);
  });

  it('autorise la valeur exacte du max', () => {
    const result = isPackageValueAllowed('portbouet-vridi', 500000);
    expect(result.allowed).toBe(true);
  });
});

// ---- searchZones ----
describe('searchZones', () => {
  it('trouve des zones par nom', () => {
    const results = searchZones('Riviera');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Riviera');
  });

  it('trouve des zones par commune', () => {
    const results = searchZones('Cocody');
    expect(results.length).toBeGreaterThanOrEqual(4);
  });

  it('trouve des zones par quartier populaire', () => {
    const results = searchZones('Vallon');
    expect(results.length).toBeGreaterThan(0);
  });

  it('recherche insensible à la casse', () => {
    const results = searchZones('riviera');
    expect(results.length).toBeGreaterThan(0);
  });

  it('retourne un tableau vide pour une recherche sans résultat', () => {
    const results = searchZones('zxqwvbnt');
    expect(results).toEqual([]);
  });
});

// ---- getPopularZones ----
describe('getPopularZones', () => {
  it('retourne le nombre demandé de zones', () => {
    const zones = getPopularZones(5);
    expect(zones.length).toBe(5);
  });

  it('retourne 10 zones par défaut', () => {
    const zones = getPopularZones();
    expect(zones.length).toBe(10);
  });
});

// ---- getZoneStats ----
describe('getZoneStats', () => {
  it('retourne les stats pour une zone existante', () => {
    const stats = getZoneStats('cocody-riviera');
    expect(stats.zone).not.toBeNull();
    expect(stats.riskLabel).toBe('Faible');
    expect(stats.riskColor).toBe('green');
    expect(stats.priceCategory).toBe('Premium'); // 1.3
  });

  it('retourne Premium pour multiplier >= 1.3', () => {
    const stats = getZoneStats('plateau-centre');
    expect(stats.priceCategory).toBe('Premium'); // 1.4
  });

  it('retourne Supérieur pour multiplier >= 1.1 et < 1.3', () => {
    const stats = getZoneStats('cocody-deux-plateaux');
    expect(stats.priceCategory).toBe('Supérieur'); // 1.2
  });

  it('retourne Économique pour multiplier < 1.0', () => {
    const stats = getZoneStats('yopougon-niangon');
    expect(stats.priceCategory).toBe('Économique'); // 0.95
  });

  it('retourne des valeurs par défaut pour une zone inconnue', () => {
    const stats = getZoneStats('zone-fictive');
    expect(stats.zone).toBeNull();
    expect(stats.riskLabel).toBe('Inconnu');
    expect(stats.priceCategory).toBe('Standard');
  });

  it('liste les restrictions d\'une zone restreinte', () => {
    const stats = getZoneStats('portbouet-vridi');
    expect(stats.restrictions.length).toBeGreaterThan(0);
  });
});
