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
      {/* Header - Compact */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-top px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t.settings}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-3 pb-20 space-y-3">
        {/* Delivery Settings - Compact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t.deliverySettings}</h2>
          </div>

          {/* Auto Accept */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{t.autoAccept}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t.autoAcceptDescription}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setAutoAccept(!autoAccept);
                setTimeout(updateSettings, 100);
              }}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                autoAccept ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  autoAccept ? 'left-4' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Max Distance */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{t.maxDistance}: {maxDistance} km</p>
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
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              <span>{DRIVER_CONFIG.minMaxDistanceKm} km</span>
              <span>{DRIVER_CONFIG.maxMaxDistanceKm} km</span>
            </div>
          </div>
        </div>

        {/* Appearance & Language - Combined Compact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t.appearance} & {t.language}</h2>
          </div>
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <ThemeToggle variant="selector" />
          </div>
          <div className="px-3 py-2">
            <LanguageSelector variant="list" showLabel={false} />
          </div>
        </div>

        {/* Tools - Compact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t.tools}</h2>
          </div>

          {[
            { onClick: () => setShowScanner(true), icon: QrCode, color: 'indigo', label: t.qrScanner },
            { onClick: () => navigate('/reports'), icon: BarChart3, color: 'cyan', label: t.reports },
            { onClick: () => navigate('/analytics'), icon: BarChart3, color: 'emerald', label: t.analytics },
            { onClick: () => navigate('/route-optimization'), icon: Route, color: 'orange', label: t.routeOptimization },
            { onClick: () => navigate('/challenges'), icon: Trophy, color: 'yellow', label: t.challengesAndRewards },
          ].map((item, idx, arr) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full px-3 py-2 flex items-center justify-between ${idx < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 bg-${item.color}-100 dark:bg-${item.color}-900 rounded-full flex items-center justify-center`}>
                  <item.icon className={`w-3.5 h-3.5 text-${item.color}-600 dark:text-${item.color}-400`} />
                </div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{item.label}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Notifications - Compact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg">
          <button className="w-full px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.pushNotifications}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Support - Compact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t.support}</h2>
          </div>

          {[
            { onClick: () => setShowChat(true), icon: MessageCircle, color: 'primary', label: t.chatWithSupport },
            { onClick: () => {}, icon: HelpCircle, color: 'teal', label: t.helpFAQ },
            { onClick: () => {}, icon: FileText, color: 'gray', label: t.termsOfService },
            { onClick: () => {}, icon: Shield, color: 'gray', label: t.privacyPolicy },
          ].map((item, idx, arr) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full px-3 py-2 flex items-center justify-between ${idx < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 bg-${item.color}-100 dark:bg-${item.color}-900 rounded-full flex items-center justify-center`}>
                  <item.icon className={`w-3.5 h-3.5 text-${item.color}-600 dark:text-${item.color}-400`} />
                </div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{item.label}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Version - Compact */}
        <div className="text-center py-2">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{APP_CONFIG.name} v{APP_CONFIG.version}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">© {APP_CONFIG.year} {APP_CONFIG.company}</p>
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
