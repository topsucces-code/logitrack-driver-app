import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Package,
  Navigation,
  Clock,
  Filter,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Delivery } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

type FilterPeriod = 'week' | 'month' | 'all';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    cancelled: 0,
    totalEarnings: 0,
    totalDistance: 0,
  });

  useEffect(() => {
    if (!driver) return;
    fetchHistory();
  }, [driver, filterPeriod]);

  async function fetchHistory() {
    if (!driver) return;
    setLoading(true);

    let query = supabase
      .from('logitrack_deliveries')
      .select('*')
      .eq('driver_id', driver.id)
      .in('status', ['delivered', 'completed', 'cancelled', 'failed'])
      .order('created_at', { ascending: false });

    // Apply date filter
    const now = new Date();
    if (filterPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', weekAgo.toISOString());
    } else if (filterPeriod === 'month') {
      const monthStart = startOfMonth(now);
      query = query.gte('created_at', monthStart.toISOString());
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      const deliveryList = (data as Delivery[]) || [];
      setDeliveries(deliveryList);

      // Calculate stats
      const delivered = deliveryList.filter(d => d.status === 'delivered' || d.status === 'completed');
      const cancelled = deliveryList.filter(d => d.status === 'cancelled' || d.status === 'failed');

      setStats({
        total: deliveryList.length,
        delivered: delivered.length,
        cancelled: cancelled.length,
        totalEarnings: delivered.reduce((sum, d) => sum + (d.driver_earnings || 0), 0),
        totalDistance: delivered.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0),
      });
    }

    setLoading(false);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'delivered':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Livrée
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Annulée
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Échouée
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 safe-top px-4 py-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Historique</h1>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-2">
            {[
              { value: 'week', label: '7 jours' },
              { value: 'month', label: 'Ce mois' },
              { value: 'all', label: 'Tout' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterPeriod(option.value as FilterPeriod)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filterPeriod === option.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500">Livraisons</p>
            <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
            <p className="text-xs text-gray-400">
              {stats.cancelled > 0 && `+${stats.cancelled} annulées`}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500">Gains</p>
            <p className="text-2xl font-bold text-primary-600">
              {stats.totalEarnings.toLocaleString()} F
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500">Distance</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalDistance.toFixed(1)} km
            </p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500">Taux réussite</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(0) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune livraison dans l'historique</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(delivery.created_at), 'dd MMM yyyy, HH:mm', {
                      locale: fr,
                    })}
                  </div>
                  {getStatusBadge(delivery.status)}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-1">
                      {delivery.pickup_address}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-red-600" />
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-1">
                      {delivery.delivery_address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {delivery.distance_km?.toFixed(1)} km
                    </span>
                    {delivery.delivered_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(delivery.delivered_at), 'HH:mm', { locale: fr })}
                      </span>
                    )}
                  </div>
                  {(delivery.status === 'delivered' || delivery.status === 'completed') && (
                    <p className="font-bold text-green-600">
                      +{delivery.driver_earnings?.toLocaleString()} F
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
