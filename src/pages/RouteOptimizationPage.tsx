import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Route,
  Navigation,
  Clock,
  MapPin,
  TrendingDown,
  Check,
  ArrowRight,
  Loader2,
  Shuffle,
  Play,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import {
  optimizeRoute,
  getPendingDeliveries,
  formatDuration,
  formatDistance,
  DeliveryStop,
  OptimizedRoute,
} from '../services/routeOptimizationService';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import { hapticSuccess, hapticLight } from '../hooks/useHapticFeedback';

export default function RouteOptimizationPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const { position } = useLocation();
  const { showSuccess, showError } = useToast();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryStop[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (!driver) return;

    const driverId = driver.id;

    async function loadDeliveries() {
      setLoading(true);
      const data = await getPendingDeliveries(driverId);
      setDeliveries(data);
      setLoading(false);
    }

    loadDeliveries();
  }, [driver]);

  const handleOptimize = async () => {
    if (deliveries.length === 0) {
      showError('Aucune livraison à optimiser');
      return;
    }

    setOptimizing(true);
    hapticLight();

    // Simulate processing time for UX
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = optimizeRoute(
      deliveries,
      position
        ? { lat: position.lat, lng: position.lng }
        : undefined
    );

    setOptimizedRoute(result);
    setShowComparison(true);
    setOptimizing(false);
    hapticSuccess();

    if (result.savings.percentage > 0) {
      showSuccess(
        `Itinéraire optimisé ! Économie de ${result.savings.percentage}%`
      );
    }
  };

  const handleApplyRoute = () => {
    hapticSuccess();
    showSuccess('Itinéraire appliqué avec succès !');
    // In production, this would update the delivery order in the backend
    navigate('/');
  };

  const handleStartNavigation = () => {
    if (!optimizedRoute || optimizedRoute.stops.length === 0) return;

    const firstStop = optimizedRoute.stops[0];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${firstStop.lat},${firstStop.lng}`;
    window.open(url, '_blank');
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    normal: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white safe-top px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t.routeOptimization}</h1>
        </div>

        {/* Summary Stats */}
        {optimizedRoute && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <MapPin className="w-5 h-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{optimizedRoute.stops.length}</p>
              <p className="text-xs text-white/70">{t.stops}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Route className="w-5 h-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">
                {formatDistance(optimizedRoute.totalDistance)}
              </p>
              <p className="text-xs text-white/70">{t.distance}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">
                {formatDuration(optimizedRoute.totalDuration)}
              </p>
              <p className="text-xs text-white/70">{t.totalDuration}</p>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Aucune livraison en attente à optimiser
            </p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="mt-4"
            >
              Retour au tableau de bord
            </Button>
          </div>
        ) : (
          <>
            {/* Savings Card */}
            {optimizedRoute && optimizedRoute.savings.percentage > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      {t.savingsEstimate}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {formatDistance(optimizedRoute.savings.distance)} • {formatDuration(optimizedRoute.savings.time)}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    -{optimizedRoute.savings.percentage}%
                  </div>
                </div>
              </div>
            )}

            {/* Optimize Button */}
            {!optimizedRoute && (
              <div className="mb-4">
                <Button
                  onClick={handleOptimize}
                  loading={optimizing}
                  fullWidth
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Shuffle className="w-5 h-5 mr-2" />
                  {t.optimizeRoute}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  {deliveries.length} livraisons à optimiser
                </p>
              </div>
            )}

            {/* Route List */}
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                {optimizedRoute ? t.suggestedOrder : t.currentOrder}
              </h3>

              {(optimizedRoute ? optimizedRoute.stops : deliveries).map(
                (stop, index) => (
                  <div key={stop.id}>
                    {/* Stop Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        {/* Index Circle */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Stop Details */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {stop.name}
                            </p>
                            {stop.priority && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  priorityColors[stop.priority]
                                }`}
                              >
                                {stop.priority === 'high'
                                  ? 'Urgent'
                                  : stop.priority === 'low'
                                  ? 'Normal'
                                  : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {stop.address}
                          </p>

                          {/* Segment info */}
                          {optimizedRoute && index < optimizedRoute.segments.length && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Route className="w-3 h-3" />
                                {formatDistance(
                                  optimizedRoute.segments[index].distance
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(
                                  optimizedRoute.segments[index].duration
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrow between stops */}
                    {index < (optimizedRoute ? optimizedRoute.stops : deliveries).length - 1 && (
                      <div className="flex justify-center py-1">
                        <div className="w-8 h-8 flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Location Warning */}
            {!position && (
              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    Position non disponible
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Activez la localisation pour un itinéraire plus précis
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Actions */}
      {optimizedRoute && optimizedRoute.stops.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 safe-bottom">
          <div className="flex gap-3">
            <Button
              onClick={handleStartNavigation}
              variant="outline"
              className="flex-1"
            >
              <Navigation className="w-5 h-5 mr-2" />
              {t.navigate}
            </Button>
            <Button
              onClick={handleApplyRoute}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <Check className="w-5 h-5 mr-2" />
              {t.applyOptimization}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
