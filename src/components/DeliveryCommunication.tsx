import { useState } from 'react';
import {
  MessageCircle,
  Mic,
  Share2,
  Phone,
  X,
  ChevronRight,
  Send,
  Volume2,
} from 'lucide-react';
import { VoiceMessageRecorder, PresetMessages } from './VoiceMessage';
import { ShareTrackingButton } from './ShareTracking';
import { logger } from '../utils/logger';

interface DeliveryCommunicationProps {
  deliveryId: string;
  recipientName: string;
  recipientPhone: string;
  onClose: () => void;
}

type TabType = 'quick' | 'voice' | 'share';

export function DeliveryCommunication({
  deliveryId,
  recipientName,
  recipientPhone,
  onClose,
}: DeliveryCommunicationProps) {
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const handleSendPreset = async (message: string, key: string) => {
    // Simuler l'envoi du message
    setSentMessage(message);

    // Ouvrir WhatsApp avec le message pré-rempli
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = recipientPhone.replace(/[\s\-\(\)]/g, '').replace('+', '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');

    // Reset après 3 secondes
    setTimeout(() => setSentMessage(null), 3000);
  };

  const handleSendVoice = async (audioBlob: Blob, duration: number, audioBase64?: string) => {
    // En production, envoyer le message vocal via API
    logger.info('Voice message sent', { duration, size: audioBlob.size });

    // Pour l'instant, afficher un message de succès
    setSentMessage(`Message vocal (${duration}s) envoyé`);
    setTimeout(() => setSentMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contacter le client
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Recipient Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {recipientName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {recipientPhone}
              </p>
            </div>
            <a
              href={`tel:${recipientPhone}`}
              className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"
            >
              <Phone className="w-5 h-5 text-green-600" />
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <TabButton
              active={activeTab === 'quick'}
              onClick={() => setActiveTab('quick')}
              icon={<MessageCircle className="w-4 h-4" />}
              label="Rapide"
            />
            <TabButton
              active={activeTab === 'voice'}
              onClick={() => setActiveTab('voice')}
              icon={<Mic className="w-4 h-4" />}
              label="Vocal"
            />
            <TabButton
              active={activeTab === 'share'}
              onClick={() => setActiveTab('share')}
              icon={<Share2 className="w-4 h-4" />}
              label="Partager"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Success Toast */}
          {sentMessage && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-2">
              <Send className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-700 dark:text-green-400 flex-1">
                {sentMessage}
              </p>
            </div>
          )}

          {/* Quick Messages */}
          {activeTab === 'quick' && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Appuyez sur un message pour l'envoyer via WhatsApp
              </p>
              <PresetMessages type="driver" onSelect={handleSendPreset} />
            </div>
          )}

          {/* Voice Message */}
          {activeTab === 'voice' && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Enregistrez un message vocal pour le client
              </p>
              <VoiceMessageRecorder
                onSend={handleSendVoice}
                onCancel={() => {}}
                maxDuration={60}
              />
            </div>
          )}

          {/* Share Tracking */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Partagez le lien de suivi en temps réel avec le client
              </p>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Suivi en temps réel
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Le client pourra voir votre position
                    </p>
                  </div>
                </div>

                <ShareTrackingButton
                  deliveryId={deliveryId}
                  recipientPhone={recipientPhone}
                  recipientName={recipientName}
                />
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Volume2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Le client recevra un lien pour suivre votre position en direct jusqu'à la livraison.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Button
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Compact button to open communication panel
export function CommunicationButton({
  deliveryId,
  recipientName,
  recipientPhone,
}: {
  deliveryId: string;
  recipientName: string;
  recipientPhone: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-xl text-sm font-medium"
      >
        <MessageCircle className="w-4 h-4" />
        Contacter
      </button>

      {isOpen && (
        <DeliveryCommunication
          deliveryId={deliveryId}
          recipientName={recipientName}
          recipientPhone={recipientPhone}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export default DeliveryCommunication;
