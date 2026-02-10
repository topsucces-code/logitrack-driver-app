import { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Search,
  Clock,
  Star,
  Package,
  CheckCircle2,
  X,
  Navigation,
  Phone,
  Percent,
  Box,
  Lock,
  Filter,
} from 'lucide-react';
import {
  RelayPoint,
  RELAY_POINT_CATEGORIES,
  RELAY_POINTS,
  searchRelayPoints,
  getNearestRelayPoints,
  get24hRelayPoints,
  getRelayPointsWithLockers,
  isRelayPointOpen,
  RelayPointType,
} from '../data/relayPoints';

interface RelayPointSelectorProps {
  value?: string;
  onChange: (relayPointId: string, relayPoint: RelayPoint) => void;
  onClose?: () => void;
  userLocation?: { lat: number; lng: number };
}

type FilterType = 'all' | 'nearby' | '24h' | 'locker';

export function RelayPointSelector({
  value,
  onChange,
  onClose,
  userLocation,
}: RelayPointSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<RelayPointType | 'all'>('all');

  const filteredPoints = useMemo(() => {
    let points = RELAY_POINTS.filter(rp => rp.isActive);

    // Filtre par recherche
    if (searchQuery.length > 1) {
      points = searchRelayPoints(searchQuery);
    }

    // Filtre par type
    if (typeFilter !== 'all') {
      points = points.filter(rp => rp.type === typeFilter);
    }

    // Filtre par catégorie
    switch (filter) {
      case 'nearby':
        if (userLocation) {
          points = getNearestRelayPoints(userLocation.lat, userLocation.lng, 20);
        }
        break;
      case '24h':
        points = points.filter(rp => rp.isOpen24h);
        break;
      case 'locker':
        points = points.filter(rp => rp.hasLocker);
        break;
    }

    return points;
  }, [searchQuery, filter, typeFilter, userLocation]);

  const handleSelect = (relayPoint: RelayPoint) => {
    onChange(relayPoint.id, relayPoint);
    onClose?.();
  };

  return (
    <div className="bg-white dark:bg-gray-900 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Points Relais
          </h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un point relais..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <FilterChip
            label="Tous"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterChip
            label="À proximité"
            icon={<Navigation className="w-3 h-3" />}
            active={filter === 'nearby'}
            onClick={() => setFilter('nearby')}
          />
          <FilterChip
            label="24h/24"
            icon={<Clock className="w-3 h-3" />}
            active={filter === '24h'}
            onClick={() => setFilter('24h')}
          />
          <FilterChip
            label="Casiers"
            icon={<Lock className="w-3 h-3" />}
            active={filter === 'locker'}
            onClick={() => setFilter('locker')}
          />
        </div>

        {/* Type Filters */}
        <div className="flex gap-2 overflow-x-auto pt-2 -mx-4 px-4">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              typeFilter === 'all'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Tous types
          </button>
          {RELAY_POINT_CATEGORIES.map(cat => (
            <button
              key={cat.type}
              onClick={() => setTypeFilter(cat.type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                typeFilter === cat.type
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {filteredPoints.length} point(s) relais trouvé(s)
        </p>

        <div className="space-y-3">
          {filteredPoints.map(point => (
            <RelayPointCard
              key={point.id}
              relayPoint={point}
              isSelected={value === point.id}
              onClick={() => handleSelect(point)}
            />
          ))}
        </div>

        {filteredPoints.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucun point relais trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Filter Chip Component
function FilterChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Relay Point Card Component
function RelayPointCard({
  relayPoint,
  isSelected,
  onClick,
}: {
  relayPoint: RelayPoint;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isOpen = isRelayPointOpen(relayPoint);
  const category = RELAY_POINT_CATEGORIES.find(c => c.type === relayPoint.type);

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category?.icon}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {relayPoint.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {relayPoint.commune}
            </p>
          </div>
        </div>
        {isSelected && (
          <CheckCircle2 className="w-5 h-5 text-primary-500" />
        )}
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 mb-2">
        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 dark:text-gray-300">{relayPoint.address}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Status */}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          isOpen
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        }`}>
          {isOpen ? 'Ouvert' : 'Fermé'}
        </span>

        {/* 24h */}
        {relayPoint.isOpen24h && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            24h/24
          </span>
        )}

        {/* Locker */}
        {relayPoint.hasLocker && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex items-center gap-0.5">
            <Lock className="w-2.5 h-2.5" />
            Casiers
          </span>
        )}

        {/* Discount */}
        {relayPoint.discount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 flex items-center gap-0.5">
            <Percent className="w-2.5 h-2.5" />
            -{relayPoint.discount}%
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {relayPoint.rating}
          </span>
          <span className="text-xs text-gray-400">
            ({relayPoint.totalReviews} avis)
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Box className="w-3.5 h-3.5" />
          Max {relayPoint.maxPackageWeight}kg
        </div>
      </div>
    </button>
  );
}

// Compact Badge for displaying selected relay point
export function RelayPointBadge({
  relayPointId,
  onRemove,
}: {
  relayPointId: string;
  onRemove?: () => void;
}) {
  const relayPoint = RELAY_POINTS.find(rp => rp.id === relayPointId);
  if (!relayPoint) return null;

  const category = RELAY_POINT_CATEGORIES.find(c => c.type === relayPoint.type);
  const isOpen = isRelayPointOpen(relayPoint);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
      <span className="text-lg">{category?.icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {relayPoint.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {relayPoint.commune} • {isOpen ? '🟢 Ouvert' : '🔴 Fermé'}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-full"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}
