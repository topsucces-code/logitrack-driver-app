import { supabase } from '../lib/supabase';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  metric: string;
  target: number;
  reward: number;
  rewardXp: number;
  icon: string;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
  periodStart: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: string;
  unlockedAt?: string;
  requirement: number;
}

export interface DriverStats {
  totalDeliveries: number;
  totalEarnings: number;
  totalDistance: number;
  avgRating: number;
  currentStreak: number;
  bestStreak: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

// Predefined badges (stable, no need for DB)
export const BADGES: Omit<Badge, 'unlockedAt'>[] = [
  { id: 'deliveries_10', name: 'Débutant', description: '10 livraisons effectuées', icon: '📦', tier: 'bronze', category: 'deliveries', requirement: 10 },
  { id: 'deliveries_50', name: 'Apprenti', description: '50 livraisons effectuées', icon: '📦', tier: 'silver', category: 'deliveries', requirement: 50 },
  { id: 'deliveries_100', name: 'Professionnel', description: '100 livraisons effectuées', icon: '📦', tier: 'gold', category: 'deliveries', requirement: 100 },
  { id: 'deliveries_500', name: 'Expert', description: '500 livraisons effectuées', icon: '📦', tier: 'platinum', category: 'deliveries', requirement: 500 },
  { id: 'earnings_50k', name: 'Premier salaire', description: 'Gagnez 50 000 FCFA', icon: '💵', tier: 'bronze', category: 'earnings', requirement: 50000 },
  { id: 'earnings_200k', name: 'Économiste', description: 'Gagnez 200 000 FCFA', icon: '💵', tier: 'silver', category: 'earnings', requirement: 200000 },
  { id: 'earnings_500k', name: 'Prospère', description: 'Gagnez 500 000 FCFA', icon: '💵', tier: 'gold', category: 'earnings', requirement: 500000 },
  { id: 'earnings_1m', name: 'Millionnaire', description: 'Gagnez 1 000 000 FCFA', icon: '💵', tier: 'platinum', category: 'earnings', requirement: 1000000 },
  { id: 'rating_4', name: 'Apprécié', description: 'Note moyenne de 4+', icon: '⭐', tier: 'bronze', category: 'rating', requirement: 4 },
  { id: 'rating_45', name: 'Excellent', description: 'Note moyenne de 4.5+', icon: '⭐', tier: 'silver', category: 'rating', requirement: 4.5 },
  { id: 'rating_48', name: 'Exceptionnel', description: 'Note moyenne de 4.8+', icon: '⭐', tier: 'gold', category: 'rating', requirement: 4.8 },
  { id: 'rating_5', name: 'Parfait', description: 'Note moyenne de 5', icon: '⭐', tier: 'platinum', category: 'rating', requirement: 5 },
  { id: 'streak_3', name: 'Constant', description: '3 jours consécutifs', icon: '🔥', tier: 'bronze', category: 'streak', requirement: 3 },
  { id: 'streak_7', name: 'Régulier', description: '7 jours consécutifs', icon: '🔥', tier: 'silver', category: 'streak', requirement: 7 },
  { id: 'streak_14', name: 'Dévoué', description: '14 jours consécutifs', icon: '🔥', tier: 'gold', category: 'streak', requirement: 14 },
  { id: 'streak_30', name: 'Légendaire', description: '30 jours consécutifs', icon: '🔥', tier: 'platinum', category: 'streak', requirement: 30 },
  { id: 'distance_100', name: 'Voyageur', description: 'Parcourez 100 km', icon: '🛣️', tier: 'bronze', category: 'distance', requirement: 100 },
  { id: 'distance_500', name: 'Routier', description: 'Parcourez 500 km', icon: '🛣️', tier: 'silver', category: 'distance', requirement: 500 },
  { id: 'distance_1000', name: 'Globe-trotter', description: 'Parcourez 1 000 km', icon: '🛣️', tier: 'gold', category: 'distance', requirement: 1000 },
  { id: 'distance_5000', name: 'Aventurier', description: 'Parcourez 5 000 km', icon: '🛣️', tier: 'platinum', category: 'distance', requirement: 5000 },
];

/**
 * Calculate driver level from XP
 */
export function calculateLevel(xp: number): { level: number; xpToNextLevel: number; progress: number } {
  let level = 1;
  let totalXpRequired = 0;

  while (totalXpRequired + (level * level * 1000) <= xp) {
    totalXpRequired += level * level * 1000;
    level++;
  }

  const xpForCurrentLevel = level * level * 1000;
  const xpInCurrentLevel = xp - totalXpRequired;
  const progress = (xpInCurrentLevel / xpForCurrentLevel) * 100;

  return { level, xpToNextLevel: xpForCurrentLevel - xpInCurrentLevel, progress };
}

/**
 * Calculate XP from stats
 */
export function calculateXP(stats: {
  totalDeliveries: number;
  totalEarnings: number;
  avgRating: number;
}): number {
  const deliveryXP = stats.totalDeliveries * 100;
  const earningsXP = Math.floor(stats.totalEarnings / 1000);
  const ratingBonus = stats.avgRating >= 4.5 ? stats.totalDeliveries * 50 : 0;
  return deliveryXP + earningsXP + ratingBonus;
}

function getPeriodDates(type: string): { start: Date; end: Date; periodStart: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (type === 'daily') {
    return {
      start: todayStart,
      end: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1),
      periodStart: todayStart.toISOString().split('T')[0],
    };
  }

