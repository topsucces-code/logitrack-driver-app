import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  MapPin,
  Zap,
  Moon,
  HelpCircle,
  FileText,
  Shield,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DRIVER_CONFIG, APP_CONFIG } from '../config/app.config';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { driver, refreshDriver } = useAuth();

  const [autoAccept, setAutoAccept] = useState(driver?.auto_accept || false);
  const [maxDistance, setMaxDistance] = useState(driver?.max_distance_km || DRIVER_CONFIG.defaultMaxDistanceKm);
  const [saving, setSaving] = useState(false);

  async function updateSettings() {
    if (!driver) return;

    setSaving(true);

    const { error } = await supabase
      .from('logitrack_drivers')
      .update({
        auto_accept: autoAccept,
        max_distance_km: maxDistance,
        updated_at: new Date().toISOString()
      })
      .eq('id', driver.id);

    if (!error) {
      refreshDriver();
    }

    setSaving(false);
  }

  if (!driver) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 safe-top px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Delivery Settings */}
        <div className="bg-white rounded-xl">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Paramètres de livraison</h2>
          </div>

          {/* Auto Accept */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Acceptation auto</p>
                <p className="text-xs text-gray-500">Accepter automatiquement les courses</p>
              </div>
            </div>
            <button
              onClick={() => {
                setAutoAccept(!autoAccept);
                setTimeout(updateSettings, 100);
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                autoAccept ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${
                  autoAccept ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Max Distance */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Distance maximale</p>
                <p className="text-xs text-gray-500">
                  Recevez les courses dans un rayon de {maxDistance} km
                </p>
              </div>
            </div>
            <input
              type="range"
              min={DRIVER_CONFIG.minMaxDistanceKm}
              max={DRIVER_CONFIG.maxMaxDistanceKm}
              value={maxDistance}
              onChange={(e) => {
                setMaxDistance(parseInt(e.target.value));
              }}
              onMouseUp={updateSettings}
              onTouchEnd={updateSettings}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{DRIVER_CONFIG.minMaxDistanceKm} km</span>
              <span className="font-medium text-primary-600">{maxDistance} km</span>
              <span>{DRIVER_CONFIG.maxMaxDistanceKm} km</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Notifications</h2>
          </div>

          <button className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Notifications push</p>
                <p className="text-xs text-gray-500">Nouvelles courses, messages</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Support */}
        <div className="bg-white rounded-xl">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Support</h2>
          </div>

          <button className="w-full p-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="font-medium text-gray-900">Aide et FAQ</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <p className="font-medium text-gray-900">Conditions d'utilisation</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <p className="font-medium text-gray-900">Politique de confidentialité</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Version */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">{APP_CONFIG.name} v{APP_CONFIG.version}</p>
          <p className="text-xs text-gray-400">© {APP_CONFIG.year} {APP_CONFIG.company}</p>
        </div>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white rounded-full flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Enregistrement...
        </div>
      )}
    </div>
  );
}
