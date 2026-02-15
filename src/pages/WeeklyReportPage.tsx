import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Package,
  Wallet,
  MapPin,
  Star,
  Calendar,
  Clock,
  Share2,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  getWeeklyReport,
  formatReportForSharing,
  WeeklyReport,
} from "../services/reportsService";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { hapticLight } from "../hooks/useHapticFeedback";

export default function WeeklyReportPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const { showSuccess, showError } = useToast();

  const [weekOffset, setWeekOffset] = useState(0);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driver) return;

    const driverId = driver.id;

    async function loadReport() {
      setLoading(true);
      const { report: data, error } = await getWeeklyReport(
        driverId,
        weekOffset,
      );

      if (error) {
        showError("Erreur lors du chargement du rapport");
      } else {
        setReport(data);
      }
      setLoading(false);
    }

    loadReport();
  }, [driver, weekOffset, showError]);

  const handlePrevWeek = () => {
    hapticLight();
    setWeekOffset((prev) => prev + 1);
  };

  const handleNextWeek = () => {
    hapticLight();
    if (weekOffset > 0) {
      setWeekOffset((prev) => prev - 1);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    hapticLight();

    const text = formatReportForSharing(report);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        showSuccess("Rapport partagé");
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      showSuccess("Rapport copié dans le presse-papier");
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  };

  const maxDailyEarnings = report
    ? Math.max(...report.dailyStats.map((d) => d.earnings), 1)
    : 1;

  return (
    <div className="h-mobile-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - Compact */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Rapport
          </h1>
        </div>
      </header>

      {/* Week Selector - Compact */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevWeek}
            aria-label="Semaine précédente"
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="text-center">
            {report && (
              <p className="font-medium text-sm text-gray-900 dark:text-white">
                {report.startDate} - {report.endDate}
              </p>
            )}
          </div>

          <button
            onClick={handleNextWeek}
            disabled={weekOffset === 0}
            aria-label="Semaine suivante"
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-20 space-y-3">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : report ? (
          <>
            {/* Summary Cards - Compact 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Livraisons
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {report.totalDeliveries}
                </p>
                {report.comparison.deliveriesChange !== 0 && (
                  <div
                    className={`flex items-center gap-0.5 text-[10px] ${
                      report.comparison.deliveriesChange >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {report.comparison.deliveriesChange >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {report.comparison.deliveriesChange > 0 ? "+" : ""}
                    {report.comparison.deliveriesChange}%
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Gains
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {report.totalEarnings.toLocaleString()}
                  <span className="text-xs font-normal ml-0.5">F</span>
                </p>
                {report.comparison.earningsChange !== 0 && (
                  <div
                    className={`flex items-center gap-0.5 text-[10px] ${
                      report.comparison.earningsChange >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {report.comparison.earningsChange >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {report.comparison.earningsChange > 0 ? "+" : ""}
                    {report.comparison.earningsChange}%
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Distance
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {report.totalDistance}
                  <span className="text-xs font-normal ml-0.5">km</span>
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Note
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {report.avgRating || "-"}
                  <span className="text-xs font-normal ml-0.5">/5</span>
                </p>
              </div>
            </div>

            {/* Daily Chart - Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                Gains/jour
              </h3>
              <div className="flex items-end justify-between gap-1 h-20">
                {report.dailyStats.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div className="w-full flex flex-col items-center">
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">
                        {day.earnings > 0
                          ? `${Math.round(day.earnings / 1000)}k`
                          : ""}
                      </span>
                      <div
                        className="w-full bg-primary-500 rounded-t"
                        style={{
                          height: `${(day.earnings / maxDailyEarnings) * 50}px`,
                          minHeight: day.earnings > 0 ? "4px" : "2px",
                          backgroundColor:
                            day.earnings === 0 ? "#e5e7eb" : undefined,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-1">
                      {getDayName(day.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights - Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                Insights
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Jour actif
                    </p>
                    <p className="font-medium text-xs text-gray-900 dark:text-white capitalize truncate">
                      {report.busyDay}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Clock className="w-4 h-4 text-primary-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Heure pointe
                    </p>
                    <p className="font-medium text-xs text-gray-900 dark:text-white truncate">
                      {report.peakHour}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Zone top
                    </p>
                    <p className="font-medium text-xs text-gray-900 dark:text-white truncate">
                      {report.topZone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <Wallet className="w-4 h-4 text-primary-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Moy/liv.
                    </p>
                    <p className="font-medium text-xs text-primary-600 dark:text-primary-400">
                      {report.avgEarningsPerDelivery.toLocaleString()} F
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-gray-500">Aucun rapport disponible</p>
          </div>
        )}
      </div>

      {/* Share Button - Compact */}
      {report && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 safe-bottom flex-shrink-0">
          <button
            onClick={handleShare}
            className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm">Partager</span>
          </button>
        </div>
      )}
    </div>
  );
}
