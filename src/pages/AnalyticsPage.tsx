import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { logger } from "../utils/logger";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Clock,
  Star,
  MapPin,
  Calendar,
  ChevronDown,
  Wallet,
  Target,
  Award,
  Download,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  format,
  subDays,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "../components/ui/Skeleton";

type TimeRange = "week" | "month" | "all";

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

  const [timeRange, setTimeRange] = useState<TimeRange>("week");
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
    avgPerDeliveryChange: 0,
    completionRateChange: 0,
    // Track whether previous period had data (to show "Nouveau" vs "0%")
    hasPreviousEarnings: false,
    hasPreviousDeliveries: false,
    hasPreviousAvg: false,
    hasPreviousCompletionRate: false,
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
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          previousStartDate = subDays(startDate, 7);
          break;
        case "month":
          startDate = startOfMonth(now);
          previousStartDate = startOfMonth(subDays(startDate, 1));
          break;
        default:
          startDate = new Date(0);
          previousStartDate = new Date(0);
      }

      // Fetch deliveries for current period
      // Use completed_at OR delivered_at OR accepted_at as date reference (some completed deliveries have null delivered_at)
      const { data: deliveries } = await supabase
        .from("logitrack_deliveries")
        .select(
          "driver_earnings, delivered_at, completed_at, accepted_at, delivery_zone_id, status",
        )
        .eq("driver_id", driver.id)
        .in("status", ["delivered", "completed"]);

      // Filter by date in JS (because the date could be in delivered_at, completed_at, or accepted_at)
      const getDeliveryDate = (d: any): string | null =>
        d.delivered_at || d.completed_at || d.accepted_at;
      const currentDeliveriesFiltered = (deliveries || []).filter((d) => {
        const date = getDeliveryDate(d);
        return date && new Date(date) >= startDate;
      });

      // Fetch deliveries for comparison period (previous week/month)
      const previousDeliveriesFiltered = (deliveries || []).filter((d) => {
        const date = getDeliveryDate(d);
        return (
          date &&
          new Date(date) >= previousStartDate &&
          new Date(date) < startDate
        );
      });

      // Fetch ALL deliveries (all statuses) for completion rate calculation
      const { data: allDeliveries } = await supabase
        .from("logitrack_deliveries")
        .select("status, created_at")
        .eq("driver_id", driver.id);

      const currentAllDeliveries = (allDeliveries || []).filter(
        (d) => new Date(d.created_at) >= startDate,
      );
      const previousAllDeliveries = (allDeliveries || []).filter(
        (d) =>
          new Date(d.created_at) >= previousStartDate &&
          new Date(d.created_at) < startDate,
      );

      // Calculate current stats
      const currentEarnings = currentDeliveriesFiltered.reduce(
        (sum, d) => sum + (d.driver_earnings || 0),
        0,
      );
      const currentDeliveryCount = currentDeliveriesFiltered.length;

      // Calculate previous stats
      const previousEarnings = previousDeliveriesFiltered.reduce(
        (sum, d) => sum + (d.driver_earnings || 0),
        0,
      );
      const previousDeliveryCount = previousDeliveriesFiltered.length;
      const previousAvgPerDelivery =
        previousDeliveryCount > 0
          ? previousEarnings / previousDeliveryCount
          : 0;
      const currentAvgPerDelivery =
        currentDeliveryCount > 0 ? currentEarnings / currentDeliveryCount : 0;

      // Calculate completion rates for current and previous periods
      const currentAllCount = currentAllDeliveries.length;
      const currentCompletedCount = currentAllDeliveries.filter(
        (d) => d.status === "delivered" || d.status === "completed",
      ).length;
      const currentCompletionRate =
        currentAllCount > 0
          ? (currentCompletedCount / currentAllCount) * 100
          : 0;

      const previousAllCount = previousAllDeliveries.length;
      const previousCompletedCount = previousAllDeliveries.filter(
        (d) => d.status === "delivered" || d.status === "completed",
      ).length;
      const previousCompletionRate =
        previousAllCount > 0
          ? (previousCompletedCount / previousAllCount) * 100
          : 0;

      // Calculate comparison percentages
      const earningsChange =
        previousEarnings > 0
          ? ((currentEarnings - previousEarnings) / previousEarnings) * 100
          : 0;
      const deliveriesChange =
        previousDeliveryCount > 0
          ? ((currentDeliveryCount - previousDeliveryCount) /
              previousDeliveryCount) *
            100
          : 0;
      const avgPerDeliveryChange =
        previousAvgPerDelivery > 0
          ? ((currentAvgPerDelivery - previousAvgPerDelivery) /
              previousAvgPerDelivery) *
            100
          : 0;
      // Completion rate change is absolute difference in percentage points
      const completionRateChange =
        previousAllCount > 0
          ? currentCompletionRate - previousCompletionRate
          : 0;

      // Calculate average delivery time
      let totalDeliveryTime = 0;
      let deliveriesWithTime = 0;
      currentDeliveriesFiltered.forEach((d) => {
        if (d.accepted_at && (d.delivered_at || d.completed_at)) {
          const acceptedTime = new Date(d.accepted_at).getTime();
          const endTime = new Date(d.delivered_at || d.completed_at).getTime();
          totalDeliveryTime += (endTime - acceptedTime) / (1000 * 60); // in minutes
          deliveriesWithTime++;
        }
      });

      // Calculate daily stats
      const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90;
      const dayInterval = eachDayOfInterval({
        start: subDays(now, days - 1),
        end: now,
      });

      const dailyData: DayStats[] = dayInterval.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayDeliveries = currentDeliveriesFiltered.filter((d) => {
          const date = getDeliveryDate(d);
          return date && format(new Date(date), "yyyy-MM-dd") === dayStr;
        });
        return {
          date: dayStr,
          earnings: dayDeliveries.reduce(
            (sum, d) => sum + (d.driver_earnings || 0),
            0,
          ),
          deliveries: dayDeliveries.length,
        };
      });

      // Calculate zone stats - fetch zone names
      const zoneIds = [
        ...new Set(
          currentDeliveriesFiltered
            .map((d) => d.delivery_zone_id)
            .filter(Boolean),
        ),
      ];
      let zoneNameMap: Record<string, string> = {};
      if (zoneIds.length > 0) {
        const { data: zones } = await supabase
          .from("logitrack_zones")
          .select("id, name")
          .in("id", zoneIds);
        (zones || []).forEach((z) => {
          zoneNameMap[z.id] = z.name;
        });
      }

      const zoneMap = new Map<
        string,
        { earnings: number; deliveries: number }
      >();
      currentDeliveriesFiltered.forEach((d) => {
        const zoneName = d.delivery_zone_id
          ? zoneNameMap[d.delivery_zone_id] || "Zone inconnue"
          : "Autre";
        const current = zoneMap.get(zoneName) || { earnings: 0, deliveries: 0 };
        zoneMap.set(zoneName, {
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
        avgEarningsPerDelivery:
          currentDeliveryCount > 0 ? currentEarnings / currentDeliveryCount : 0,
        avgDeliveryTime:
          deliveriesWithTime > 0 ? totalDeliveryTime / deliveriesWithTime : 0,
        completionRate: driver.completion_rate || 0,
        acceptanceRate: driver.acceptance_rate || 0,
        rating:
          driver.rating_count > 0 ? driver.rating_sum / driver.rating_count : 0,
        ratingCount: driver.rating_count || 0,
      });

      setDailyStats(dailyData);
      setZoneStats(zoneData);
      setComparison({
        earningsChange,
        deliveriesChange,
        avgPerDeliveryChange,
        completionRateChange,
        hasPreviousEarnings: previousEarnings > 0,
        hasPreviousDeliveries: previousDeliveryCount > 0,
        hasPreviousAvg: previousAvgPerDelivery > 0,
        hasPreviousCompletionRate: previousAllCount > 0,
      });
    } catch (err) {
      logger.error("Analytics error", { error: err });
    }

    setLoading(false);
  }

  function exportCSV() {
    const timeRangeLabels: Record<TimeRange, string> = {
      week: "Semaine",
      month: "Mois",
      all: "Tout",
    };

    const headers = [
      "Période",
      "Livraisons",
      "Revenus (FCFA)",
      "Moyenne par livraison (FCFA)",
      "Note moyenne",
      "Taux d'acceptation (%)",
      "Taux de complétion (%)",
      "Temps moyen (min)",
    ];

    const row = [
      timeRangeLabels[timeRange],
      stats.totalDeliveries.toString(),
      stats.totalEarnings.toString(),
      stats.avgEarningsPerDelivery.toFixed(0),
      stats.rating.toFixed(1),
      (stats.acceptanceRate * 100).toFixed(0),
      (stats.completionRate * 100).toFixed(0),
      stats.avgDeliveryTime.toFixed(0),
    ];

    // Add daily breakdown
    const dailyHeaders = ["", "", "Détail quotidien"];
    const dailyColHeaders = ["Date", "Livraisons", "Revenus (FCFA)"];
    const dailyRows = dailyStats
      .filter((d) => d.deliveries > 0 || d.earnings > 0)
      .map((d) => [
        format(new Date(d.date), "dd/MM/yyyy", { locale: fr }),
        d.deliveries.toString(),
        d.earnings.toString(),
      ]);

    // Add zone breakdown
    const zoneSection =
      zoneStats.length > 0
        ? [
            ["", "", "Top zones"],
            ["Zone", "Livraisons", "Revenus (FCFA)"],
            ...zoneStats.map((z) => [
              z.zone,
              z.deliveries.toString(),
              z.earnings.toString(),
            ]),
          ]
        : [];

    const allRows = [
      headers,
      row,
      [],
      dailyHeaders,
      dailyColHeaders,
      ...dailyRows,
      [],
      ...zoneSection,
    ];

    const csv = allRows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statistiques_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!driver) return null;

  const maxDailyEarning = useMemo(
    () => Math.max(...dailyStats.map((d) => d.earnings), 1),
    [dailyStats],
  );

  // Reusable comparison badge for period indicators
  function ComparisonBadge({
    change,
    hasPrevious,
    isPercentagePoints = false,
  }: {
    change: number;
    hasPrevious: boolean;
    isPercentagePoints?: boolean;
  }) {
    // "all" time range has no comparison
    if (timeRange === "all") return null;

    // No previous data: show "Nouveau"
    if (!hasPrevious) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
          Nouveau
        </span>
      );
    }

    const rounded = isPercentagePoints
      ? Math.abs(change).toFixed(1)
      : Math.abs(change).toFixed(1);
    const suffix = isPercentagePoints ? " pts" : "%";

    if (change > 0.5) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
          <TrendingUp className="w-3 h-3" />+{rounded}
          {suffix}
        </span>
      );
    }

    if (change < -0.5) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
          <TrendingDown className="w-3 h-3" />
          {/* Negative sign included via rounded value */}-{rounded}
          {suffix}
        </span>
      );
    }

    // No meaningful change
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }

  return (
    <div className="h-mobile-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - Compact */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            aria-label="Retour"
            className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            Statistiques
          </h1>
          <button
            onClick={exportCSV}
            disabled={loading}
            className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

        {/* Time Range Selector - Compact */}
        <div className="flex gap-1 mt-2">
          {(["week", "month", "all"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                timeRange === range
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {range === "week" && "Semaine"}
              {range === "month" && "Mois"}
              {range === "all" && "Tout"}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-20 space-y-3">
        {loading ? (
          <>
            <Skeleton height={80} className="rounded-lg" />
            <Skeleton height={100} className="rounded-lg" />
            <Skeleton height={80} className="rounded-lg" />
          </>
        ) : (
          <>
            {/* Main Stats - Compact 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Earnings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Gains
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.totalEarnings.toLocaleString()} F
                </p>
                <ComparisonBadge
                  change={comparison.earningsChange}
                  hasPrevious={comparison.hasPreviousEarnings}
                />
              </div>

              {/* Deliveries */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Livraisons
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.totalDeliveries}
                </p>
                <ComparisonBadge
                  change={comparison.deliveriesChange}
                  hasPrevious={comparison.hasPreviousDeliveries}
                />
              </div>

              {/* Avg per delivery */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Moy/liv.
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.avgEarningsPerDelivery.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  F
                </p>
                <ComparisonBadge
                  change={comparison.avgPerDeliveryChange}
                  hasPrevious={comparison.hasPreviousAvg}
                />
              </div>

              {/* Rating */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Note
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {stats.rating.toFixed(1)}
                  </p>
                  <span className="text-xs text-gray-400">/5</span>
                </div>
              </div>
            </div>

            {/* Daily Chart - Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                Gains quotidiens
              </h3>
              <div
                className="flex items-end gap-1 h-20"
                role="img"
                aria-label="Graphique des gains quotidiens sur les 7 derniers jours"
              >
                {dailyStats.slice(-7).map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all"
                      style={{
                        height: `${(day.earnings / maxDailyEarning) * 100}%`,
                        minHeight: day.earnings > 0 ? "2px" : "0",
                      }}
                    />
                    <span className="text-[9px] text-gray-400">
                      {format(new Date(day.date), "EEE", { locale: fr }).slice(
                        0,
                        2,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics - Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                Performance
              </h3>
              <div className="space-y-2">
                {/* Acceptance Rate */}
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600 dark:text-gray-400">
                      Taux d'acceptation
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(stats.acceptanceRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(stats.acceptanceRate * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Taux d'acceptation"
                  >
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${stats.acceptanceRate * 100}%` }}
                    />
                  </div>
                </div>

                {/* Completion Rate */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-0.5">
                    <span className="text-gray-600 dark:text-gray-400">
                      Taux de complétion
                    </span>
                    <div className="flex items-center gap-1.5">
                      <ComparisonBadge
                        change={comparison.completionRateChange}
                        hasPrevious={comparison.hasPreviousCompletionRate}
                        isPercentagePoints
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(stats.completionRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div
                    className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(stats.completionRate * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Taux de complétion"
                  >
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${stats.completionRate * 100}%` }}
                    />
                  </div>
                </div>

                {/* Avg Delivery Time */}
                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Temps moyen
                    </span>
                  </div>
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {stats.avgDeliveryTime.toFixed(0)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Top Zones - Compact */}
            {zoneStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                  Top zones
                </h3>
                <div className="space-y-1.5">
                  {zoneStats.slice(0, 3).map((zone, index) => (
                    <div key={zone.zone} className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-400"
                              : "bg-orange-400"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {zone.zone}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-primary-600 dark:text-primary-400">
                        {zone.earnings.toLocaleString()} F
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips - Compact */}
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2.5">
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-xs text-primary-900 dark:text-primary-300">
                    Conseil
                  </p>
                  <p className="text-[11px] text-primary-700 dark:text-primary-400">
                    {stats.acceptanceRate < 0.7
                      ? "Acceptez plus de courses pour améliorer votre taux."
                      : stats.avgDeliveryTime > 45
                        ? "Optimisez vos trajets pour réduire le temps."
                        : "Excellentes performances !"}
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
