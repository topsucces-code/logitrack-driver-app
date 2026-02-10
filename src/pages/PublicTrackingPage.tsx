import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Package,
  MapPin,
  Clock,
  Phone,
  User,
  CheckCircle2,
  Truck,
  Navigation,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useGoogleMaps } from '../components/GoogleMapsProvider';
import { getTrackingByCode } from '../services/trustService';
import { SharedTracking, TrackingUpdate } from '../types/trust';
import { TRUST_LEVELS } from '../types/trust';
import {
  DRIVER_MARKER_URL,
  DELIVERY_MARKER_URL,
  MARKER_SIZE,
  MARKER_ANCHOR,
} from '../config/mapIcons';

function makeMarkerIcon(url: string) {
  return {
    url,
    scaledSize: new google.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height),
    anchor: new google.maps.Point(MARKER_ANCHOR.x, MARKER_ANCHOR.y),
  };
}

export default function PublicTrackingPage() {
  const { code } = useParams<{ code: string }>();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState<SharedTracking | null>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [updates, setUpdates] = useState<TrackingUpdate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (code) {
      loadTracking();
    }
  }, [code]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (code && !refreshing) {
        loadTracking(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [code, refreshing]);

  async function loadTracking(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await getTrackingByCode(code!);
      if (data) {
        setTracking(data.tracking);
        setDelivery(data.delivery);
        setDriver(data.driver);
        setUpdates(data.updates);
        setError('');
      } else {
        setError('Lien de suivi invalide ou expiré');
      }
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'En attente', color: 'text-gray-500', icon: <Clock className="w-5 h-5" /> },
      assigned: { label: 'Assigné', color: 'text-blue-500', icon: <User className="w-5 h-5" /> },
      picked_up: { label: 'Récupéré', color: 'text-orange-500', icon: <Package className="w-5 h-5" /> },
      in_transit: { label: 'En route', color: 'text-primary-500', icon: <Truck className="w-5 h-5" /> },
      delivered: { label: 'Livré', color: 'text-green-500', icon: <CheckCircle2 className="w-5 h-5" /> },
    };
    return statuses[status] || statuses.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-primary-500 text-white font-medium rounded-xl"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(delivery?.status);
  const latestUpdate = updates[0];
  const trustLevel = driver?.trust_level ? TRUST_LEVELS[driver.trust_level as keyof typeof TRUST_LEVELS] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 px-4 py-6 text-white">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6" />
              <span className="font-semibold">LogiTrack</span>
            </div>
            <button
              onClick={() => loadTracking(true)}
              disabled={refreshing}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-white/80 text-sm mb-2">Code de suivi</p>
          <p className="text-2xl font-bold tracking-widest">{code}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 -mt-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center ${statusInfo.color}`}>
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Statut actuel</p>
              <p className={`text-xl font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </p>
            </div>
          </div>

          {/* ETA */}
          {tracking?.show_eta && latestUpdate?.eta_minutes && delivery?.status !== 'delivered' && (
            <div className="bg-primary-50 rounded-xl p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary-500" />
              <div>
                <p className="text-xs text-primary-600">Arrivée estimée</p>
                <p className="text-lg font-semibold text-primary-700">
                  {latestUpdate.eta_minutes} minutes
                </p>
              </div>
            </div>
          )}

          {/* Delivered success */}
          {delivery?.status === 'delivered' && (
            <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-green-600">Livraison effectuée</p>
                <p className="text-sm font-medium text-green-700">
                  Votre colis a été livré avec succès
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Driver Card */}
        {driver && delivery?.status !== 'pending' && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <p className="text-sm text-gray-500 mb-3">Votre livreur</p>

            <div className="flex items-center gap-3">
              {tracking?.show_driver_photo && driver.avatar_url ? (
                <img
                  src={driver.avatar_url}
                  alt={driver.full_name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary-500" />
                </div>
              )}

              <div className="flex-1">
                {tracking?.show_driver_name && (
                  <p className="font-semibold text-gray-900">{driver.full_name}</p>
                )}

                {/* Trust Badge */}
                {trustLevel && (
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: trustLevel.color + '20', color: trustLevel.color }}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {trustLevel.label}
                    </div>
                    <span className="text-xs text-gray-500">
                      Score: {driver.reliability_score}/100
                    </span>
                  </div>
                )}
              </div>

              {/* Call button */}
              {tracking?.show_driver_phone && driver.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="p-3 bg-green-500 text-white rounded-xl"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Delivery Details */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <p className="text-sm text-gray-500 mb-3">Détails de la livraison</p>

          <div className="space-y-3">
            {delivery?.pickup_address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Point de retrait</p>
                  <p className="text-sm text-gray-900">{delivery.pickup_address}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Adresse de livraison</p>
                <p className="text-sm text-gray-900">{delivery?.delivery_address}</p>
              </div>
            </div>

            {delivery?.recipient_name && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Destinataire</p>
                  <p className="text-sm text-gray-900">{delivery.recipient_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Map */}
        {delivery?.status === 'in_transit' && latestUpdate && mapsLoaded && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
            <GoogleMap
              mapContainerStyle={{ height: '12rem', width: '100%' }}
              center={{ lat: latestUpdate.latitude, lng: latestUpdate.longitude }}
              zoom={14}
              options={{
                disableDefaultUI: true,
                zoomControl: false,
                gestureHandling: 'cooperative',
              }}
            >
              {/* Driver position */}
              <MarkerF
                position={{ lat: latestUpdate.latitude, lng: latestUpdate.longitude }}
                icon={makeMarkerIcon(DRIVER_MARKER_URL)}
                title="Position du livreur"
              />
              {/* Destination */}
              {delivery.delivery_lat && delivery.delivery_lng && (
                <MarkerF
                  position={{ lat: delivery.delivery_lat, lng: delivery.delivery_lng }}
                  icon={makeMarkerIcon(DELIVERY_MARKER_URL)}
                  title="Destination"
                />
              )}
            </GoogleMap>
          </div>
        )}

        {/* Timeline */}
        {updates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <p className="text-sm text-gray-500 mb-3">Historique</p>

            <div className="space-y-4">
              {updates.slice(0, 5).map((update, index) => (
                <div key={update.id} className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${
                    index === 0 ? 'bg-primary-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {update.status || 'Position mise à jour'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(update.created_at).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 mb-4">
          <p className="text-xs text-gray-400">
            Powered by LogiTrack Africa
          </p>
        </div>
      </div>
    </div>
  );
}
