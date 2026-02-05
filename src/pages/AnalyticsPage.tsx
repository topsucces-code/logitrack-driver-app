import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  Star,
  MapPin,
  Calendar,
  ChevronDown,
  Wallet,
  Target,
  Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfWeek, startOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '../components/ui/Skeleton';

type TimeRange = 'week' | 'month' | 'all';

interface DayStats {
  date: string;
  earnings: number;
  deliveries: number;
}

interface ZoneStats {
  zone: string;
  earnings: number;
  deliveries: number;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();

  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalDeliveries: 0,
    avgEarningsPerDelivery: 0,
    avgDeliveryTime: 0,
    completionRate: 0,
    acceptanceRate: 0,
    rating: 0,
    ratingCount: 0,
  });
  const [dailyStats, setDailyStats] = useState<DayStats[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [comparison, setComparison] = useState({
    earningsChange: 0,
    deliveriesChange: 0,
  });

  useEffect(() => {
    if (driver) {
      fetchAnalytics();
    }
  }, [driver, timeRange]);

  async function fetchAnalytics() {
    if (!driver) return;

    setLoading(true);

    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let previousStartDate: Date;

      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          previousStartDate = subDays(startDate, 7);
          break;
        case 'month':
          startDate = startOfMonth(now);
          previousStartDate = startOfMonth(subDays(startDate, 1));
          break;
        default:
          startDate = new Date(0);
          previousStartDate = new Date(0);
      }

      // Fetch deliveries for current period
      const { data: deliveries } = await supabase
        .from('logitrack_deliveries')
        .select('driver_earnings, delivered_at, delivery_zone, status, accepted_at, delivered_at')
        .eq('driver_id', driver.id)
        .gte('delivered_at', startDate.toISOString())
        .in('status', ['delivered', 'completed']);

      // Fetch deliveries for comparison period (previous week/month)
      const { data: previousDeliveries } = await supabase
        .from('logitrack_deliveries')
        .select('driver_earnings')
        .eq('driver_id', driver.id)
        .gte('delivered_at', previousStartDate.toISOString())
        .lt('delivered_at', startDate.toISOString())
        .in('status', ['delivered', 'completed']);

      // Calculate current stats
      const currentEarnings = (deliveries || []).reduce(
        (sum, d) => sum + (d.driver_earnings || 0),
        0
      );
      const currentDeliveryCount = (deliveries || []).length;

      // Calculate previous stats
      const previousEarnings = (previousDeliveries || []).reduce(
        (sum, d) => sum + (d.driver_earnings || 0),
        0
      );
      const previousDeliveryCount = (previousDeliveries || []).length;

      // Calculate comparison percentages
      const earningsChange = previousEarnings > 0
        ? ((currentEarnings - previousEarnings) / previousEarnings) * 100
        : 0;
      const deliveriesChange = previousDeliveryCount > 0
        ? ((currentDeliveryCount - previousDeliveryCount) / previousDeliveryCount) * 100
        : 0;

      // Calculate average delivery time
      let totalDeliveryTime = 0;
      let deliveriesWithTime = 0;
      (deliveries || []).forEach((d) => {
        if (d.accepted_at && d.delivered_at) {
          const acceptedTime = new Date(d.accepted_at).getTime();
          const deliveredTime = new Date(d.delivered_at).getTime();
          totalDeliveryTime += (deliveredTime - acceptedTime) / (1000 * 60); // in minutes
          deliveriesWithTime++;
        }
      });

      // Calculate daily stats
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const dayInterval = eachDayOfInterval({
        start: subDays(now, days - 1),
        end: now,
      });

      const dailyData: DayStats[] = dayInterval.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayDeliveries = (deliveries || []).filter(
          (d) => d.delivered_at && format(new Date(d.delivered_at), 'yyyy-MM-dd') === dayStr
        );
        return {
          date: dayStr,
          earnings: dayDeliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0),
          deliveries: dayDeliveries.length,
        };
      });

      // Calculate zone stats
      const zoneMap = new Map<string, { earnings: number; deliveries: number }>();
      (deliveries || []).forEach((d) => {
        const zone = d.delivery_zone || 'Autre';
        const current = zoneMap.get(zone) || { earnings: 0, deliveries: 0 };
        zoneMap.set(zone, {
          earnings: current.earnings + (d.driver_earnings || 0),
          deliveries: current.deliveries + 1,
        });
      });

      const zoneData: ZoneStats[] = Array.from(zoneMap.entries())
        .map(([zone, data]) => ({ zone, ...data }))
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5);

      // Set stats
      setStats({
        totalEarnings: currentEarnings,
        totalDeliveries: currentDeliveryCount,
        avgEarningsPerDelivery: currentDeliveryCount > 0 ? currentEarnings / currentDeliveryCount : 0,
        avgDeliveryTime: deliveriesWithTime > 0 ? totalDeliveryTime / deliveriesWithTime : 0,
        completionRate: driver.completion_rate || 0,
        acceptanceRate: driver.acceptance_rate || 0,
        rating: driver.rating_count > 0 ? driver.rating_sum / driver.rating_count : 0,
        ratingCount: driver.rating_count || 0,
      });

      setDailyStats(dailyData);
      setZoneStats(zoneData);
      setComparison({
        earningsChange,
        deliveriesChange,
      });
    } catch (err) {
      console.error('Analytics error:', err);
    }

    setLoading(false);
  }

  if (!driver) return null;

  const maxDailyEarning = Math.max(...dailyStats.map((d) => d.earnings), 1);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 safe-top px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Statistiques</h1>
            <p className="text-sm text-gray-500">Analysez vos performances</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mt-4">
          {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === 'week' && 'Semaine'}
              {range === 'month' && 'Mois'}
              {range === 'all' && 'Tout'}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <>
            <Skeleton height={120} className="rounded-xl" />
            <Skeleton height={200} className="rounded-xl" />
            <Skeleton height={150} className="rounded-xl" />
          </>
        ) : (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-3">
              {/* Earnings */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-500">Gains</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalEarnings.toLocaleString()} F
                </p>
                {comparison.earningsChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    comparison.earningsChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {comparison.earningsChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(comparison.earningsChange).toFixed(0)}%</span>
                  </div>
                )}
              </div>

              {/* Deliveries */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-500">Livraisons</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalDeliveries}
                </p>
                {comparison.deliveriesChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    comparison.deliveriesChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {comparison.deliveriesChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(comparison.deliveriesChange).toFixed(0)}%</span>
                  </div>
                )}
              </div>

              {/* Avg per delivery */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-500">Moy/livraison</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgEarningsPerDelivery.toLocaleString(undefined, { maximumFractionDigits: 0 })} F
                </p>
              </div>

              {/* Rating */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-500">Note</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.rating.toFixed(1)}
                  </p>
                  <span className="text-sm text-gray-400">/5</span>
                </div>
                <p className="text-xs text-gray-400">{stats.ratingCount} avis</p>
              </div>
            </div>

            {/* Daily Chart */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Gains quotidiens</h3>
              <div className="flex items-end gap-1 h-32">
                {dailyStats.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all"
                      style={{
                        height: `${(day.earnings / maxDailyEarning) * 100}%`,
                        minHeight: day.earnings > 0 ? '4px' : '0',
                      }}
                    />
                    <span className="text-xs text-gray-400">
                      {format(new Date(day.date), 'EEE', { locale: fr }).slice(0, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Performance</h3>
              <div className="space-y-4">
                {/* Acceptance Rate */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Taux d'acceptation</span>
                    <span className="font-medium">{(stats.acceptanceRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${stats.acceptanceRate * 100}%` }}
                    />
                  </div>
                </div>

                {/* Completion Rate */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Taux de complétion</span>
                    <span className="font-medium">{(stats.completionRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${stats.completionRate * 100}%` }}
                    />
                  </div>
                </div>

                {/* Avg Delivery Time */}
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">Temps moyen</span>
                  </div>
                  <span className="font-medium">{stats.avgDeliveryTime.toFixed(0)} min</span>
                </div>
              </div>
            </div>

            {/* Top Zones */}
            {zoneStats.length > 0 && (
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Zones les plus rentables</h3>
                <div className="space-y-3">
                  {zoneStats.map((zone, index) => (
                    <div key={zone.zone} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-400' :
                        'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{zone.zone}</p>
                        <p className="text-sm text-gray-500">{zone.deliveries} livraisons</p>
                      </div>
                      <p className="font-bold text-primary-600">
                        {zone.earnings.toLocaleString()} F
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-primary-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-primary-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-primary-900">Conseil du jour</p>
                  <p className="text-sm text-primary-700 mt-1">
                    {stats.acceptanceRate < 0.7
                      ? 'Acceptez plus de courses pour améliorer votre taux et recevoir plus d\'offres.'
                      : stats.avgDeliveryTime > 45
                      ? 'Essayez de réduire votre temps de livraison en optimisant vos trajets.'
                      : 'Continuez comme ça ! Vos performances sont excellentes.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