  // weekly
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  if (weekStart > todayStart) weekStart.setDate(weekStart.getDate() - 7);

  return {
    start: weekStart,
    end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
    periodStart: weekStart.toISOString().split('T')[0],
  };
}

/**
 * Get active challenges for a driver (from DB)
 */
export async function getActiveChallenges(driverId: string): Promise<Challenge[]> {
  // 1. Load active challenges from DB
  const { data: dbChallenges } = await supabase
    .from('logitrack_challenges')
    .select('*')
    .eq('is_active', true)
    .order('type');

  if (!dbChallenges || dbChallenges.length === 0) return [];

  // 2. Compute delivery stats for progress calculation
  const daily = getPeriodDates('daily');
  const weekly = getPeriodDates('weekly');

  const { data: todayDeliveries } = await supabase
    .from('logitrack_deliveries')
    .select('id, driver_earnings, distance_km, is_express')
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .gte('delivered_at', daily.start.toISOString())
    .lte('delivered_at', daily.end.toISOString());

  const { data: weekDeliveries } = await supabase
    .from('logitrack_deliveries')
    .select('id, driver_earnings, distance_km')
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .gte('delivered_at', weekly.start.toISOString())
    .lte('delivered_at', weekly.end.toISOString());

  const todayCount = todayDeliveries?.length || 0;
  const todayEarnings = todayDeliveries?.reduce((s, d) => s + (d.driver_earnings || 0), 0) || 0;
  const todayExpress = todayDeliveries?.filter(d => d.is_express)?.length || 0;
  const weekCount = weekDeliveries?.length || 0;
  const weekEarnings = weekDeliveries?.reduce((s, d) => s + (d.driver_earnings || 0), 0) || 0;
  const weekDistance = weekDeliveries?.reduce((s, d) => s + (Number(d.distance_km) || 0), 0) || 0;

  // 3. Load existing progress records for this driver
  const challengeIds = dbChallenges.map(c => c.id);
  const { data: progressRows } = await supabase
    .from('logitrack_challenge_progress')
    .select('*')
    .eq('driver_id', driverId)
    .in('challenge_id', challengeIds);

  const progressMap = new Map<string, Record<string, unknown>>();
  (progressRows || []).forEach(p => {
    progressMap.set(`${p.challenge_id}_${p.period_start}`, p);
  });

  // 4. Build challenge list with progress
  const challenges: Challenge[] = [];

  for (const ch of dbChallenges) {
    const isDaily = ch.type === 'daily';
    const period = isDaily ? daily : weekly;

    // Calculate current progress value based on metric
    let currentValue = 0;
    if (isDaily) {
      switch (ch.metric) {
        case 'deliveries': currentValue = todayCount; break;
        case 'earnings': currentValue = todayEarnings; break;
        case 'express': currentValue = todayExpress; break;
        case 'rating': currentValue = 0; break; // handled separately
      }
    } else {
      switch (ch.metric) {
        case 'deliveries': currentValue = weekCount; break;
        case 'earnings': currentValue = weekEarnings; break;
        case 'distance': currentValue = weekDistance; break;
        case 'streak': currentValue = 0; break; // TODO: calculate streak
      }
    }

    const completed = currentValue >= Number(ch.target_value);
    const progressKey = `${ch.id}_${period.periodStart}`;
    const existingProgress = progressMap.get(progressKey);

    // Upsert progress record in background
    supabase
      .from('logitrack_challenge_progress')
      .upsert({
        challenge_id: ch.id,
        driver_id: driverId,
        period_start: period.periodStart,
        current_value: currentValue,
        completed,
        completed_at: completed && !existingProgress?.completed_at ? new Date().toISOString() : (existingProgress?.completed_at || null),
      }, { onConflict: 'challenge_id,driver_id,period_start' })
      .then(() => {});

    challenges.push({
      id: ch.id,
      title: ch.title,
      description: ch.description || '',
      type: ch.type,
      metric: ch.metric,
      target: Number(ch.target_value),
      reward: Number(ch.reward_amount),
      rewardXp: ch.reward_xp || 0,
      icon: ch.icon || '🎯',
      progress: currentValue,
      completed,
      rewardClaimed: !!(existingProgress?.reward_claimed),
      periodStart: period.periodStart,
    });
  }

  return challenges;
}

