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
  X,
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
import { supabase } from '../lib/supabase';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  const [applying, setApplying] = useState(false);

  const handleApplyRoute = async () => {
    if (!optimizedRoute) return;
    setApplying(true);

    try {
      const updates = optimizedRoute.stops.map((stop, index) =>
        supabase
          .from('logitrack_deliveries')
          .update({ route_position: index + 1 })
          .eq('id', stop.id)
      );

      const results = await Promise.all(updates);
      const failed = results.filter(r => r.error);

      if (failed.length > 0) {
        showError(`Erreur: ${failed.length} livraison(s) non mises à jour`);
      } else {
        hapticSuccess();
        showSuccess('Itinéraire appliqué avec succès !');
        navigate('/');
      }
    } catch (err) {
      showError('Erreur lors de la sauvegarde de l\'itinéraire');
    } finally {
      setApplying(false);
    }
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
      {/* Header - Compact */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white safe-top px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">{t.routeOptimization}</h1>
        </div>

        {/* Summary Stats - Compact */}
        {optimizedRoute && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <MapPin className="w-4 h-4 mx-auto" />
              <p className="text-lg font-bold">{optimizedRoute.stops.length}</p>
              <p className="text-[10px] text-white/70">{t.stops}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <Route className="w-4 h-4 mx-auto" />
              <p className="text-lg font-bold">
                {formatDistance(optimizedRoute.totalDistance)}
              </p>
              <p className="text-[10px] text-white/70">{t.distance}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <Clock className="w-4 h-4 mx-auto" />
              <p className="text-lg font-bold">
                {formatDuration(optimizedRoute.totalDuration)}
              </p>
              <p className="text-[10px] text-white/70">{t.totalDuration}</p>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 pb-20">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Aucune livraison en attente
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-3 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              Retour
            </button>
          </div>
        ) : (
          <>
            {/* Savings Card - Compact */}
            {optimizedRoute && optimizedRoute.savings.percentage > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-green-800 dark:text-green-300">
                      {t.savingsEstimate}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {formatDistance(optimizedRoute.savings.distance)} • {formatDuration(optimizedRoute.savings.time)}
                    </p>
                  </div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    -{optimizedRoute.savings.percentage}%
                  </div>
                </div>
              </div>
            )}

            {/* Optimize Button - Compact */}
            {!optimizedRoute && (
              <div className="mb-3">
                <button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {optimizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shuffle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{t.optimizeRoute}</span>
                </button>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1">
                  {deliveries.length} livraisons
                </p>
              </div>
            )}

            {/* Route List - Compact */}
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                {optimizedRoute ? t.suggestedOrder : t.currentOrder}
              </h3>

              {(optimizedRoute ? optimizedRoute.stops : deliveries).map(
                (stop, index) => (
                  <div key={stop.id} className="mb-1">
                    {/* Stop Card - Compact */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
                      <div className="flex items-start gap-2">
                        {/* Index Circle */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            index === 0
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Stop Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {stop.name}
                            </p>
                            {stop.priority && stop.priority !== 'normal' && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                  priorityColors[stop.priority]
                                }`}
                              >
                                {stop.priority === 'high' ? '!' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {stop.address}
                          </p>

                          {/* Segment info */}
                          {optimizedRoute && index < optimizedRoute.segments.length && (
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-0.5">
                                <Route className="w-3 h-3" />
                                {formatDistance(optimizedRoute.segments[index].distance)}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {formatDuration(optimizedRoute.segments[index].duration)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrow between stops - smaller */}
                    {index < (optimizedRoute ? optimizedRoute.stops : deliveries).length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowRight className="w-3 h-3 text-gray-300 rotate-90" />
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Location Warning - Compact */}
            {!position && (
              <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Activez la localisation pour un itinéraire plus précis
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Actions - Compact */}
      {optimizedRoute && optimizedRoute.stops.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 safe-bottom flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleStartNavigation}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center gap-1 text-sm"
            >
              <Navigation className="w-4 h-4" />
              {t.navigate}
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-1 text-sm"
            >
              <Check className="w-4 h-4" />
              {t.applyOptimization}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && optimizedRoute && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => !applying && setShowConfirmModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal */}
          <div
            className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-lg max-h-[85vh] flex flex-col animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Confirmer le changement d'itinéraire
              </h2>
              <button
                onClick={() => !applying && setShowConfirmModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-3 py-2.5">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Livraisons</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {optimizedRoute.stops.length}
                  </p>
                </div>
                {optimizedRoute.savings.time > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400">Temps économisé</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatDuration(optimizedRoute.savings.time)}
                    </p>
                  </div>
                )}
              </div>

              {/* New delivery order */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                  Nouvel ordre de livraison
                </p>
                <div className="space-y-1">
                  {optimizedRoute.stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5"
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          index === 0
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {stop.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {stop.address}
                        </p>
                      </div>
                      {stop.priority === 'high' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
                          !
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Cette action va modifier l'ordre de vos livraisons.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={applying}
                className="flex-1 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleApplyRoute}
                disabled={applying}
                className="flex-1 py-2.5 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {applying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {applying ? 'Application...' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
