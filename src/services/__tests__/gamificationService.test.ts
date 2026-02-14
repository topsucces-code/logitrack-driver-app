import { describe, it, expect } from 'vitest';
import { calculateLevel, calculateXP, BADGES } from '../gamificationService';

// ---- calculateLevel ----
describe('calculateLevel', () => {
  it('retourne niveau 1 pour 0 XP', () => {
    const result = calculateLevel(0);
    expect(result.level).toBe(1);
    expect(result.progress).toBe(0);
    expect(result.xpToNextLevel).toBe(1000); // 1^2 * 1000
  });

  it('retourne niveau 1 avec progression partielle', () => {
    const result = calculateLevel(500);
    expect(result.level).toBe(1);
    expect(result.progress).toBe(50); // 500/1000 * 100
    expect(result.xpToNextLevel).toBe(500);
  });

  it('retourne niveau 2 après 1000 XP', () => {
    // Level 1 requires 1000 XP (1^2 * 1000)
    const result = calculateLevel(1000);
    expect(result.level).toBe(2);
    expect(result.progress).toBe(0);
    expect(result.xpToNextLevel).toBe(4000); // 2^2 * 1000
  });

  it('retourne niveau 3 après 5000 XP', () => {
    // Level 1: 1000, Level 2: 4000 → total 5000
    const result = calculateLevel(5000);
    expect(result.level).toBe(3);
    expect(result.progress).toBe(0);
  });

  it('gère les XP intermédiaires', () => {
    // 2000 XP : level 1 (1000) passé, dans level 2 (4000 requis), 1000 en cours
    const result = calculateLevel(2000);
    expect(result.level).toBe(2);
    expect(result.progress).toBe(25); // 1000/4000 * 100
    expect(result.xpToNextLevel).toBe(3000);
  });

  it('niveau augmente progressivement avec beaucoup de XP', () => {
    const low = calculateLevel(100);
    const mid = calculateLevel(10000);
    const high = calculateLevel(100000);
    expect(low.level).toBeLessThan(mid.level);
    expect(mid.level).toBeLessThan(high.level);
  });
});

// ---- calculateXP ----
describe('calculateXP', () => {
  it('retourne 0 pour aucune activité', () => {
    expect(calculateXP({ totalDeliveries: 0, totalEarnings: 0, avgRating: 0 })).toBe(0);
  });

  it('calcule les XP de livraison (100 XP par livraison)', () => {
    const xp = calculateXP({ totalDeliveries: 10, totalEarnings: 0, avgRating: 0 });
    expect(xp).toBe(1000); // 10 * 100
  });

  it('calcule les XP de gains (1 XP par 1000 FCFA)', () => {
    const xp = calculateXP({ totalDeliveries: 0, totalEarnings: 50000, avgRating: 0 });
    expect(xp).toBe(50); // 50000 / 1000
  });

  it('ajoute le bonus rating >= 4.5 (50 XP par livraison)', () => {
    const withBonus = calculateXP({ totalDeliveries: 10, totalEarnings: 0, avgRating: 4.5 });
    const withoutBonus = calculateXP({ totalDeliveries: 10, totalEarnings: 0, avgRating: 4.4 });
    expect(withBonus).toBe(1500); // 10*100 + 10*50
    expect(withoutBonus).toBe(1000); // 10*100 only
  });

  it('calcule le total combiné', () => {
    const xp = calculateXP({ totalDeliveries: 20, totalEarnings: 100000, avgRating: 4.8 });
    // 20*100 + 100000/1000 + 20*50 = 2000 + 100 + 1000 = 3100
    expect(xp).toBe(3100);
  });
});

// ---- BADGES (intégrité des données) ----
describe('BADGES', () => {
  it('contient 20 badges', () => {
    expect(BADGES).toHaveLength(20);
  });

  it('a des IDs uniques', () => {
    const ids = BADGES.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a des tiers valides', () => {
    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    BADGES.forEach(badge => {
      expect(validTiers).toContain(badge.tier);
    });
  });

  it('a des catégories valides', () => {
    const validCategories = ['deliveries', 'earnings', 'rating', 'streak', 'distance'];
    BADGES.forEach(badge => {
      expect(validCategories).toContain(badge.category);
    });
  });

  it('a des requirements croissants par catégorie', () => {
    const categories = ['deliveries', 'earnings', 'rating', 'streak', 'distance'];
    categories.forEach(cat => {
      const catBadges = BADGES.filter(b => b.category === cat);
      for (let i = 1; i < catBadges.length; i++) {
        expect(catBadges[i].requirement).toBeGreaterThan(catBadges[i - 1].requirement);
      }
    });
  });

  it('a 4 badges par catégorie (bronze → platinum)', () => {
    const categories = ['deliveries', 'earnings', 'rating', 'streak', 'distance'];
    categories.forEach(cat => {
      const catBadges = BADGES.filter(b => b.category === cat);
      expect(catBadges).toHaveLength(4);
    });
  });
});
