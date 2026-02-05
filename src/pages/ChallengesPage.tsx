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
  const { showSuccess } = useToast();
  const t = useT();

  const [activeTab, setActiveTab] = useState<TabType>('challenges');
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (!driver) return;

    const driverId = driver.id;

    async function loadData() {
      setLoading(true);

      const [challengesData, statsData, leaderboardData] = await Promise.all([
        getActiveChallenges(driverId),
        getDriverStats(driverId),
        getLeaderboard('weekly'),
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

  const handleClaimReward = (challenge: Challenge) => {
    hapticSuccess();
    showSuccess(`+${challenge.reward.toLocaleString()} FCFA bonus réclamé !`);
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
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-500 to-primary-600 text-white safe-top px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t.challengesAndRewards}</h1>
        </div>

        {/* Level Progress */}
        {stats && (
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-lg">{t.level} {stats.level}</p>
                  <p className="text-xs text-white/70">{stats.xp.toLocaleString()} {t.xp}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/70">{t.nextLevel}</p>
                <p className="font-medium">{stats.xpToNextLevel.toLocaleString()} {t.xp}</p>
              </div>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.xp / (stats.xp + stats.xpToNextLevel)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4">
        <div className="flex gap-6">
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
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            {/* Challenges Tab */}
            {activeTab === 'challenges' && (
              <div className="space-y-6">
                {/* Daily Challenges */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {t.dailyChallenges}
                    </h2>
                  </div>
                  <div className="space-y-3">
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
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {t.weeklyChallenges}
                    </h2>
                  </div>
                  <div className="space-y-3">
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
              <div className="space-y-6">
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
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        {categoryLabels[category]}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {categoryBadges.map((badge) => {
                          const isUnlocked = unlockedBadges.some(b => b.id === badge.id);
                          return (
                            <div
                              key={badge.id}
                              className={`rounded-xl p-4 ${
                                isUnlocked
                                  ? tierBg[badge.tier]
                                  : 'bg-gray-100 dark:bg-gray-800 opacity-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{badge.icon}</span>
                                {isUnlocked ? (
                                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${tierColors[badge.tier]} flex items-center justify-center`}>
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                ) : (
                                  <Lock className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <p className={`font-medium ${isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                {badge.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
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
              <div className="space-y-4">
                {/* Period Selector */}
                <div className="flex gap-2">
                  {[t.day, t.week, t.month].map((period) => (
                    <button
                      key={period}
                      className="flex-1 py-2 px-4 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                    >
                      {period}
                    </button>
                  ))}
                </div>

                {/* Leaderboard List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.driverId}
                      className={`flex items-center gap-4 p-4 ${
                        index < leaderboard.length - 1
                          ? 'border-b border-gray-100 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
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
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {entry.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {entry.deliveries} {t.deliveries.toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-600 dark:text-primary-400">
                          {entry.earnings.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Your Position */}
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
                  <p className="text-sm text-primary-700 dark:text-primary-300 mb-1">
                    {t.yourPosition}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-primary-600">
                        #{stats ? Math.min(stats.level + 5, 50) : '-'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {driver?.full_name}
                      </span>
                    </div>
                    <span className="font-medium text-primary-600">
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

// Challenge Card Component
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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{challenge.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {challenge.title}
            </h3>
            <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
              <Gift className="w-4 h-4" />
              <span className="font-medium text-sm">
                {challenge.reward.toLocaleString()} FCFA
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {challenge.description}
          </p>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                {progress.toLocaleString()} / {challenge.target.toLocaleString()}
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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
            <Button
              onClick={onClaim}
              size="sm"
              className="mt-3 bg-green-500 hover:bg-green-600"
              fullWidth
            >
              {claimLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
