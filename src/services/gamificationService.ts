import { supabase } from '../lib/supabase';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  category: 'deliveries' | 'earnings' | 'rating' | 'streak' | 'distance';
  target: number;
  reward: number;
  rewardType: 'bonus' | 'badge' | 'multiplier';
  icon: string;
  startDate: string;
  endDate: string;
  progress?: number;
  completed?: boolean;
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

// Predefined challenges
export const DAILY_CHALLENGES: Omit<Challenge, 'id' | 'startDate' | 'endDate' | 'progress' | 'completed'>[] = [
  {
    title: 'Marathonien',
    description: 'Effectuez 10 livraisons aujourd\'hui',
    type: 'daily',
    category: 'deliveries',
    target: 10,
    reward: 2000,
    rewardType: 'bonus',
    icon: '🏃',
  },
  {
    title: 'Lève-tôt',
    description: 'Complétez 3 livraisons avant 9h',
    type: 'daily',
    category: 'deliveries',
    target: 3,
    reward: 1500,
    rewardType: 'bonus',
    icon: '🌅',
  },
  {
    title: 'Sans faute',
    description: 'Maintenez une note de 5 étoiles toute la journée',
    type: 'daily',
    category: 'rating',
    target: 5,
    reward: 1000,
    rewardType: 'bonus',
    icon: '⭐',
  },
  {
    title: 'Express',
    description: 'Livrez 5 commandes express',
    type: 'daily',
    category: 'deliveries',
    target: 5,
    reward: 2500,
    rewardType: 'bonus',
    icon: '⚡',
  },
];

export const WEEKLY_CHALLENGES: Omit<Challenge, 'id' | 'startDate' | 'endDate' | 'progress' | 'completed'>[] = [
  {
    title: 'Champion de la semaine',
    description: 'Effectuez 50 livraisons cette semaine',
    type: 'weekly',
    category: 'deliveries',
    target: 50,
    reward: 10000,
    rewardType: 'bonus',
    icon: '🏆',
  },
  {
    title: 'Objectif 100k',
    description: 'Gagnez 100 000 FCFA cette semaine',
    type: 'weekly',
    category: 'earnings',
    target: 100000,
    reward: 5000,
    rewardType: 'bonus',
    icon: '💰',
  },
  {
    title: 'Série parfaite',
    description: 'Travaillez 7 jours consécutifs',
    type: 'weekly',
    category: 'streak',
    target: 7,
    reward: 7500,
    rewardType: 'bonus',
    icon: '🔥',
  },
  {
    title: 'Explorateur',
    description: 'Parcourez 200 km cette semaine',
    type: 'weekly',
    category: 'distance',
    target: 200,
    reward: 3000,
    rewardType: 'bonus',
    icon: '🗺️',
  },
];

