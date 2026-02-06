import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  X,
  Upload,
  Loader2,
  MapPin,
  Package,
  User,
  Pencil,
  Image as ImageIcon,
  RefreshCw,
  Send,
  AlertCircle,
} from 'lucide-react';
import { uploadDeliveryProof, saveSignature, getDeliveryProofs } from '../services/trustService';
import { DeliveryProof } from '../types/trust';
import { useAuth } from '../contexts/AuthContext';

interface DeliveryProofCaptureProps {
  deliveryId: string;
  onComplete: () => void;
  onCancel: () => void;
  requireRecipientPhoto?: boolean;
  requireSignature?: boolean;
}

type ProofStep = 'package' | 'recipient' | 'signature' | 'review' | 'uploading' | 'done';

export function DeliveryProofCapture({
  deliveryId,
  onComplete,
  onCancel,
  requireRecipientPhoto = true,
  requireSignature = false,
}: DeliveryProofCaptureProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<ProofStep>('package');
  const [packagePhoto, setPackagePhoto] = useState<File | null>(null);
  const [packagePreview, setPackagePreview] = useState('');
  const [recipientPhoto, setRecipientPhoto] = useState<File | null>(null);
  const [recipientPreview, setRecipientPreview] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [signerName, setSignerName] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Obtenir la position GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => console.error('Erreur GPS:', err)
      );
    }
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, type: 'package' | 'recipient') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'package') {
        setPackagePhoto(file);
        setPackagePreview(preview);
      } else {
        setRecipientPhoto(file);
        setRecipientPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  // Fonctions pour la signature
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleSubmit = async () => {
    if (!user || !packagePhoto) {
      setError('La photo du colis est obligatoire');
      return;
    }

    if (requireRecipientPhoto && !recipientPhoto) {
      setError('La photo du destinataire est obligatoire');
      return;
    }

    if (requireSignature && (!signatureData || !signerName)) {
      setError('La signature et le nom sont obligatoires');
      return;
    }

    setStep('uploading');
    setLoading(true);
    setError('');

    try {
      // Upload photo du colis
      const packageResult = await uploadDeliveryProof(
        deliveryId,
        user.id,
        packagePhoto,
        'package',
        location || undefined
      );
      if (!packageResult.success) throw new Error(packageResult.error);

      // Upload photo du destinataire
      if (recipientPhoto) {
        const recipientResult = await uploadDeliveryProof(
          deliveryId,
          user.id,
          recipientPhoto,
          'recipient',
          location || undefined
        );
        if (!recipientResult.success) throw new Error(recipientResult.error);
      }

      // Sauvegarder la signature
      if (signatureData && signerName) {
        const signatureResult = await saveSignature(deliveryId, signatureData, signerName);
        if (!signatureResult.success) throw new Error(signatureResult.error);
      }

      setStep('done');
      setTimeout(() => onComplete(), 1500);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  const goToNextStep = () => {
    if (step === 'package' && packagePhoto) {
      setStep(requireRecipientPhoto ? 'recipient' : requireSignature ? 'signature' : 'review');
    } else if (step === 'recipient' && recipientPhoto) {
      setStep(requireSignature ? 'signature' : 'review');
    } else if (step === 'signature') {
      setStep('review');
    }
  };

  const goToPrevStep = () => {
    if (step === 'recipient') setStep('package');
    else if (step === 'signature') setStep(requireRecipientPhoto ? 'recipient' : 'package');
    else if (step === 'review') setStep(requireSignature ? 'signature' : requireRecipientPhoto ? 'recipient' : 'package');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between safe-top">
        <button onClick={onCancel} className="p-2 text-white">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-semibold">
          {step === 'package' && 'Photo du colis'}
          {step === 'recipient' && 'Photo destinataire'}
          {step === 'signature' && 'Signature'}
          {step === 'review' && 'Vérification'}
          {step === 'uploading' && 'Envoi en cours'}
          {step === 'done' && 'Terminé'}
        </h2>
        <div className="w-10" />
      </div>

      {/* Progress */}
      <div className="bg-gray-900 px-4 pb-3">
        <div className="flex gap-1">
          <div className={`h-1 flex-1 rounded-full ${step !== 'package' ? 'bg-green-500' : 'bg-primary-500'}`} />
          {requireRecipientPhoto && (
            <div className={`h-1 flex-1 rounded-full ${
              ['recipient'].includes(step) ? 'bg-primary-500' :
              ['signature', 'review', 'uploading', 'done'].includes(step) ? 'bg-green-500' : 'bg-gray-600'
            }`} />
          )}
          {requireSignature && (
            <div className={`h-1 flex-1 rounded-full ${
              step === 'signature' ? 'bg-primary-500' :
              ['review', 'uploading', 'done'].includes(step) ? 'bg-green-500' : 'bg-gray-600'
            }`} />
          )}
          <div className={`h-1 flex-1 rounded-full ${
            ['review', 'uploading', 'done'].includes(step) ? 'bg-green-500' : 'bg-gray-600'
          }`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Photo du colis */}
        {step === 'package' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              {packagePreview ? (
                <div className="relative w-full max-w-sm">
                  <img src={packagePreview} alt="Colis" loading="lazy" className="w-full rounded-2xl" />
                  <button
                    onClick={() => {
                      setPackagePhoto(null);
                      setPackagePreview('');
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-sm aspect-[4/3] rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Package className="w-10 h-10 text-primary-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Photographiez le colis</p>
                    <p className="text-white/60 text-sm mt-1">Assurez-vous qu'il est bien visible</p>
                  </div>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoCapture(e, 'package')}
              className="hidden"
            />

            {location && (
              <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                <MapPin className="w-4 h-4" />
                <span>Position GPS enregistrée</span>
              </div>
            )}

            <button
              onClick={goToNextStep}
              disabled={!packagePhoto}
              className="w-full py-4 bg-primary-500 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              Continuer
            </button>
          </div>
        )}

        {/* Photo du destinataire */}
        {step === 'recipient' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              {recipientPreview ? (
                <div className="relative w-full max-w-sm">
                  <img src={recipientPreview} alt="Destinataire" loading="lazy" className="w-full rounded-2xl" />
                  <button
                    onClick={() => {
                      setRecipientPhoto(null);
                      setRecipientPreview('');
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-sm aspect-[4/3] rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="w-10 h-10 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Photo du destinataire</p>
                    <p className="text-white/60 text-sm mt-1">Avec son consentement</p>
                  </div>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => handlePhotoCapture(e, 'recipient')}
              className="hidden"
            />

            <div className="flex gap-3">
              <button
                onClick={goToPrevStep}
                className="flex-1 py-4 border border-white/30 text-white font-medium rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={goToNextStep}
                disabled={!recipientPhoto}
                className="flex-1 py-4 bg-primary-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Signature */}
        {step === 'signature' && (
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <label className="block text-white text-sm mb-2">Nom du signataire</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Nom complet"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
              />
            </div>

            <div className="flex-1">
              <label className="block text-white text-sm mb-2">Signature</label>
              <div className="relative bg-white rounded-xl overflow-hidden" style={{ height: '200px' }}>
                <canvas
                  ref={canvasRef}
                  width={350}
                  height={200}
                  className="w-full h-full touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!signatureData && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-400">Signez ici</p>
                  </div>
                )}
              </div>
              <button
                onClick={clearSignature}
                className="mt-2 text-sm text-primary-400 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Effacer
              </button>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={goToPrevStep}
                className="flex-1 py-4 border border-white/30 text-white font-medium rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={goToNextStep}
                disabled={!signatureData || !signerName}
                className="flex-1 py-4 bg-primary-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <h3 className="text-white font-medium mb-4">Vérifiez les preuves</h3>

            <div className="bg-gray-800 rounded-xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-primary-400" />
                <span className="text-white text-sm">Photo du colis</span>
                <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
              </div>
              {packagePreview && (
                <img src={packagePreview} alt="Colis" loading="lazy" className="w-full h-32 object-cover rounded-lg" />
              )}
            </div>

            {recipientPreview && (
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <span className="text-white text-sm">Photo destinataire</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                </div>
                <img src={recipientPreview} alt="Destinataire" loading="lazy" className="w-full h-32 object-cover rounded-lg" />
              </div>
            )}

            {signatureData && (
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-3 mb-2">
                  <Pencil className="w-5 h-5 text-purple-400" />
                  <span className="text-white text-sm">Signature de {signerName}</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                </div>
                <img src={signatureData} alt="Signature" className="w-full h-20 object-contain bg-white rounded-lg" />
              </div>
            )}

            {location && (
              <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-400" />
                <span className="text-white text-sm">Position GPS enregistrée</span>
                <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={goToPrevStep}
                className="flex-1 py-4 border border-white/30 text-white font-medium rounded-xl"
              >
                Modifier
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-4 bg-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Confirmer
              </button>
            </div>
          </div>
        )}

        {/* Uploading */}
        {step === 'uploading' && (
          <div className="h-full flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 text-primary-500 animate-spin mb-4" />
            <p className="text-white font-medium">Envoi des preuves...</p>
            <p className="text-white/60 text-sm mt-1">Veuillez patienter</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-white font-medium text-lg">Preuves enregistrées !</p>
            <p className="text-white/60 text-sm mt-1">La livraison est confirmée</p>
          </div>
        )}
      </div>
    </div>
  );
}
