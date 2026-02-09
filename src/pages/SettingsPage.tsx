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
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { DRIVER_CONFIG, APP_CONFIG } from '../config/app.config';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { SupportChat } from '../components/SupportChat';
import { QRScanner } from '../components/QRScanner';
import {
  getPreferences,
  updatePreferences,
  type NotificationPreferences,
} from '../services/notificationService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { driver, refreshDriver } = useAuth();
  const t = useT();

  const [autoAccept, setAutoAccept] = useState(driver?.auto_accept || false);
  const [maxDistance, setMaxDistance] = useState(driver?.max_distance_km || DRIVER_CONFIG.defaultMaxDistanceKm);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);

  async function updateSettings(overrides?: { auto_accept?: boolean; max_distance_km?: number }) {
    if (!driver) return;

    setSaving(true);

    const { error } = await supabase
      .from('logitrack_drivers')
      .update({
        auto_accept: overrides?.auto_accept ?? autoAccept,
        max_distance_km: overrides?.max_distance_km ?? maxDistance,
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

      <div className="flex-1 overflow-y-auto p-3 pb-4 space-y-3">
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
                const newVal = !autoAccept;
                setAutoAccept(newVal);
                updateSettings({ auto_accept: newVal });
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
              onMouseUp={() => updateSettings()}
              onTouchEnd={() => updateSettings()}
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

          <button onClick={() => setShowScanner(true)} className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.qrScanner}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => navigate('/reports')} className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.reports}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => navigate('/analytics')} className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.analytics}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => navigate('/route-optimization')} className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Route className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.routeOptimization}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => navigate('/challenges')} className="w-full px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.challengesAndRewards}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Notifications - Compact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg">
          <button
            onClick={async () => {
              if (driver) {
                const prefs = await getPreferences(driver.user_id!);
                setNotifPrefs(prefs);
              }
              setShowNotifSettings(true);
            }}
            className="w-full px-3 py-2 flex items-center justify-between"
          >
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

          <button onClick={() => setShowChat(true)} className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.chatWithSupport}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => setShowHelp(true)} className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                <HelpCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.helpFAQ}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => setShowTerms(true)} className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.termsOfService}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => setShowPrivacy(true)} className="w-full px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.privacyPolicy}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
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
          onScan={(_data, parsed) => {
            setShowScanner(false);
            // Navigate to delivery if found
            if (parsed.deliveryId) {
              navigate(`/delivery/${parsed.deliveryId}`);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Info Modals */}
      {showHelp && (
        <InfoModal title={t.helpFAQ} onClose={() => setShowHelp(false)}>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Comment accepter une livraison ?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Lorsqu'une nouvelle livraison est disponible, une notification apparaît sur votre écran. Appuyez sur "Accepter" pour prendre en charge la livraison.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Comment recevoir mes paiements ?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Vos gains sont automatiquement crédités sur votre portefeuille. Vous pouvez les retirer via Mobile Money depuis la page Portefeuille.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Comment modifier ma zone de livraison ?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Contactez le support via le chat pour modifier vos zones de livraison. Un conseiller vous assistera rapidement.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Que faire en cas de problème avec un client ?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Utilisez le bouton SOS disponible sur la page de livraison en cours, ou contactez le support via le chat en direct.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Comment optimiser mes itinéraires ?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Allez dans Outils → Optimisation d'itinéraire pour réorganiser automatiquement vos livraisons et réduire vos temps de trajet.</p>
            </div>
          </div>
        </InfoModal>
      )}

      {showTerms && (
        <InfoModal title={t.termsOfService} onClose={() => setShowTerms(false)}>
          <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Conditions Générales d'Utilisation — LogiTrack Africa</p>
            <p><strong>1. Objet</strong><br/>Les présentes conditions régissent l'utilisation de l'application LogiTrack par les livreurs partenaires en Côte d'Ivoire.</p>
            <p><strong>2. Inscription</strong><br/>L'inscription nécessite la fourniture d'informations exactes (identité, véhicule, coordonnées Mobile Money). Tout document frauduleux entraîne la suspension immédiate du compte.</p>
            <p><strong>3. Obligations du livreur</strong><br/>Le livreur s'engage à : livrer les colis en bon état, respecter les délais, maintenir une communication courtoise avec les clients, et respecter le code de la route.</p>
            <p><strong>4. Rémunération</strong><br/>La rémunération est calculée par livraison effectuée. Les paiements sont versés via Mobile Money. LogiTrack prélève une commission sur chaque livraison.</p>
            <p><strong>5. Résiliation</strong><br/>LogiTrack se réserve le droit de suspendre ou résilier un compte en cas de non-respect des présentes conditions, de plaintes répétées ou de comportement inapproprié.</p>
            <p><strong>6. Responsabilité</strong><br/>Le livreur est responsable des colis qui lui sont confiés. En cas de perte ou dommage par négligence, des retenues pourront être appliquées.</p>
          </div>
        </InfoModal>
      )}

      {showNotifSettings && (
        <InfoModal title={t.pushNotifications} onClose={() => setShowNotifSettings(false)}>
          <div className="space-y-3">
            {/* Channels */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Canaux</p>
              {([
                { key: 'push_enabled', label: 'Notifications push' },
                { key: 'sms_enabled', label: 'SMS' },
                { key: 'whatsapp_enabled', label: 'WhatsApp' },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                  <button
                    onClick={async () => {
                      const newVal = !(notifPrefs?.[item.key] ?? true);
                      setNotifPrefs((prev) => prev ? { ...prev, [item.key]: newVal } : null);
                      if (driver) await updatePreferences(driver.user_id!, { [item.key]: newVal });
                    }}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      (notifPrefs?.[item.key] ?? true) ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                      (notifPrefs?.[item.key] ?? true) ? 'left-4' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Event types */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Événements</p>
              {([
                { key: 'driver_assigned_enabled', label: 'Nouvelle course assignée' },
                { key: 'picked_up_enabled', label: 'Colis récupéré' },
                { key: 'in_transit_enabled', label: 'En transit' },
                { key: 'delivered_enabled', label: 'Livraison terminée' },
                { key: 'failed_enabled', label: 'Livraison échouée' },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                  <button
                    onClick={async () => {
                      const newVal = !(notifPrefs?.[item.key] ?? true);
                      setNotifPrefs((prev) => prev ? { ...prev, [item.key]: newVal } : null);
                      if (driver) await updatePreferences(driver.user_id!, { [item.key]: newVal });
                    }}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      (notifPrefs?.[item.key] ?? true) ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                      (notifPrefs?.[item.key] ?? true) ? 'left-4' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Quiet hours */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Heures calmes</p>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-900 dark:text-white">Activer les heures calmes</span>
                <button
                  onClick={async () => {
                    const newVal = !(notifPrefs?.quiet_hours_enabled ?? true);
                    setNotifPrefs((prev) => prev ? { ...prev, quiet_hours_enabled: newVal } : null);
                    if (driver) await updatePreferences(driver.user_id!, { quiet_hours_enabled: newVal });
                  }}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    (notifPrefs?.quiet_hours_enabled ?? true) ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    (notifPrefs?.quiet_hours_enabled ?? true) ? 'left-4' : 'left-0.5'
                  }`} />
                </button>
              </div>
              {(notifPrefs?.quiet_hours_enabled ?? true) && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">De</label>
                    <input
                      type="time"
                      value={notifPrefs?.quiet_hours_start || '22:00'}
                      onChange={async (e) => {
                        setNotifPrefs((prev) => prev ? { ...prev, quiet_hours_start: e.target.value } : null);
                        if (driver) await updatePreferences(driver.user_id!, { quiet_hours_start: e.target.value });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">À</label>
                    <input
                      type="time"
                      value={notifPrefs?.quiet_hours_end || '07:00'}
                      onChange={async (e) => {
                        setNotifPrefs((prev) => prev ? { ...prev, quiet_hours_end: e.target.value } : null);
                        if (driver) await updatePreferences(driver.user_id!, { quiet_hours_end: e.target.value });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </InfoModal>
      )}

      {showPrivacy && (
        <InfoModal title={t.privacyPolicy} onClose={() => setShowPrivacy(false)}>
          <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Politique de Confidentialité — LogiTrack Africa</p>
            <p><strong>1. Données collectées</strong><br/>Nous collectons : nom, téléphone, photo de profil, documents d'identité, position GPS (pendant les livraisons), données de véhicule et informations Mobile Money.</p>
            <p><strong>2. Utilisation des données</strong><br/>Vos données servent à : gérer votre compte, attribuer les livraisons, calculer les itinéraires, traiter les paiements et améliorer nos services.</p>
            <p><strong>3. Géolocalisation</strong><br/>La position GPS est utilisée uniquement pendant les livraisons actives pour le suivi en temps réel. Vous pouvez désactiver le suivi en passant hors ligne.</p>
            <p><strong>4. Partage des données</strong><br/>Vos données ne sont jamais vendues. Le nom et la photo peuvent être partagés avec le client lors d'une livraison. Les données de paiement sont transmises à votre opérateur Mobile Money.</p>
            <p><strong>5. Sécurité</strong><br/>Les données sont stockées de manière sécurisée avec chiffrement. L'accès est limité au personnel autorisé.</p>
            <p><strong>6. Vos droits</strong><br/>Vous pouvez demander l'accès, la modification ou la suppression de vos données en contactant le support.</p>
          </div>
        </InfoModal>
      )}
    </div>
  );
}

// Bottom sheet modal for info content
function InfoModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up safe-bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h2 className="font-bold text-base text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
}
