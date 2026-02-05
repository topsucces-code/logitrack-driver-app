import { useState } from 'react';
import { Navigation, MapPin, X, Clock, Route } from 'lucide-react';
import { Button } from './ui/Button';
import {
  navigateTo,
  getAvailableNavigationApps,
  calculateDistance,
  estimateTravelTime,
  formatDistance,
  formatTravelTime,
  NavigationApp,
  NavigationDestination,
} from '../services/navigationService';
import { useLocation } from '../contexts/LocationContext';
import { hapticLight } from '../hooks/useHapticFeedback';

interface NavigationButtonProps {
  destination: NavigationDestination;
  label?: string;
  variant?: 'default' | 'compact' | 'inline';
  vehicleType?: string;
}

export function NavigationButton({
  destination,
  label,
  variant = 'default',
  vehicleType = 'moto',
}: NavigationButtonProps) {
  const { position } = useLocation();
  const [showModal, setShowModal] = useState(false);

  const navigationApps = getAvailableNavigationApps();

  // Calculate distance and ETA if current position available
  const distance = position
    ? calculateDistance(
        position.lat,
        position.lng,
        destination.latitude,
        destination.longitude
      )
    : null;

  const eta = distance ? estimateTravelTime(distance, vehicleType) : null;

  const handleNavigate = (app: NavigationApp) => {
    hapticLight();
    navigateTo({ ...destination, label }, app);
    setShowModal(false);
  };

  const handleQuickNavigate = () => {
    hapticLight();
    navigateTo({ ...destination, label }, 'default');
  };

  // Compact variant (icon only)
  if (variant === 'compact') {
    return (
      <button
        onClick={handleQuickNavigate}
        className="w-10 h-10 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
      >
        <Navigation className="w-5 h-5" />
      </button>
    );
  }

  // Inline variant (small button)
  if (variant === 'inline') {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg text-sm font-medium transition-colors"
      >
        <Navigation className="w-4 h-4" />
        <span>Naviguer</span>
        {eta && (
          <span className="text-primary-400">~{formatTravelTime(eta)}</span>
        )}
      </button>
    );
  }

  // Default variant (full button)
  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        fullWidth
        icon={<Navigation className="w-5 h-5" />}
      >
        <span className="flex items-center gap-2">
          Ouvrir la navigation
          {eta && (
            <span className="text-white/80 text-sm">~{formatTravelTime(eta)}</span>
          )}
        </span>
      </Button>

      {/* Navigation App Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 safe-bottom">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Navigation</h2>
                  {label && (
                    <p className="text-sm text-gray-500 line-clamp-1">{label}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Distance & ETA Info */}
            {(distance || eta) && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-around">
                {distance && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                      <Route className="w-4 h-4" />
                      <span className="text-xs">Distance</span>
                    </div>
                    <p className="font-bold text-gray-900">{formatDistance(distance)}</p>
                  </div>
                )}
                {distance && eta && (
                  <div className="w-px h-10 bg-gray-200" />
                )}
                {eta && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Temps estimé</span>
                    </div>
                    <p className="font-bold text-gray-900">{formatTravelTime(eta)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Destination Preview */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium text-gray-900 line-clamp-2">
                    {label || `${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Apps */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Choisir l'application</p>

              <div className="grid grid-cols-1 gap-2">
                {navigationApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleNavigate(app.id)}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    <span className="text-2xl">{app.icon}</span>
                    <span className="font-medium text-gray-900">{app.name}</span>
                    <Navigation className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                ))}
              </div>
            </div>

            {/* Cancel */}
            <div className="mt-4">
              <Button
                onClick={() => setShowModal(false)}
                variant="ghost"
                fullWidth
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NavigationButton;