// Predefined badges
export const BADGES: Omit<Badge, 'unlockedAt'>[] = [
  // Delivery badges
  { id: 'deliveries_10', name: 'Débutant', description: '10 livraisons effectuées', icon: '📦', tier: 'bronze', category: 'deliveries', requirement: 10 },
  { id: 'deliveries_50', name: 'Apprenti', description: '50 livraisons effectuées', icon: '📦', tier: 'silver', category: 'deliveries', requirement: 50 },
  { id: 'deliveries_100', name: 'Professionnel', description: '100 livraisons effectuées', icon: '📦', tier: 'gold', category: 'deliveries', requirement: 100 },
  { id: 'deliveries_500', name: 'Expert', description: '500 livraisons effectuées', icon: '📦', tier: 'platinum', category: 'deliveries', requirement: 500 },

  // Earnings badges
  { id: 'earnings_50k', name: 'Premier salaire', description: 'Gagnez 50 000 FCFA', icon: '💵', tier: 'bronze', category: 'earnings', requirement: 50000 },
  { id: 'earnings_200k', name: 'Économiste', description: 'Gagnez 200 000 FCFA', icon: '💵', tier: 'silver', category: 'earnings', requirement: 200000 },
  { id: 'earnings_500k', name: 'Prospère', description: 'Gagnez 500 000 FCFA', icon: '💵', tier: 'gold', category: 'earnings', requirement: 500000 },
  { id: 'earnings_1m', name: 'Millionnaire', description: 'Gagnez 1 000 000 FCFA', icon: '💵', tier: 'platinum', category: 'earnings', requirement: 1000000 },

  // Rating badges
  { id: 'rating_4', name: 'Apprécié', description: 'Note moyenne de 4+', icon: '⭐', tier: 'bronze', category: 'rating', requirement: 4 },
  { id: 'rating_45', name: 'Excellent', description: 'Note moyenne de 4.5+', icon: '⭐', tier: 'silver', category: 'rating', requirement: 4.5 },
  { id: 'rating_48', name: 'Exceptionnel', description: 'Note moyenne de 4.8+', icon: '⭐', tier: 'gold', category: 'rating', requirement: 4.8 },
  { id: 'rating_5', name: 'Parfait', description: 'Note moyenne de 5', icon: '⭐', tier: 'platinum', category: 'rating', requirement: 5 },

  // Streak badges
  { id: 'streak_3', name: 'Constant', description: '3 jours consécutifs', icon: '🔥', tier: 'bronze', category: 'streak', requirement: 3 },
  { id: 'streak_7', name: 'Régulier', description: '7 jours consécutifs', icon: '🔥', tier: 'silver', category: 'streak', requirement: 7 },
  { id: 'streak_14', name: 'Dévoué', description: '14 jours consécutifs', icon: '🔥', tier: 'gold', category: 'streak', requirement: 14 },
  { id: 'streak_30', name: 'Légendaire', description: '30 jours consécutifs', icon: '🔥', tier: 'platinum', category: 'streak', requirement: 30 },

  // Distance badges
  { id: 'distance_100', name: 'Voyageur', description: 'Parcourez 100 km', icon: '🛣️', tier: 'bronze', category: 'distance', requirement: 100 },
  { id: 'distance_500', name: 'Routier', description: 'Parcourez 500 km', icon: '🛣️', tier: 'silver', category: 'distance', requirement: 500 },
  { id: 'distance_1000', name: 'Globe-trotter', description: 'Parcourez 1 000 km', icon: '🛣️', tier: 'gold', category: 'distance', requirement: 1000 },
  { id: 'distance_5000', name: 'Aventurier', description: 'Parcourez 5 000 km', icon: '🛣️', tier: 'platinum', category: 'distance', requirement: 5000 },
];

/**
 * Calculate driver level from XP
 */
