/**
 * MODULE 6.2 - Écran Signalement (App Livreur)
 * Page pour signaler un problème pendant une livraison
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { incidentService } from '../services/incidentService';
import { DRIVER_INCIDENT_TYPES, IncidentType } from '../types/incidents';

export default function ReportIncidentPage() {
  const { id: deliveryId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { driver } = useAuth();

  // Get tracking code from navigation state if available
  const trackingCode = (location.state as { trackingCode?: string } | null)?.trackingCode || deliveryId?.slice(0, 8).toUpperCase();

  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIncidentType = DRIVER_INCIDENT_TYPES.find(t => t.code === selectedType);

  // Clean up photo previews on unmount
  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Maximum 5 photos autorisées');
      return;
    }

    setPhotos([...photos, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
    setError(null);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      setError('Veuillez sélectionner un type de problème');
      return;
    }

    if (!description.trim()) {
      setError('Veuillez décrire le problème');
      return;
    }

    if (selectedIncidentType?.requiresPhoto && photos.length === 0) {
      setError('Une photo est requise pour ce type de problème');
      return;
    }

    if (selectedIncidentType?.requiresAmount && !amount) {
      setError('Veuillez indiquer le montant concerné');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload photos first
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const url = await incidentService.uploadPhoto(photo);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      // Create incident
      const result = await incidentService.createIncident(
        {
          delivery_id: deliveryId || '',
          tracking_code: trackingCode,
          incident_type: selectedType,
          title: selectedIncidentType?.label || selectedType,
          description,
          photos: uploadedUrls,
          disputed_amount: amount ? parseFloat(amount) : undefined,
        },
        driver?.id || '',
        driver?.full_name,
        driver?.phone
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(-1);
        }, 2000);
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Signalement envoyé !</h2>
          <p className="text-gray-600">Notre équipe va traiter votre demande rapidement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-5 safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-lg font-bold uppercase tracking-wide">Signaler un problème</h1>
          </div>
        </div>
        {trackingCode && (
          <p className="mt-2 ml-11 text-white/90 font-medium">
            Course #{trackingCode}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {/* Question */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quel est le problème ?
        </h2>

        {/* Incident Types - Radio List */}
        <div className="space-y-2 mb-6">
          {DRIVER_INCIDENT_TYPES.map((type) => (
            <label
              key={type.id}
              className={`flex items-center gap-3 p-4 bg-white rounded-xl border-2 cursor-pointer transition-all ${
                selectedType === type.code
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="incident_type"
                value={type.code}
                checked={selectedType === type.code}
                onChange={() => setSelectedType(type.code)}
                className="w-5 h-5 text-orange-500 border-gray-300 focus:ring-orange-500"
              />
              <span className={`flex-1 ${
                selectedType === type.code ? 'text-orange-700 font-medium' : 'text-gray-700'
              }`}>
                {type.label}
              </span>
            </label>
          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-200 my-6" />

        {/* Description */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            Décris le problème :
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Le client ne répond pas au téléphone depuis 15 minutes..."
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none text-gray-700 placeholder-gray-400"
          />
        </div>

        {/* Amount (if required) */}
        {selectedIncidentType?.requiresAmount && (
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Montant concerné (FCFA) :
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 5000"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-700"
            />
          </div>
        )}

        {/* Photos */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            <span className="flex items-center gap-2">
              📸 Ajouter des photos {selectedIncidentType?.requiresPhoto ? '' : '(optionnel)'}
            </span>
          </label>

          {/* Photo Previews */}
          {photoPreviews.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Photo ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Photo Button */}
          {photos.length < 5 && (
            <label className="inline-flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer transition-colors font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 safe-bottom">
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedType || !description.trim()}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-lg uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] transition-transform"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Envoi en cours...
            </span>
          ) : (
            'Envoyer le signalement'
          )}
        </button>
      </div>
    </div>
  );
}
