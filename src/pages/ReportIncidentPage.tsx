/**
 * MODULE 6.2 - Écran Signalement (App Livreur)
 * Page pour signaler un problème pendant une livraison
 * Uses native <form>/<select> for Capacitor WebView reliability
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  AlertTriangle,
  Camera,
  X as XIcon,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { incidentService } from "../services/incidentService";
import { DRIVER_INCIDENT_TYPES } from "../types/incidents";

export default function ReportIncidentPage() {
  const { id: deliveryId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { driver, user } = useAuth();

  const trackingCode =
    (location.state as { trackingCode?: string } | null)?.trackingCode ||
    deliveryId?.slice(0, 8).toUpperCase();

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError("Maximum 5 photos");
      return;
    }
    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    setError(null);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const selectedType = formData.get("incident_type") as string;
    const descValue = (formData.get("description") as string)?.trim() || "";
    const amountValue = (formData.get("amount") as string) || "";

    const selectedIncidentType = DRIVER_INCIDENT_TYPES.find(
      (t) => t.code === selectedType,
    );

    if (!selectedType) {
      setError("Sélectionnez un type de problème");
      return;
    }
    if (!descValue) {
      setError("Décrivez le problème");
      return;
    }
    if (selectedIncidentType?.requiresPhoto && photos.length === 0) {
      setError("Photo requise pour ce type");
      return;
    }
    if (selectedIncidentType?.requiresAmount && !amountValue) {
      setError("Indiquez le montant");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const url = await incidentService.uploadPhoto(photo);
        if (url) uploadedUrls.push(url);
      }

      const result = await incidentService.createIncident(
        {
          delivery_id: deliveryId || "",
          tracking_code: trackingCode,
          incident_type: selectedType,
          title: selectedIncidentType?.label || selectedType,
          description: descValue,
          photos: uploadedUrls,
          disputed_amount: amountValue ? parseFloat(amountValue) : undefined,
        },
        user?.id || "",
        driver?.id || "",
        driver?.full_name,
        driver?.phone,
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate(-1), 2000);
      } else {
        setError(result.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="h-mobile-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Signalement envoyé !
          </h2>
          <p className="text-sm text-gray-600">
            Notre équipe va traiter votre demande.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-mobile-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2.5 safe-top">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onTouchEnd={() => navigate(-1)}
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <AlertTriangle className="w-4 h-4" />
          <h1 className="text-sm font-bold uppercase tracking-wide flex-1">
            Signaler un problème
          </h1>
        </div>
        {trackingCode && (
          <p className="text-xs text-white/80 ml-10">Course #{trackingCode}</p>
        )}
      </div>

      {/* Native form - most reliable in WebView */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3 space-y-3">
            {/* Type selection - native <select> */}
            <div>
              <label
                htmlFor="incident_type"
                className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 block"
              >
                Quel est le problème ?
              </label>
              <select
                id="incident_type"
                name="incident_type"
                required
                defaultValue=""
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 appearance-auto"
              >
                <option value="" disabled>
                  -- Choisir le type --
                </option>
                {DRIVER_INCIDENT_TYPES.map((type) => (
                  <option key={type.id} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description - native textarea */}
            <div>
              <label
                htmlFor="description"
                className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 block"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                placeholder="Décrivez le problème..."
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 resize-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
              />
            </div>

            {/* Amount - always rendered but hidden if not needed, avoids conditional DOM issues */}
            <div>
              <label
                htmlFor="amount"
                className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 block"
              >
                Montant en FCFA (si applicable)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                placeholder="Ex: 5000"
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 text-gray-700 dark:text-gray-200"
              />
            </div>

            {/* Photos */}
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                Photos (optionnel)
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        removePhoto(index);
                      }}
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-16 h-16 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center active:bg-gray-200">
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      Photo
                    </span>
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
            </div>
          </div>
        </div>

        {/* Bottom bar with error + submit */}
        <div className="flex-shrink-0 px-3 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom">
          {/* Error shown right above button - always visible */}
          {error && (
            <div className="mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-bold uppercase tracking-wide disabled:opacity-50 shadow-md active:scale-[0.98] transition-transform"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi en cours...
              </span>
            ) : (
              "Envoyer le signalement"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