/**
 * Claim challenge reward
 */
export async function claimChallengeReward(
  driverId: string,
  challengeId: string,
  reward: number,
  periodStart: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Mark as claimed
    const { error: progressError } = await supabase
      .from('logitrack_challenge_progress')
      .update({
        reward_claimed: true,
        reward_claimed_at: new Date().toISOString(),
      })
      .eq('challenge_id', challengeId)
      .eq('driver_id', driverId)
      .eq('period_start', periodStart);

    if (progressError) throw progressError;

    // Add bonus transaction
    await supabase
      .from('logitrack_driver_transactions')
      .insert({
        driver_id: driverId,
        type: 'bonus',
        amount: reward,
        description: 'Récompense challenge',
      });

    // Try to increment balance via RPC
    await supabase.rpc('increment_driver_balance', {
      p_driver_id: driverId,
      p_amount: reward,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get driver stats and badges
 */
export async function getDriverStats(driverId: string): Promise<{
  stats: DriverStats;
  badges: Badge[];
  unlockedBadges: Badge[];
}> {
  const { data: allDeliveries } = await supabase
    .from('logitrack_deliveries')
    .select('id, driver_earnings, distance_km, rating')
    .eq('driver_id', driverId)
    .eq('status', 'delivered');

  const totalDeliveries = allDeliveries?.length || 0;
  const totalEarnings = allDeliveries?.reduce((sum, d) => sum + (d.driver_earnings || 0), 0) || 0;
  const totalDistance = allDeliveries?.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0) || 0;

  const ratingsCount = allDeliveries?.filter(d => d.rating)?.length || 0;
  const ratingsSum = allDeliveries?.reduce((sum, d) => sum + (d.rating || 0), 0) || 0;
  const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

  const xp = calculateXP({ totalDeliveries, totalEarnings, avgRating });
  const { level, xpToNextLevel } = calculateLevel(xp);

  const currentStreak = 1;
  const bestStreak = 1;

  const stats: DriverStats = {
    totalDeliveries,
    totalEarnings,
    totalDistance: Math.round(totalDistance * 10) / 10,
    avgRating: Math.round(avgRating * 10) / 10,
    currentStreak,
    bestStreak,
    level,
    xp,
    xpToNextLevel,
  };

  const unlockedBadges: Badge[] = [];

  BADGES.forEach(badge => {
    let unlocked = false;
    switch (badge.category) {
      case 'deliveries': unlocked = totalDeliveries >= badge.requirement; break;
      case 'earnings': unlocked = totalEarnings >= badge.requirement; break;
      case 'rating': unlocked = avgRating >= badge.requirement && totalDeliveries >= 10; break;
      case 'streak': unlocked = bestStreak >= badge.requirement; break;
      case 'distance': unlocked = totalDistance >= badge.requirement; break;
    }
    if (unlocked) {
      unlockedBadges.push({ ...badge, unlockedAt: new Date().toISOString() });
    }
  });

  return { stats, badges: BADGES as Badge[], unlockedBadges };
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' = 'weekly',
  limit = 10
): Promise<{ rank: number; driverId: string; name: string; deliveries: number; earnings: number }[]> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const { data, error } = await supabase
    .from('logitrack_deliveries')
    .select('driver_id, driver_earnings, logitrack_drivers!inner(full_name)')
    .eq('status', 'delivered')
    .gte('delivered_at', startDate.toISOString());

  if (error || !data || data.length === 0) return [];

  const driverMap: Record<string, { name: string; deliveries: number; earnings: number }> = {};
  for (const row of data) {
    const dId = row.driver_id;
    if (!dId) continue;
    if (!driverMap[dId]) {
      const driverData = row.logitrack_drivers as any;
      driverMap[dId] = { name: driverData?.full_name || 'Chauffeur', deliveries: 0, earnings: 0 };
    }
    driverMap[dId].deliveries += 1;
    driverMap[dId].earnings += row.driver_earnings || 0;
  }

  return Object.entries(driverMap)
    .sort((a, b) => b[1].deliveries - a[1].deliveries)
    .slice(0, limit)
    .map(([driverId, stats], index) => ({
      rank: index + 1,
      driverId,
      name: stats.name,
      deliveries: stats.deliveries,
      earnings: stats.earnings,
    }));
}
