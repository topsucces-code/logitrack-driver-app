import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Target,
  Gift,
  Medal,
  Flame,
  Star,
  ChevronRight,
  Loader2,
  Check,
  Lock,
  Crown,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import {
  getActiveChallenges,
  getDriverStats,
  getLeaderboard,
  claimChallengeReward,
  Challenge,
  Badge,
  DriverStats,
} from '../services/gamificationService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import { hapticSuccess, hapticLight } from '../hooks/useHapticFeedback';

type TabType = 'challenges' | 'badges' | 'leaderboard';

export default function ChallengesPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const { showSuccess, showError } = useToast();
  const t = useT();

  const [activeTab, setActiveTab] = useState<TabType>('challenges');
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (!driver) return;

    const driverId = driver.id;

    async function loadData() {
      setLoading(true);

      const [challengesData, statsData, leaderboardData] = await Promise.all([
        getActiveChallenges(driverId),
        getDriverStats(driverId),
        getLeaderboard(leaderboardPeriod),
      ]);

      setChallenges(challengesData);
      setStats(statsData.stats);
      setBadges(statsData.badges);
      setUnlockedBadges(statsData.unlockedBadges);
      setLeaderboard(leaderboardData);

      setLoading(false);
    }

    loadData();
  }, [driver]);

  // Reload leaderboard when period changes
  useEffect(() => {
    if (!driver) return;
    let cancelled = false;

    async function reloadLeaderboard() {
      const data = await getLeaderboard(leaderboardPeriod);
      if (!cancelled) setLeaderboard(data);
    }

    reloadLeaderboard();
    return () => { cancelled = true; };
  }, [leaderboardPeriod, driver]);

  const handleClaimReward = async (challenge: Challenge) => {
    if (!driver) return;
    const result = await claimChallengeReward(driver.id, challenge.id, challenge.reward);
    if (result.success) {
      hapticSuccess();
      showSuccess(`+${challenge.reward.toLocaleString()} FCFA bonus réclamé !`);
      // Update local state to remove claimed challenge
      setChallenges(prev => prev.filter(c => c.id !== challenge.id));
    } else {
      showError(result.error || 'Erreur lors de la réclamation');
    }
  };

  const dailyChallenges = challenges.filter(c => c.type === 'daily');
  const weeklyChallenges = challenges.filter(c => c.type === 'weekly');

  const tierColors = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-cyan-400 to-cyan-600',
  };

  const tierBg = {
    bronze: 'bg-amber-100 dark:bg-amber-900/30',
    silver: 'bg-gray-100 dark:bg-gray-700',
    gold: 'bg-yellow-100 dark:bg-yellow-900/30',
    platinum: 'bg-cyan-100 dark:bg-cyan-900/30',
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - Compact */}
      <header className="bg-gradient-to-r from-primary-500 to-primary-600 text-white safe-top px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">{t.challengesAndRewards}</h1>
        </div>

        {/* Level Progress - Compact */}
        {stats && (
          <div className="bg-white/10 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                <span className="font-bold text-sm">{t.level} {stats.level}</span>
                <span className="text-xs text-white/70">• {stats.xp.toLocaleString()} {t.xp}</span>
              </div>
              <span className="text-xs text-white/70">{stats.xpToNextLevel.toLocaleString()} {t.xp} →</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.xp / (stats.xp + stats.xpToNextLevel)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Tabs - Compact */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 flex-shrink-0">
        <div className="flex">
          {[
            { id: 'challenges', label: t.challenges, icon: Target },
            { id: 'badges', label: t.badges, icon: Medal },
            { id: 'leaderboard', label: t.leaderboard, icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                hapticLight();
                setActiveTab(tab.id as TabType);
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-2 border-b-2 transition-colors text-xs ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 pb-20">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            {/* Challenges Tab */}
            {activeTab === 'challenges' && (
              <div className="space-y-4">
                {/* Daily Challenges */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <h2 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {t.dailyChallenges}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {dailyChallenges.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        onClaim={() => handleClaimReward(challenge)}
                        claimLabel={t.claimReward}
                      />
                    ))}
                  </div>
                </div>

                {/* Weekly Challenges */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <h2 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {t.weeklyChallenges}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {weeklyChallenges.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        onClaim={() => handleClaimReward(challenge)}
                        claimLabel={t.claimReward}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
              <div className="space-y-3">
                {['deliveries', 'earnings', 'rating', 'streak', 'distance'].map((category) => {
                  const categoryBadges = badges.filter(b => b.category === category);
                  const categoryLabels: Record<string, string> = {
                    deliveries: `📦 ${t.categoryDeliveries}`,
                    earnings: `💰 ${t.categoryEarnings}`,
                    rating: `⭐ ${t.categoryRating}`,
                    streak: `🔥 ${t.categoryStreak}`,
                    distance: `🛣️ ${t.categoryDistance}`,
                  };

                  return (
                    <div key={category}>
                      <h3 className="font-semibold text-xs text-gray-900 dark:text-white mb-2">
                        {categoryLabels[category]}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {categoryBadges.map((badge) => {
                          const isUnlocked = unlockedBadges.some(b => b.id === badge.id);
                          return (
                            <div
                              key={badge.id}
                              className={`rounded-lg p-2.5 ${
                                isUnlocked
                                  ? tierBg[badge.tier]
                                  : 'bg-gray-100 dark:bg-gray-800 opacity-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-lg">{badge.icon}</span>
                                {isUnlocked ? (
                                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${tierColors[badge.tier]} flex items-center justify-center`}>
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <p className={`font-medium text-xs ${isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                {badge.name}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">
                                {badge.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-3">
                {/* Period Selector */}
                <div className="flex gap-1">
                  {([
                    { label: t.day, value: 'daily' as const },
                    { label: t.week, value: 'weekly' as const },
                    { label: t.month, value: 'monthly' as const },
                  ]).map((period) => (
                    <button
                      key={period.value}
                      onClick={() => {
                        hapticLight();
                        setLeaderboardPeriod(period.value);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        leaderboardPeriod === period.value
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>

                {/* Leaderboard List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.driverId}
                      className={`flex items-center gap-2 p-2.5 ${
                        index < leaderboard.length - 1
                          ? 'border-b border-gray-100 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-600'
                            : index === 1
                            ? 'bg-gray-100 text-gray-600'
                            : index === 2
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {entry.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.deliveries} {t.deliveries.toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-primary-600 dark:text-primary-400">
                          {entry.earnings.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500">FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Your Position */}
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2.5">
                  <p className="text-xs text-primary-700 dark:text-primary-300 mb-1">
                    {t.yourPosition}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary-600">
                        #{stats ? Math.min(stats.level + 5, 50) : '-'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {driver?.full_name}
                      </span>
                    </div>
                    <span className="font-medium text-sm text-primary-600">
                      {stats?.totalEarnings.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Challenge Card Component - Compact
function ChallengeCard({
  challenge,
  onClaim,
  claimLabel,
}: {
  challenge: Challenge;
  onClaim: () => void;
  claimLabel: string;
}) {
  const progress = challenge.progress || 0;
  const progressPercent = Math.min(100, (progress / challenge.target) * 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
      <div className="flex items-start gap-2">
        <div className="text-lg flex-shrink-0">{challenge.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {challenge.title}
            </h3>
            <div className="flex items-center gap-0.5 text-primary-600 dark:text-primary-400 flex-shrink-0">
              <Gift className="w-3 h-3" />
              <span className="font-medium text-xs">
                {challenge.reward.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            {challenge.description}
          </p>

          {/* Progress Bar */}
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-gray-500 dark:text-gray-400">
                {progress}/{challenge.target}
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  challenge.completed
                    ? 'bg-green-500'
                    : 'bg-primary-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Claim Button */}
          {challenge.completed && (
            <button
              onClick={onClaim}
              className="mt-2 w-full py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg"
            >
              {claimLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
