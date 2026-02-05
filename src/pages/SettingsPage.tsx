import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  MapPin,
  Zap,
  HelpCircle,
  FileText,
  Shield,
  ChevronRight,
  Loader2,
  MessageCircle,
  BarChart3,
  QrCode,
  Trophy,
  Route,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { DRIVER_CONFIG, APP_CONFIG } from '../config/app.config';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { SupportChat } from '../components/SupportChat';
import { QRScanner } from '../components/QRScanner';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { driver, refreshDriver } = useAuth();
  const t = useT();

  const [autoAccept, setAutoAccept] = useState(driver?.auto_accept || false);
  const [maxDistance, setMaxDistance] = useState(driver?.max_distance_km || DRIVER_CONFIG.defaultMaxDistanceKm);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.settings}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Delivery Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t.deliverySettings}</h2>
          </div>

          {/* Auto Accept */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t.autoAccept}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.autoAcceptDescription}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setAutoAccept(!autoAccept);
                setTimeout(updateSettings, 100);
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                autoAccept ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
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
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t.maxDistance}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.receiveDeliveriesWithinRadius} {maxDistance} km
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
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{DRIVER_CONFIG.minMaxDistanceKm} km</span>
              <span className="font-medium text-primary-600 dark:text-primary-400">{maxDistance} km</span>
              <span>{DRIVER_CONFIG.maxMaxDistanceKm} km</span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t.appearance}</h2>
          </div>
          <div className="p-4">
            <ThemeToggle variant="selector" />
          </div>
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t.language}</h2>
          </div>
          <div className="p-4">
            <LanguageSelector variant="list" showLabel={false} />
          </div>
        </div>

        {/* Tools */}
        <div className="bg-white dark:bg-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t.tools}</h2>
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.qrScanner}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.scanPackageCode}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.reports}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.weeklyStats}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.analytics}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.detailedDashboard}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => navigate('/route-optimization')}
            className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Route className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.routeOptimization}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.optimizeRoute}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => navigate('/challenges')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.challengesAndRewards}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.earnBonuses}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t.notifications}</h2>
          </div>

          <button className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.pushNotifications}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.newDeliveriesMessages}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Support */}
        <div className="bg-white dark:bg-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t.support}</h2>
          </div>

          <button
            onClick={() => setShowChat(true)}
            className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.chatWithSupport}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.realtimeAssistance}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{t.helpFAQ}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{t.termsOfService}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{t.privacyPolicy}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Version */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">{APP_CONFIG.name} v{APP_CONFIG.version}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">© {APP_CONFIG.year} {APP_CONFIG.company}</p>
        </div>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white rounded-full flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t.saving}
        </div>
      )}

      {/* Support Chat Modal */}
      {showChat && <SupportChat onClose={() => setShowChat(false)} />}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={(data, parsed) => {
            console.log('Scanned:', data, parsed);
            setShowScanner(false);
            // Navigate to delivery if found
            if (parsed.deliveryId) {
              navigate(`/delivery/${parsed.deliveryId}`);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
