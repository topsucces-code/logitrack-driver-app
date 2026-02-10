import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { canInstall, install, dismiss } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-primary-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">Installer LogiTrack</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Installez l'app pour un accès rapide et une meilleure expérience
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={dismiss}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Plus tard
          </button>
          <button
            onClick={install}
            className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