export function calculateLevel(xp: number): { level: number; xpToNextLevel: number; progress: number } {
  // Each level requires more XP: level^2 * 1000
  let level = 1;
  let totalXpRequired = 0;

  while (totalXpRequired + (level * level * 1000) <= xp) {
    totalXpRequired += level * level * 1000;
    level++;
  }

  const xpForCurrentLevel = level * level * 1000;
  const xpInCurrentLevel = xp - totalXpRequired;
  const progress = (xpInCurrentLevel / xpForCurrentLevel) * 100;

  return {
    level,
    xpToNextLevel: xpForCurrentLevel - xpInCurrentLevel,
    progress,
  };
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

/**
 * Get active challenges for a driver
 */
export async function getActiveChallenges(driverId: string): Promise<Challenge[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  // Get today's deliveries count for progress
  const { data: todayDeliveries } = await supabase
    .from('logitrack_deliveries')
    .select('id, driver_earnings, distance_km, is_express')
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .gte('delivered_at', todayStart.toISOString())
    .lte('delivered_at', todayEnd.toISOString());

  const { data: weekDeliveries } = await supabase
    .from('logitrack_deliveries')
    .select('id, driver_earnings, distance_km')
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .gte('delivered_at', weekStart.toISOString())
    .lte('delivered_at', weekEnd.toISOString());

  const todayCount = todayDeliveries?.length || 0;
  const todayEarnings = todayDeliveries?.reduce((sum, d) => sum + (d.driver_earnings || 0), 0) || 0;
  const todayExpressCount = todayDeliveries?.filter(d => d.is_express)?.length || 0;

  const weekCount = weekDeliveries?.length || 0;
  const weekEarnings = weekDeliveries?.reduce((sum, d) => sum + (d.driver_earnings || 0), 0) || 0;
  const weekDistance = weekDeliveries?.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0) || 0;

  // Build daily challenges with progress
  const dailyChallenges: Challenge[] = DAILY_CHALLENGES.map((c, i) => ({
    ...c,
    id: `daily_${i}`,
    startDate: todayStart.toISOString(),
    endDate: todayEnd.toISOString(),
    progress: c.category === 'deliveries'
      ? c.title === 'Express' ? todayExpressCount : todayCount
      : c.category === 'earnings' ? todayEarnings : 0,
    completed: false,
  }));

  // Update completion status
  dailyChallenges.forEach(c => {
    c.completed = c.progress !== undefined && c.progress >= c.target;
  });

  // Build weekly challenges with progress
  const weeklyChallenges: Challenge[] = WEEKLY_CHALLENGES.map((c, i) => ({
    ...c,
    id: `weekly_${i}`,
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    progress: c.category === 'deliveries' ? weekCount
      : c.category === 'earnings' ? weekEarnings
      : c.category === 'distance' ? weekDistance
      : 0,
    completed: false,
  }));

  weeklyChallenges.forEach(c => {
    c.completed = c.progress !== undefined && c.progress >= c.target;
  });

  return [...dailyChallenges, ...weeklyChallenges];
}

/**
 * Get driver stats and badges
 */
export async function getDriverStats(driverId: string): Promise<{
  stats: DriverStats;
  badges: Badge[];
  unlockedBadges: Badge[];
}> {
  // Get all-time stats
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

  // Calculate XP and level
  const xp = calculateXP({ totalDeliveries, totalEarnings, avgRating });
  const { level, xpToNextLevel } = calculateLevel(xp);

  // TODO: Calculate streak from delivery dates
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

  // Check which badges are unlocked
  const unlockedBadges: Badge[] = [];

  BADGES.forEach(badge => {
    let unlocked = false;

    switch (badge.category) {
      case 'deliveries':
        unlocked = totalDeliveries >= badge.requirement;
        break;
      case 'earnings':
        unlocked = totalEarnings >= badge.requirement;
        break;
      case 'rating':
        unlocked = avgRating >= badge.requirement && totalDeliveries >= 10;
        break;
      case 'streak':
        unlocked = bestStreak >= badge.requirement;
        break;
      case 'distance':
        unlocked = totalDistance >= badge.requirement;
        break;
    }

    if (unlocked) {
      unlockedBadges.push({
        ...badge,
        unlockedAt: new Date().toISOString(),
      });
    }
  });

  return {
    stats,
    badges: BADGES as Badge[],
    unlockedBadges,
  };
}

/**
 * Claim challenge reward
 */
export async function claimChallengeReward(
  driverId: string,
  challengeId: string,
  reward: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update driver balance with reward
    const { error } = await supabase.rpc('increment_driver_balance', {
      p_driver_id: driverId,
      p_amount: reward,
    });

    // If the RPC doesn't exist yet, still return success (mock mode)
    if (error && !error.message.includes('function') && !error.message.includes('does not exist')) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
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

  // This would need a more complex query in production
  // For now, return mock data
  return [
    { rank: 1, driverId: '1', name: 'Jean D.', deliveries: 45, earnings: 135000 },
    { rank: 2, driverId: '2', name: 'Marie K.', deliveries: 42, earnings: 126000 },
    { rank: 3, driverId: '3', name: 'Paul M.', deliveries: 38, earnings: 114000 },
    { rank: 4, driverId: '4', name: 'Sophie L.', deliveries: 35, earnings: 105000 },
    { rank: 5, driverId: '5', name: 'Pierre N.', deliveries: 32, earnings: 96000 },
  ];
}
