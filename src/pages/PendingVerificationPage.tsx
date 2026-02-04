import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  FileText,
  User,
  CreditCard,
  Truck,
  MapPin,
  Smartphone,
  RefreshCw,
  MessageCircle,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface VerificationStatus {
  profile: 'pending' | 'approved' | 'rejected';
  documents: 'pending' | 'approved' | 'rejected';
  vehicle: 'pending' | 'approved' | 'rejected';
  overall: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export default function PendingVerificationPage() {
  const navigate = useNavigate();
  const { driver, refreshDriver, signOut, isVerified } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<VerificationStatus>({
    profile: 'pending',
    documents: 'pending',
    vehicle: 'pending',
    overall: 'pending',
  });

  // Check verification status
  useEffect(() => {
    if (driver) {
      checkStatus();

      // Subscribe to realtime updates on logitrack_drivers table
      const channel = supabase
        .channel('logitrack-driver-verification')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'logitrack_drivers',
            filter: `id=eq.${driver.id}`
          },
          () => {
            refreshDriver();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [driver]);

  // Redirect if verified
  useEffect(() => {
    if (isVerified) {
      navigate('/dashboard', { replace: true });
    }
  }, [isVerified, navigate]);

  function checkStatus() {
    if (!driver) return;

    // Check status based on what documents are uploaded
    const newStatus: VerificationStatus = {
      profile: driver.photo_url ? 'pending' : 'rejected',
      documents: driver.id_card_front_url && driver.id_card_back_url && driver.driving_license_url ? 'pending' : 'rejected',
      vehicle: driver.vehicle_plate ? 'pending' : 'rejected',
      overall: 'pending',
    };

    // If driver is verified, all are approved
    if (driver.verification_status === 'verified') {
      newStatus.profile = 'approved';
      newStatus.documents = 'approved';
      newStatus.vehicle = 'approved';
      newStatus.overall = 'approved';
    } else if (driver.verification_status === 'rejected') {
      newStatus.overall = 'rejected';
      newStatus.rejectionReason = driver.rejection_reason || undefined;
    }

    setStatus(newStatus);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshDriver();
    checkStatus();
    setTimeout(() => setRefreshing(false), 1000);
  }

  function getStatusText(s: 'pending' | 'approved' | 'rejected') {
    switch (s) {
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'À compléter';
      default:
        return 'En cours';
    }
  }

  function getStatusColor(s: 'pending' | 'approved' | 'rejected') {
    switch (s) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  }

  if (!driver) return null;

  // Count configured zones
  const zoneCount = (driver.secondary_zones?.length || 0) + (driver.primary_zone_id ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary-500 text-white safe-top px-4 pt-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Vérification du compte</h1>
          <button
            onClick={handleRefresh}
            className={`p-2 bg-white/20 rounded-full ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-900" />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {driver.verification_status === 'rejected' ? 'Dossier à compléter' : 'En attente de vérification'}
              </p>
              <p className="text-white/80 text-sm">
                {driver.verification_status === 'rejected'
                  ? 'Veuillez corriger les éléments signalés'
                  : 'Délai estimé : 24-48 heures'}
              </p>
            </div>
          </div>
          {driver.rejection_reason && (
            <div className="mt-3 p-3 bg-red-500/20 rounded-lg">
              <p className="text-sm text-white/90">{driver.rejection_reason}</p>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 -mt-4">
        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Notification</p>
              <p className="text-sm text-gray-500 mt-1">
                Vous recevrez une notification push dès que votre compte sera approuvé.
                Assurez-vous que les notifications sont activées.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Steps */}
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-1">Statut de votre dossier</h2>
            <p className="text-sm text-gray-500">
              Notre équipe vérifie les documents soumis
            </p>
          </div>

          {/* Profile */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Photo de profil</p>
              <p className="text-sm text-gray-500">{driver.full_name}</p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(status.profile)}`}>
              {getStatusText(status.profile)}
            </span>
          </div>

          {/* Documents */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Documents</p>
              <p className="text-sm text-gray-500">CNI + Permis de conduire</p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(status.documents)}`}>
              {getStatusText(status.documents)}
            </span>
          </div>

          {/* Vehicle */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Véhicule</p>
              <p className="text-sm text-gray-500 capitalize">
                {driver.vehicle_type} {driver.vehicle_plate && `• ${driver.vehicle_plate}`}
              </p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(status.vehicle)}`}>
              {getStatusText(status.vehicle)}
            </span>
          </div>

          {/* Zones */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Zones de livraison</p>
              <p className="text-sm text-gray-500">
                {zoneCount} zone{zoneCount > 1 ? 's' : ''} configurée{zoneCount > 1 ? 's' : ''}
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
              Validé
            </span>
          </div>

          {/* Mobile Money */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Mobile Money</p>
              <p className="text-sm text-gray-500 capitalize">
                {driver.momo_provider?.replace('_', ' ') || 'Non configuré'} {driver.momo_number && `• ${driver.momo_number}`}
              </p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              driver.momo_provider && driver.momo_number ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {driver.momo_provider && driver.momo_number ? 'Validé' : 'À compléter'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {/* Contact Support */}
          <button
            onClick={() => window.open('https://wa.me/22507000000?text=Bonjour, je souhaite avoir des informations sur la vérification de mon compte livreur LogiTrack.', '_blank')}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contacter le support
          </button>

          {/* Edit Profile */}
          {(status.profile === 'rejected' || status.documents === 'rejected' || status.vehicle === 'rejected' || driver.verification_status === 'rejected') && (
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Compléter mon dossier
            </button>
          )}

          {/* Logout */}
          <button
            onClick={signOut}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </button>
        </div>

        {/* FAQ */}
        <div className="mt-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Questions fréquentes</h3>
          <div className="bg-white rounded-xl divide-y divide-gray-100">
            <details className="p-4 cursor-pointer">
              <summary className="font-medium text-gray-900">
                Combien de temps prend la vérification ?
              </summary>
              <p className="text-sm text-gray-500 mt-2">
                La vérification prend généralement entre 24 et 48 heures ouvrables.
                Vous serez notifié dès que votre compte sera approuvé.
              </p>
            </details>
            <details className="p-4 cursor-pointer">
              <summary className="font-medium text-gray-900">
                Pourquoi mon dossier peut-il être rejeté ?
              </summary>
              <p className="text-sm text-gray-500 mt-2">
                Un dossier peut être rejeté si les photos sont floues, si les informations
                ne correspondent pas, ou si les documents sont expirés.
              </p>
            </details>
            <details className="p-4 cursor-pointer">
              <summary className="font-medium text-gray-900">
                Puis-je modifier mes informations ?
              </summary>
              <p className="text-sm text-gray-500 mt-2">
                Oui, vous pouvez modifier vos informations en cliquant sur "Compléter mon dossier"
                si un élément est marqué comme "À compléter".
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
