import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryLogger } from '../utils/logger';
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
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Delivery } from '../lib/supabase';
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DELIVERY_CONFIG } from '../config/app.config';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/PullToRefreshIndicator';

type FilterPeriod = 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'delivered' | 'cancelled' | 'in_progress';

const PAGE_SIZE = DELIVERY_CONFIG.historyPageSize;

export default function HistoryPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    cancelled: 0,
    totalEarnings: 0,
    totalDistance: 0,
  });

  // Search & filter state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setIsDebouncing(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchQuery(value.trim().toLowerCase());
      setIsDebouncing(false);
    }, 300);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Client-side filtered deliveries
  const filteredDeliveries = useMemo(() => {
    let result = deliveries;

    // Status filter
    if (statusFilter === 'delivered') {
      result = result.filter(d => d.status === 'delivered' || d.status === 'completed');
    } else if (statusFilter === 'cancelled') {
      result = result.filter(d => d.status === 'cancelled' || d.status === 'failed');
    } else if (statusFilter === 'in_progress') {
      result = result.filter(d => !['delivered', 'completed', 'cancelled', 'failed'].includes(d.status));
    }

    // Search filter
    if (searchQuery) {
      result = result.filter(d => {
        const trackingCode = (d.tracking_code || '').toLowerCase();
        const pickupContact = (d.pickup_contact_name || '').toLowerCase();
        const deliveryContact = (d.delivery_contact_name || '').toLowerCase();
        const pickupAddress = (d.pickup_address || '').toLowerCase();
        const deliveryAddress = (d.delivery_address || '').toLowerCase();

        return (
          trackingCode.includes(searchQuery) ||
          pickupContact.includes(searchQuery) ||
          deliveryContact.includes(searchQuery) ||
          pickupAddress.includes(searchQuery) ||
          deliveryAddress.includes(searchQuery)
        );
      });
    }

    return result;
  }, [deliveries, searchQuery, statusFilter]);

  const hasActiveFilters = searchInput.trim() !== '' || statusFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('all');
    setIsDebouncing(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  const buildQuery = useCallback((cursor?: string) => {
    if (!driver) return null;

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

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    return query.limit(PAGE_SIZE);
  }, [driver, filterPeriod]);

  // Fetch history data
  const fetchHistory = useCallback(async () => {
    if (!driver) return;

    setLoading(true);
    setDeliveries([]);
    setHasMore(true);

    const query = buildQuery();
    if (!query) return;

    const { data, error } = await query;

    if (error) {
      deliveryLogger.error('Error fetching history', { error });
    } else {
      const deliveryList = (data as Delivery[]) || [];
      setDeliveries(deliveryList);
      setHasMore(deliveryList.length === PAGE_SIZE);

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
  }, [driver, buildQuery]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, filterPeriod]);

  // Pull-to-refresh
  const { pullDistance, pullState, pullToRefreshProps } = usePullToRefresh({
    onRefresh: fetchHistory,
  });

  // Load more
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || deliveries.length === 0) return;

    setLoadingMore(true);

    const lastItem = deliveries[deliveries.length - 1];
    const cursor = lastItem.created_at;
    const query = buildQuery(cursor);

    if (!query) {
      setLoadingMore(false);
      return;
    }

    const { data, error } = await query;

    if (error) {
      deliveryLogger.error('Error loading more', { error });
    } else {
      const newItems = (data as Delivery[]) || [];
      setDeliveries(prev => [...prev, ...newItems]);
      setHasMore(newItems.length === PAGE_SIZE);

      // Update stats with new items
      if (newItems.length > 0) {
        setStats(prev => {
          const delivered = newItems.filter(d => d.status === 'delivered' || d.status === 'completed');
          const cancelled = newItems.filter(d => d.status === 'cancelled' || d.status === 'failed');
          return {
            total: prev.total + newItems.length,
            delivered: prev.delivered + delivered.length,
            cancelled: prev.cancelled + cancelled.length,
            totalEarnings: prev.totalEarnings + delivered.reduce((sum, d) => sum + (d.driver_earnings || 0), 0),
            totalDistance: prev.totalDistance + delivered.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0),
          };
        });
      }
    }

    setLoadingMore(false);
  }, [loadingMore, hasMore, deliveries, buildQuery]);

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
      <header className="bg-white border-b border-gray-200 safe-top px-3 py-2.5">
        <div className="flex items-center gap-2.5 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Historique</h1>
        </div>

        {/* Period filter */}
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
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
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

        {/* Search input */}
        <div className="relative mt-2.5">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isDebouncing ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Code, client, adresse..."
            className="w-full pl-9 pr-8 py-2.5 rounded-lg text-sm bg-gray-100 border-none outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-gray-400"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
          {([
            { value: 'all', label: 'Toutes' },
            { value: 'delivered', label: 'Livr\u00e9es' },
            { value: 'cancelled', label: 'Annul\u00e9es' },
            { value: 'in_progress', label: 'En cours' },
          ] as const).map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === option.value
                  ? option.value === 'delivered'
                    ? 'bg-green-100 text-green-700'
                    : option.value === 'cancelled'
                    ? 'bg-red-100 text-red-700'
                    : option.value === 'in_progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {/* Scrollable content with pull-to-refresh */}
      <div className="flex-1 overflow-y-auto" {...pullToRefreshProps}>
        <PullToRefreshIndicator pullDistance={pullDistance} pullState={pullState} />

        {/* Stats */}
        <div className="px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Livraisons</p>
            <p className="text-xl font-bold text-gray-900">{stats.delivered}</p>
            <p className="text-xs text-gray-400">
              {stats.cancelled > 0 && `+${stats.cancelled} annulées`}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Gains</p>
            <p className="text-xl font-bold text-primary-600">
              {stats.totalEarnings.toLocaleString()} F
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Distance</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.totalDistance.toFixed(1)} km
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Taux réussite</p>
            <p className="text-xl font-bold text-green-600">
              {stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(0) : 0}%
            </p>
          </div>
        </div>
      </div>

        {/* Result count & clear filters */}
        {!loading && hasActiveFilters && (
          <div className="px-3 pt-1 pb-0 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {filteredDeliveries.length} livraison{filteredDeliveries.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-colors"
            >
              <X className="w-3 h-3" />
              Effacer filtres
            </button>
          </div>
        )}

        {/* List */}
        <div className="px-3 pb-3">
          {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {hasActiveFilters
                ? 'Aucune livraison ne correspond aux filtres'
                : 'Aucune livraison dans l\u2019historique'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDeliveries.map((delivery) => (
              <div key={delivery.id} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(delivery.created_at), 'dd MMM yyyy, HH:mm', {
                      locale: fr,
                    })}
                  </div>
                  {getStatusBadge(delivery.status)}
                </div>

                <div className="space-y-1.5 mb-2">
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

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
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

            {/* Load more button */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 bg-white rounded-lg text-primary-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Charger plus'
                )}
              </button>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
