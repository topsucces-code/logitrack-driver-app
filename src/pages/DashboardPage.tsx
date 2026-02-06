import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Wallet,
  Star,
  Clock,
  Navigation,
  RefreshCw,
  User,
  Settings,
  Zap,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase, Delivery, calculateRating } from '../lib/supabase';
import { startOfWeek } from 'date-fns';
import { DELIVERY_CONFIG } from '../config/app.config';
import { useToast } from '../contexts/ToastContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { DeliveryCardSkeleton } from '../components/ui/Skeleton';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { driver, refreshDriver, isVerified } = useAuth();
  const { startTracking } = useLocation();
  const { showError } = useToast();

  const [isOnline, setIsOnline] = useState(driver?.is_online ?? false);
  const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [todayStats, setTodayStats] = useState({ deliveries: 0, earnings: 0 });
  const [weekStats, setWeekStats] = useState({ deliveries: 0, earnings: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get greeting based on time
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  // Fetch deliveries
  const fetchDeliveries = useCallback(async () => {
    if (!driver) return;

    try {
      // Get current delivery (assigned to driver)
      const { data: current } = await supabase
        .from('logitrack_deliveries')
        .select('*')
        .eq('driver_id', driver.id)
        .in('status', ['accepted', 'picking_up', 'picked_up', 'in_transit', 'delivering'])
        .maybeSingle();

      setCurrentDelivery(current as Delivery | null);

      // Get pending deliveries (available for pickup)
      if (!current) {
        // Build query based on driver's zones and company
        let query = supabase
          .from('logitrack_deliveries')
          .select('*')
          .in('status', ['pending', 'assigned'])
          .is('driver_id', null)
          .order('created_at', { ascending: false });

        // If driver belongs to a company, only show company deliveries
        if (driver.company_id) {
          query = query.eq('company_id', driver.company_id);
        }

        query = query.limit(DELIVERY_CONFIG.defaultListLimit);

        const { data: pending } = await query;
        setPendingDeliveries((pending as Delivery[]) || []);
      } else {
        setPendingDeliveries([]);
      }

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayDeliveries } = await supabase
        .from('logitrack_deliveries')
        .select('driver_earnings')
        .eq('driver_id', driver.id)
        .in('status', ['delivered', 'completed'])
        .gte('delivered_at', today.toISOString());

      if (todayDeliveries) {
        setTodayStats({
          deliveries: todayDeliveries.length,
          earnings: todayDeliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0),
        });
      }

      // Get week stats
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

      const { data: weekDeliveries } = await supabase
        .from('logitrack_deliveries')
        .select('driver_earnings')
        .eq('driver_id', driver.id)
        .in('status', ['delivered', 'completed'])
        .gte('delivered_at', weekStart.toISOString());

      if (weekDeliveries) {
        setWeekStats({
          deliveries: weekDeliveries.length,
          earnings: weekDeliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0),
        });
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driver]);

  // Initial fetch
  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Prefetch probable routes after 3 seconds on dashboard
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./DeliveryDetailPage');
      import('./EarningsPage');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to realtime updates with graceful cleanup
  useRealtimeSubscription({
    channelName: 'logitrack-deliveries-updates',
    table: 'logitrack_deliveries',
    onPayload: useCallback(() => {
      fetchDeliveries();
    }, [fetchDeliveries]),
  });

  // Sync isOnline state with driver
  useEffect(() => {
    if (driver) {
      setIsOnline(driver.is_online);
    }
  }, [driver?.is_online]);

  // Toggle online status
  async function toggleOnline() {
    if (!driver) return;

    const newIsOnline = !isOnline;

    // Start tracking if going online
    if (newIsOnline) {
      await startTracking();
    }

    const { error } = await supabase
      .from('logitrack_drivers')
      .update({
        is_online: newIsOnline,
        is_available: newIsOnline,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', driver.id);

    if (!error) {
      setIsOnline(newIsOnline);
      refreshDriver();
    }
  }

  // Accept delivery - stabilized with useCallback
  const acceptDelivery = useCallback(async (deliveryId: string) => {
    const { data, error } = await supabase.rpc('accept_logitrack_delivery', {
      p_delivery_id: deliveryId,
    });

    if (!error && data?.success) {
      fetchDeliveries();
      refreshDriver();
    } else {
      showError(error?.message || data?.error || 'Erreur lors de l\'acceptation');
    }
  }, [fetchDeliveries, refreshDriver, showError]);

  // Refresh
  function handleRefresh() {
    setRefreshing(true);
    fetchDeliveries();
  }

  if (!driver) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate rating from rating_sum and rating_count
  const driverRating = calculateRating(driver.rating_sum, driver.rating_count);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-primary-500 text-white safe-top px-3 pt-3 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
              {driver.photo_url ? (
                <img
                  src={driver.photo_url}
                  alt={driver.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {getGreeting()} {driver.full_name.split(' ')[0]} 👋
              </p>
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{driverRating.toFixed(1)}</span>
                <span>•</span>
                <span>{driver.total_deliveries} livraisons</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              className={`p-2.5 bg-white/20 rounded-full ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2.5 bg-white/20 rounded-full"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Online Toggle */}
        <button
          onClick={toggleOnline}
          className={`w-full flex items-center justify-between rounded-lg p-3 transition-colors ${
            isOnline ? 'bg-green-500' : 'bg-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
            <span className="font-semibold text-sm">
              {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
            </span>
          </div>
          <div className={`w-10 h-6 rounded-full relative transition-colors ${
            isOnline ? 'bg-green-600' : 'bg-white/30'
          }`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow ${
              isOnline ? 'left-[18px]' : 'left-0.5'
            }`} />
          </div>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 -mt-1">
        {/* Earnings Card */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Aujourd'hui</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/wallet')}
                className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full flex items-center gap-1"
              >
                <Wallet className="w-3 h-3" />
                Portefeuille
              </button>
              <button
                onClick={() => navigate('/earnings')}
                className="text-primary-600 text-xs font-medium flex items-center gap-0.5"
              >
                Voir tout
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-primary-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary-600">
                {todayStats.earnings.toLocaleString()}
              </p>
              <p className="text-xs text-primary-700 font-medium">FCFA</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{todayStats.deliveries}</p>
              <p className="text-xs text-gray-600 font-medium">courses</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-gray-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Cette semaine</span>
            </div>
            <span className="font-bold text-gray-900">
              {weekStats.earnings.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        {/* Current Delivery */}
        {currentDelivery && (
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary-500" />
              Course en cours
            </h2>
            <button
              onClick={() => navigate(`/delivery/${currentDelivery.id}`)}
              className="w-full bg-primary-50 border-2 border-primary-500 rounded-xl p-3 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 bg-primary-500 text-white text-[10px] font-medium rounded-full">
                  {currentDelivery.status === 'accepted' && '📍 Assignée'}
                  {currentDelivery.status === 'picking_up' && '🚀 En route pickup'}
                  {currentDelivery.status === 'picked_up' && '📦 Colis récupéré'}
                  {currentDelivery.status === 'in_transit' && '🚗 En transit'}
                  {currentDelivery.status === 'delivering' && '🏃 En livraison'}
                </span>
                {currentDelivery.is_express && (
                  <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
                    <Zap className="w-4 h-4" />
                    Express
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="font-medium text-gray-900 text-xs truncate">
                  {currentDelivery.pickup_contact_name || currentDelivery.vendor_name || 'Pickup'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <p className="font-medium text-gray-900 text-xs truncate">
                  {currentDelivery.delivery_contact_name || 'Destination'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-primary-200">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {currentDelivery.distance_km?.toFixed(1)} km
                  </span>
                </div>
                <p className="font-bold text-primary-600 text-base">
                  {currentDelivery.driver_earnings?.toLocaleString()} F
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Available Deliveries */}
        {!currentDelivery && (
          <>
            <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-gray-400" />
              Courses disponibles
              {pendingDeliveries.length > 0 && (
                <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {pendingDeliveries.length}
                </span>
              )}
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <DeliveryCardSkeleton key={i} />
                ))}
              </div>
            ) : pendingDeliveries.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-900 font-medium text-sm mb-1">Aucune course disponible</p>
                <p className="text-xs text-gray-500">
                  {isOnline
                    ? 'Restez connecté, les nouvelles courses apparaîtront ici'
                    : 'Passez en ligne pour voir les courses'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-24">
                {pendingDeliveries.map((delivery) => (
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    onAccept={() => acceptDelivery(delivery.id)}
                    onViewDetails={() => navigate(`/delivery/${delivery.id}`)}
                    disabled={!isOnline || !isVerified}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Not verified warning */}
        {!isVerified && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-yellow-800 font-medium text-sm">⏳ Compte en attente de vérification</p>
            <p className="text-xs text-yellow-700 mt-1">
              Votre compte est en cours de vérification. Vous pourrez accepter des courses une fois vérifié.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 safe-bottom fixed bottom-0 left-0 right-0">
        <div className="flex items-center justify-around py-2">
          <NavItem icon={<Package />} label="Courses" active onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <NavItem
            icon={<Wallet />}
            label="Gains"
            onClick={() => navigate('/earnings')}
          />
          <NavItem
            icon={<User />}
            label="Profil"
            onClick={() => navigate('/profile')}
          />
        </div>
      </nav>
    </div>
  );
}

// Delivery Card Component
const DeliveryCard = memo(function DeliveryCard({
  delivery,
  onAccept,
  onViewDetails,
  disabled,
}: {
  delivery: Delivery;
  onAccept: () => void;
  onViewDetails: () => void;
  disabled: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState('');

  // Calculate time since creation (simulate expiry countdown)
  useEffect(() => {
    const updateTime = () => {
      const created = new Date(delivery.created_at);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffMin = Math.floor(diffMs / 60000);

      // Use configured expiry window
      const expiryMin = DELIVERY_CONFIG.expiryMinutes - diffMin;
      if (expiryMin > 0) {
        const min = Math.floor(expiryMin);
        const sec = Math.floor((expiryMin - min) * 60);
        setTimeLeft(`${min}:${sec.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [delivery.created_at]);

  // Extract zone names from addresses
  const pickupZone = delivery.pickup_address?.split(',')[0] || delivery.pickup_contact_name || 'Pickup';
  const deliveryZone = delivery.delivery_address?.split(',')[0] || delivery.delivery_contact_name || 'Destination';

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📦</span>
          <span className="font-semibold text-gray-900 text-sm">Nouvelle course !</span>
        </div>
        <div className="flex items-center gap-1.5">
          {delivery.is_express && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-medium rounded-full">
              <Zap className="w-3 h-3" />
              Express
            </span>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="mb-2">
        <p className="text-gray-900 font-medium text-sm">
          {pickupZone} → {deliveryZone}
        </p>
      </div>

      {/* Details */}
      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
        <span className="flex items-center gap-1">
          <Navigation className="w-3.5 h-3.5" />
          ~{delivery.distance_km?.toFixed(0) || '?'} km
        </span>
        <span className="font-bold text-primary-600">
          Gain : {delivery.driver_earnings?.toLocaleString()} FCFA
        </span>
      </div>

      {/* Timer */}
      {timeLeft && (
        <div className="flex items-center gap-1.5 text-xs text-orange-600 mb-2.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Expire dans {timeLeft}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 py-2 border border-gray-300 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          VOIR DÉTAILS
        </button>
        <button
          onClick={onAccept}
          disabled={disabled}
          className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ACCEPTER
        </button>
      </div>
    </div>
  );
});

// Navigation Item
const NavItem = memo(function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-6 py-2 ${
        active ? 'text-primary-600' : 'text-gray-400'
      }`}
    >
      <span className={active ? 'text-primary-600' : ''}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
});
