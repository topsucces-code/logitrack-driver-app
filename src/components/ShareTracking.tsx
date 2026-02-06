import { useState } from 'react';
import {
  Share2,
  Copy,
  CheckCircle2,
  MessageCircle,
  Link as LinkIcon,
  X,
  Eye,
  EyeOff,
  Clock,
  Loader2,
} from 'lucide-react';
import { createShareableTracking, generateWhatsAppShareLink } from '../services/trustService';

interface ShareTrackingProps {
  deliveryId: string;
  recipientPhone?: string;
  recipientName?: string;
  onClose: () => void;
}

export function ShareTracking({ deliveryId, recipientPhone, recipientName, onClose }: ShareTrackingProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Options de partage
  const [showDriverName, setShowDriverName] = useState(true);
  const [showDriverPhone, setShowDriverPhone] = useState(false);
  const [showDriverPhoto, setShowDriverPhoto] = useState(true);
  const [showEta, setShowEta] = useState(true);
  const [expiresIn, setExpiresIn] = useState(24);

  const handleCreateLink = async () => {
    setLoading(true);
    setError('');

    const result = await createShareableTracking(deliveryId, {
      showDriverName,
      showDriverPhone,
      showDriverPhoto,
      showEta,
      expiresInHours: expiresIn,
    });

    if (result.success) {
      setShareUrl(result.shareUrl!);
      setShareCode(result.shareCode!);
    } else {
      setError(result.error || 'Erreur lors de la création du lien');
    }

    setLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = generateWhatsAppShareLink(shareUrl, recipientPhone);
    window.open(whatsappUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Suivi de livraison LogiTrack',
        text: `Suivez votre livraison en temps réel: ${shareUrl}`,
        url: shareUrl,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Partager le suivi
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {!shareUrl ? (
            <>
              {/* Destinataire */}
              {recipientName && (
                <div className="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                    <span className="text-lg">📦</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {recipientName}
                    </p>
                    {recipientPhone && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {recipientPhone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Options de visibilité */}
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Informations visibles:
                </p>

                <ToggleOption
                  label="Nom du livreur"
                  enabled={showDriverName}
                  onChange={setShowDriverName}
                />
                <ToggleOption
                  label="Photo du livreur"
                  enabled={showDriverPhoto}
                  onChange={setShowDriverPhoto}
                />
                <ToggleOption
                  label="Téléphone du livreur"
                  enabled={showDriverPhone}
                  onChange={setShowDriverPhone}
                  warning="Le client pourra vous appeler directement"
                />
                <ToggleOption
                  label="Heure d'arrivée estimée"
                  enabled={showEta}
                  onChange={setShowEta}
                />
              </div>

              {/* Durée de validité */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Validité du lien:
                </p>
                <div className="flex gap-2">
                  {[6, 12, 24, 48].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setExpiresIn(hours)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        expiresIn === hours
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Bouton de création */}
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="w-full py-3 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-5 h-5" />
                    Créer le lien de suivi
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Lien créé */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Lien créé !
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Valide pendant {expiresIn} heures
                </p>
              </div>

              {/* Code de suivi */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code de suivi</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-widest">
                  {shareCode}
                </p>
              </div>

              {/* URL */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4 flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-600 dark:text-gray-300 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`p-2 rounded-lg transition-all ${
                    copied
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {/* Boutons de partage */}
              <div className="space-y-3">
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full py-3 bg-[#25D366] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Envoyer via WhatsApp
                </button>

                {'share' in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Autres options de partage
                  </button>
                )}

                <button
                  onClick={() => {
                    setShareUrl('');
                    setShareCode('');
                  }}
                  className="w-full py-3 text-gray-500 dark:text-gray-400 text-sm"
                >
                  Créer un nouveau lien
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  enabled,
  onChange,
  warning,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  warning?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div className="flex items-center gap-3">
        {enabled ? (
          <Eye className="w-5 h-5 text-primary-500" />
        ) : (
          <EyeOff className="w-5 h-5 text-gray-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {warning && enabled && (
            <p className="text-xs text-orange-500">{warning}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-7 rounded-full transition-all ${
          enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Composant compact pour intégration dans une page
export function ShareTrackingButton({
  deliveryId,
  recipientPhone,
  recipientName,
}: {
  deliveryId: string;
  recipientPhone?: string;
  recipientName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-medium"
      >
        <Share2 className="w-4 h-4" />
        Partager le suivi
      </button>

      {isOpen && (
        <ShareTracking
          deliveryId={deliveryId}
          recipientPhone={recipientPhone}
          recipientName={recipientName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
