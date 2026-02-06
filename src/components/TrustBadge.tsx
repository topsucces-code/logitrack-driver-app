import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Star,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { DriverReliabilityScore, TRUST_LEVELS } from '../types/trust';
import { getReliabilityScore } from '../services/trustService';

interface TrustBadgeProps {
  driverId: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  onClick?: () => void;
}

export function TrustBadge({ driverId, size = 'md', showDetails = false, onClick }: TrustBadgeProps) {
  const [score, setScore] = useState<DriverReliabilityScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScore();
  }, [driverId]);

  async function loadScore() {
    setLoading(true);
    const data = await getReliabilityScore(driverId);
    setScore(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${
        size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'
      }`} />
    );
  }

  if (!score) return null;

  const level = TRUST_LEVELS[score.trust_level];
  const Icon = score.overall_score >= 70 ? ShieldCheck : Shield;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (!showDetails) {
    return (
      <button
        onClick={onClick}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center relative transition-transform hover:scale-105`}
        style={{ backgroundColor: level.color + '20', border: `2px solid ${level.color}` }}
      >
        <Icon className={iconSizes[size]} style={{ color: level.color }} />
        <span
          className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full px-1 font-bold shadow-sm"
          style={{ color: level.color, fontSize: size === 'sm' ? '8px' : '10px' }}
        >
          {score.overall_score}
        </span>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-xl transition-all"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: level.color + '20', border: `3px solid ${level.color}` }}
        >
          <Icon className="w-7 h-7" style={{ color: level.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {score.overall_score}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">/100</span>
          </div>
          <div
            className="text-sm font-semibold"
            style={{ color: level.color }}
          >
            Niveau {level.label}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score.overall_score}%`,
            backgroundColor: level.color,
          }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
          label="Réussite"
          value={`${score.delivery_success_rate}%`}
        />
        <StatItem
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          label="Ponctualité"
          value={`${score.on_time_rate}%`}
        />
        <StatItem
          icon={<Star className="w-4 h-4 text-yellow-500" />}
          label="Note clients"
          value={`${score.customer_rating_avg}/5`}
        />
        <StatItem
          icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
          label="Livraisons"
          value={score.total_deliveries.toString()}
        />
      </div>

      {/* Badges */}
      {score.badges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Badges obtenus</p>
          <div className="flex flex-wrap gap-2">
            {score.badges.map((badge) => (
              <span
                key={badge.id}
                className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-medium"
              >
                {badge.icon} {badge.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      {icon}
      <div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// Composant de résumé compact pour les cartes de livraison
export function TrustBadgeCompact({
  score,
  trustLevel,
  isVerified,
}: {
  score: number;
  trustLevel: string;
  isVerified: boolean;
}) {
  const level = TRUST_LEVELS[trustLevel as keyof typeof TRUST_LEVELS] || TRUST_LEVELS.bronze;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: level.color + '20' }}
      >
        {isVerified ? (
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: level.color }} />
        ) : (
          <Shield className="w-3.5 h-3.5" style={{ color: level.color }} />
        )}
      </div>
      <span className="text-xs font-semibold" style={{ color: level.color }}>
        {score}
      </span>
    </div>
  );
}
