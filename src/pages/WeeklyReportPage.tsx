import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { getWeeklyReport, formatReportForSharing, WeeklyReport } from '../services/reportsService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight } from '../hooks/useHapticFeedback';

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
      const { report: data, error } = await getWeeklyReport(driverId, weekOffset);

      if (error) {
        showError('Erreur lors du chargement du rapport');
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
        showSuccess('Rapport partagé');
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      showSuccess('Rapport copié dans le presse-papier');
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  };

  const maxDailyEarnings = report
    ? Math.max(...report.dailyStats.map((d) => d.earnings), 1)
    : 1;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Rapport Hebdomadaire
          </h1>
        </div>
      </header>

      {/* Week Selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevWeek}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Semaine</p>
            {report && (
              <p className="font-semibold text-gray-900 dark:text-white">
                {report.startDate} - {report.endDate}
              </p>
            )}
          </div>

          <button
            onClick={handleNextWeek}
            disabled={weekOffset === 0}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : report ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Livraisons</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.totalDeliveries}
                </p>
                {report.comparison.deliveriesChange !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs mt-1 ${
                      report.comparison.deliveriesChange >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {report.comparison.deliveriesChange >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {report.comparison.deliveriesChange > 0 ? '+' : ''}
                    {report.comparison.deliveriesChange}%
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Gains</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.totalEarnings.toLocaleString()}
                  <span className="text-sm font-normal ml-1">FCFA</span>
                </p>
                {report.comparison.earningsChange !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs mt-1 ${
                      report.comparison.earningsChange >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {report.comparison.earningsChange >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {report.comparison.earningsChange > 0 ? '+' : ''}
                    {report.comparison.earningsChange}%
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Distance</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.totalDistance}
                  <span className="text-sm font-normal ml-1">km</span>
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Note moy.</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.avgRating || '-'}
                  <span className="text-sm font-normal ml-1">/5</span>
                </p>
              </div>
            </div>

            {/* Daily Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Gains journaliers
              </h3>
              <div className="flex items-end justify-between gap-2 h-32">
                {report.dailyStats.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {day.earnings > 0
                          ? `${Math.round(day.earnings / 1000)}k`
                          : '-'}
                      </span>
                      <div
                        className="w-full bg-primary-500 rounded-t"
                        style={{
                          height: `${(day.earnings / maxDailyEarnings) * 80}px`,
                          minHeight: day.earnings > 0 ? '8px' : '2px',
                          backgroundColor:
                            day.earnings === 0 ? '#e5e7eb' : undefined,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {getDayName(day.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Insights
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Jour le plus actif
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {report.busyDay}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Clock className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Heure de pointe
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {report.peakHour}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Zone principale
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {report.topZone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <Wallet className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Moyenne par livraison
                    </p>
                    <p className="font-medium text-primary-600 dark:text-primary-400">
                      {report.avgEarningsPerDelivery.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Aucun rapport disponible</p>
          </div>
        )}
      </div>

      {/* Share Button */}
      {report && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 safe-bottom">
          <Button onClick={handleShare} fullWidth icon={<Share2 className="w-5 h-5" />}>
            Partager le rapport
          </Button>
        </div>
      )}
    </div>
  );
}
