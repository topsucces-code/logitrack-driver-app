import { describe, it, expect } from 'vitest';
import {
  optimizeRoute,
  formatDuration,
  formatDistance,
  type DeliveryStop,
} from '../routeOptimizationService';

// ---- Helpers : stops de test ----
const makeStop = (
  id: string,
  lat: number,
  lng: number,
  overrides: Partial<DeliveryStop> = {}
): DeliveryStop => ({
  id,
  name: `Stop ${id}`,
  address: `Address ${id}`,
  lat,
  lng,
  type: 'delivery',
  ...overrides,
});

// ---- optimizeRoute ----
describe('optimizeRoute', () => {
  it('retourne un résultat vide pour 0 stops', () => {
    const result = optimizeRoute([]);
    expect(result.stops).toEqual([]);
    expect(result.totalDistance).toBe(0);
    expect(result.totalDuration).toBe(0);
    expect(result.segments).toEqual([]);
  });

  it('retourne le stop unique pour 1 stop', () => {
    const stop = makeStop('a', 5.36, -3.99);
    const result = optimizeRoute([stop]);
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].id).toBe('a');
  });

  it('retourne 2 stops pour 2 stops', () => {
    const stops = [
      makeStop('a', 5.36, -3.99),
      makeStop('b', 5.31, -3.99),
    ];
    const result = optimizeRoute(stops);
    expect(result.stops).toHaveLength(2);
    expect(result.totalDistance).toBeGreaterThan(0);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('optimise un itinéraire multi-stops', () => {
    // Points en ligne : A(nord) - B(milieu) - C(sud)
    // L'ordre optimal devrait être A→B→C ou C→B→A
    const stops = [
      makeStop('a', 5.50, -4.00), // Nord
      makeStop('c', 5.30, -4.00), // Sud
      makeStop('b', 5.40, -4.00), // Milieu
    ];
    const result = optimizeRoute(stops);
    expect(result.stops).toHaveLength(3);
    expect(result.totalDistance).toBeGreaterThan(0);

    // Le stop du milieu ne devrait pas être en premier ou dernier
    // si l'optimisation fonctionne (nearest neighbor depuis A)
    const ids = result.stops.map(s => s.id);
    expect(ids[0]).toBe('a'); // Start point preserved
    expect(ids[1]).toBe('b'); // Nearest to A
    expect(ids[2]).toBe('c'); // Then C
  });

  it('priorise les stops haute priorité', () => {
    const stops = [
      makeStop('a', 5.50, -4.00),
      makeStop('b', 5.40, -4.00),
      makeStop('c', 5.30, -4.00, { priority: 'high' }),
    ];
    const result = optimizeRoute(stops);
    const ids = result.stops.map(s => s.id);
    // C (high priority) devrait venir avant B (normal)
    const cIdx = ids.indexOf('c');
    const bIdx = ids.indexOf('b');
    expect(cIdx).toBeLessThan(bIdx);
  });

  it('inclut les segments avec distance et durée', () => {
    const stops = [
      makeStop('a', 5.36, -3.99),
      makeStop('b', 5.31, -3.99),
    ];
    const result = optimizeRoute(stops);
    expect(result.segments.length).toBeGreaterThanOrEqual(1);
    result.segments.forEach(seg => {
      expect(seg.distance).toBeGreaterThanOrEqual(0);
      expect(seg.duration).toBeGreaterThanOrEqual(0);
      expect(seg.from).toBeDefined();
      expect(seg.to).toBeDefined();
    });
  });

  it('calcule les économies (savings)', () => {
    const stops = [
      makeStop('a', 5.50, -4.00),
      makeStop('c', 5.30, -4.00),
      makeStop('b', 5.40, -4.00),
    ];
    const result = optimizeRoute(stops);
    expect(result.savings).toBeDefined();
    expect(result.savings.distance).toBeGreaterThanOrEqual(0);
    expect(result.savings.time).toBeGreaterThanOrEqual(0);
    expect(result.savings.percentage).toBeGreaterThanOrEqual(0);
  });

  it('gère la position courante du chauffeur', () => {
    const stops = [
      makeStop('a', 5.36, -3.99),
      makeStop('b', 5.31, -3.99),
    ];
    const result = optimizeRoute(stops, { lat: 5.40, lng: -4.00 });
    // La position courante ne doit PAS apparaître dans les stops résultants
    expect(result.stops.every(s => s.id !== 'current-location')).toBe(true);
    expect(result.stops).toHaveLength(2);
  });

  it('inclut la durée estimée à chaque stop', () => {
    const stops = [
      makeStop('a', 5.36, -3.99, { estimatedDuration: 10 }),
      makeStop('b', 5.31, -3.99, { estimatedDuration: 15 }),
    ];
    const result = optimizeRoute(stops);
    // totalDuration inclut le temps de trajet + le temps à chaque stop
    expect(result.totalDuration).toBeGreaterThan(0);
  });
});

// ---- formatDuration ----
describe('formatDuration', () => {
  it('affiche en minutes pour < 60', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('affiche en heures et minutes pour >= 60', () => {
    expect(formatDuration(90)).toBe('1h 30min');
  });

  it('affiche 0 min pour 0', () => {
    expect(formatDuration(0)).toBe('0 min');
  });

  it('arrondit les minutes', () => {
    expect(formatDuration(45.7)).toBe('46 min');
  });
});

// ---- formatDistance ----
describe('formatDistance', () => {
  it('affiche en mètres pour < 1 km', () => {
    expect(formatDistance(0.5)).toBe('500 m');
  });

  it('affiche en km pour >= 1 km', () => {
    expect(formatDistance(3.456)).toBe('3.5 km');
  });

  it('affiche 0 m pour 0', () => {
    expect(formatDistance(0)).toBe('0 m');
  });
});
