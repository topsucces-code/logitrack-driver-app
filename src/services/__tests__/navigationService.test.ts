import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  estimateTravelTime,
  formatDistance,
  formatTravelTime,
} from '../navigationService';

// ---- calculateDistance (Haversine) ----
describe('calculateDistance', () => {
  it('retourne 0 pour le même point', () => {
    expect(calculateDistance(5.36, -3.99, 5.36, -3.99)).toBe(0);
  });

  it('calcule la distance Abidjan-Yamoussoukro (~240 km)', () => {
    // Abidjan: 5.3364, -4.0267 | Yamoussoukro: 6.8276, -5.2893
    const d = calculateDistance(5.3364, -4.0267, 6.8276, -5.2893);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(280);
  });

  it('calcule une courte distance (~1-2 km entre deux quartiers)', () => {
    // Cocody Deux Plateaux → Cocody Riviera
    const d = calculateDistance(5.36, -3.99, 5.355, -3.97);
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(3);
  });

  it('est symétrique (A→B == B→A)', () => {
    const ab = calculateDistance(5.36, -3.99, 5.42, -4.02);
    const ba = calculateDistance(5.42, -4.02, 5.36, -3.99);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

// ---- estimateTravelTime ----
describe('estimateTravelTime', () => {
  it('retourne le bon temps pour une moto (25 km/h)', () => {
    // 25 km à 25 km/h = 60 min
    expect(estimateTravelTime(25, 'moto')).toBe(60);
  });

  it('retourne le bon temps pour un vélo (12 km/h)', () => {
    // 12 km à 12 km/h = 60 min
    expect(estimateTravelTime(12, 'velo')).toBe(60);
  });

  it('retourne le bon temps pour une voiture (20 km/h)', () => {
    // 10 km à 20 km/h = 30 min
    expect(estimateTravelTime(10, 'voiture')).toBe(30);
  });

  it('retourne le bon temps pour un tricycle (20 km/h)', () => {
    expect(estimateTravelTime(10, 'tricycle')).toBe(30);
  });

  it('utilise la vitesse par défaut (20 km/h) pour un véhicule inconnu', () => {
    expect(estimateTravelTime(10, 'camion')).toBe(30);
  });

  it('arrondit au supérieur', () => {
    // 1 km à 25 km/h = 2.4 min → ceil → 3
    expect(estimateTravelTime(1, 'moto')).toBe(3);
  });

  it('retourne 0 pour distance 0', () => {
    expect(estimateTravelTime(0, 'moto')).toBe(0);
  });
});

// ---- formatDistance ----
describe('formatDistance', () => {
  it('affiche en mètres pour < 1 km', () => {
    expect(formatDistance(0.5)).toBe('500 m');
  });

  it('affiche en mètres arrondis', () => {
    expect(formatDistance(0.123)).toBe('123 m');
  });

  it('affiche en km pour >= 1 km', () => {
    expect(formatDistance(1)).toBe('1.0 km');
  });

  it('affiche 1 décimale pour les km', () => {
    expect(formatDistance(5.678)).toBe('5.7 km');
  });

  it('affiche 0 m pour distance 0', () => {
    expect(formatDistance(0)).toBe('0 m');
  });
});

// ---- formatTravelTime ----
describe('formatTravelTime', () => {
  it('affiche les minutes pour < 60 min', () => {
    expect(formatTravelTime(30)).toBe('30 min');
  });

  it('affiche heures et minutes pour >= 60 min', () => {
    expect(formatTravelTime(90)).toBe('1h 30min');
  });

  it('affiche sans minutes restantes si pile', () => {
    expect(formatTravelTime(120)).toBe('2h 0min');
  });

  it('affiche 0 min pour 0', () => {
    expect(formatTravelTime(0)).toBe('0 min');
  });
});
