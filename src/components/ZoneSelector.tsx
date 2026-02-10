import { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  ChevronRight,
  AlertTriangle,
  Clock,
  Shield,
  Star,
  X,
  Navigation,
} from 'lucide-react';
import { Zone, ABIDJAN_COMMUNES, getAllZones } from '../data/abidjanZones';
import { getZoneStats, searchZones } from '../services/zonePricingService';

interface ZoneSelectorProps {
  value?: string;
  onChange: (zoneId: string, zone: Zone) => void;
  onClose?: () => void;
  label?: string;
  showPopular?: boolean;
}

export function ZoneSelector({
  value,
  onChange,
  onClose,
  label = 'Sélectionner une zone',
  showPopular = true,
}: ZoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);

  const filteredZones = useMemo(() => {
    if (searchQuery.length > 1) {
      return searchZones(searchQuery);
    }
    if (selectedCommune) {
      const commune = ABIDJAN_COMMUNES.find(c => c.id === selectedCommune);
      return commune?.zones || [];
    }
    return [];
  }, [searchQuery, selectedCommune]);

  const popularZones = useMemo(() => {
    return getAllZones()
      .filter(z => z.riskLevel === 'low')
      .slice(0, 6);
  }, []);

  const handleSelectZone = (zone: Zone) => {
    onChange(zone.id, zone);
    onClose?.();
  };

  return (
    <div className="bg-white dark:bg-gray-900 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCommune(null);
            }}
            placeholder="Rechercher un quartier..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Search Results */}
        {searchQuery.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {filteredZones.length} résultat(s)
            </p>
            {filteredZones.map(zone => (
              <ZoneCard key={zone.id} zone={zone} onClick={() => handleSelectZone(zone)} />
            ))}
          </div>
        )}

        {/* Popular Zones */}
        {!searchQuery && !selectedCommune && showPopular && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Zones populaires
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {popularZones.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => handleSelectZone(zone)}
                  className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-left hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <p className="text-sm font-medium text-primary-700 dark:text-primary-300 truncate">
                    {zone.name}
                  </p>
                  <p className="text-xs text-primary-500 dark:text-primary-400">
                    {zone.commune}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Communes List */}
        {!searchQuery && !selectedCommune && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Toutes les communes
            </h3>
            <div className="space-y-2">
              {ABIDJAN_COMMUNES.map(commune => (
                <button
                  key={commune.id}
                  onClick={() => setSelectedCommune(commune.id)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{commune.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {commune.zones.length} zone(s) • ~{commune.averageDeliveryTime} min
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zones in Selected Commune */}
        {selectedCommune && !searchQuery && (
          <div>
            <button
              onClick={() => setSelectedCommune(null)}
              className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm mb-4"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Retour aux communes
            </button>

            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Zones de {ABIDJAN_COMMUNES.find(c => c.id === selectedCommune)?.name}
            </h3>

            <div className="space-y-2">
              {filteredZones.map(zone => (
                <ZoneCard key={zone.id} zone={zone} onClick={() => handleSelectZone(zone)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Current Location Button */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4">
        <button className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg flex items-center justify-center gap-2">
          <Navigation className="w-5 h-5" />
          Utiliser ma position actuelle
        </button>
      </div>
    </div>
  );
}

// Zone Card Component
function ZoneCard({ zone, onClick }: { zone: Zone; onClick: () => void }) {
  const stats = getZoneStats(zone.id);

  const riskColors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-left hover:border-primary-500 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{zone.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{zone.commune}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColors[stats.riskColor as keyof typeof riskColors]}`}>
          {stats.riskLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded text-xs">
          {stats.priceCategory}
        </span>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
          Base: {zone.baseDeliveryFee} F
        </span>
      </div>

      {stats.restrictions.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <AlertTriangle className="w-3 h-3" />
          {stats.restrictions[0]}
        </div>
      )}

      {zone.popularAreas.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
          {zone.popularAreas.slice(0, 3).join(', ')}
        </p>
      )}
    </button>
  );
}

// Compact Zone Badge for display
export function ZoneBadge({ zoneId, showDetails = false }: { zoneId: string; showDetails?: boolean }) {
  const stats = getZoneStats(zoneId);
  if (!stats.zone) return null;

  const riskColors = {
    green: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    yellow: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    red: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    gray: 'border-gray-300 bg-gray-50 dark:bg-gray-800',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border ${riskColors[stats.riskColor as keyof typeof riskColors]}`}>
      <MapPin className="w-3.5 h-3.5 text-gray-500" />
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {stats.zone.name}
      </span>
      {showDetails && (
        <>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-xs text-gray-500">{stats.zone.commune}</span>
        </>
      )}
    </div>
  );
}
