import { Link } from 'react-router-dom';
import { Home, ArrowLeft, MapPin } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-12 h-12 text-primary-500" />
        </div>

        {/* Title */}
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Page introuvable
        </h2>

        {/* Description */}
        <p className="text-gray-500 mb-8">
          Oups ! La page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Page précédente
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-12 text-sm text-gray-400">
        LogiTrack Driver App
      </p>
    </div>
  );
}
