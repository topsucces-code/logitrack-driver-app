import { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  CreditCard,
  User,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { DocumentType, VerificationStatus } from '../types/trust';
import { uploadIdentityDocument, getVerificationStatus } from '../services/trustService';
import { useAuth } from '../contexts/AuthContext';

interface IdentityVerificationProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: string; description: string }[] = [
  {
    value: 'cni',
    label: 'Carte Nationale d\'Identité',
    icon: '🪪',
    description: 'CNI ivoirienne valide',
  },
  {
    value: 'passport',
    label: 'Passeport',
    icon: '📕',
    description: 'Passeport valide',
  },
  {
    value: 'permis',
    label: 'Permis de Conduire',
    icon: '🚗',
    description: 'Permis de conduire valide',
  },
  {
    value: 'carte_consulaire',
    label: 'Carte Consulaire',
    icon: '🌍',
    description: 'Pour les résidents étrangers',
  },
];

export function IdentityVerification({ onComplete, onSkip }: IdentityVerificationProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'front' | 'back' | 'selfie' | 'processing' | 'result'>('select');
  const [documentType, setDocumentType] = useState<DocumentType>('cni');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    status: VerificationStatus;
    score?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Créer une preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'front') {
        setFrontImage(file);
        setFrontPreview(preview);
      } else if (type === 'back') {
        setBackImage(file);
        setBackPreview(preview);
      } else {
        setSelfieImage(file);
        setSelfiePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user || !frontImage || !selfieImage) {
      setError('Veuillez fournir toutes les images requises');
      return;
    }

    setStep('processing');
    setLoading(true);
    setError('');

    try {
      const result = await uploadIdentityDocument(
        user.id,
        documentType,
        frontImage,
        backImage,
        selfieImage
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Attendre un peu pour la vérification IA
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Récupérer le statut
      const status = await getVerificationStatus(user.id);
      setVerificationResult({
        status: status?.verification_status || 'pending',
        score: status?.verification_score,
      });

      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification');
      setStep('selfie');
    } finally {
      setLoading(false);
    }
  };

  const needsBackImage = documentType === 'cni' || documentType === 'permis';

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 px-4 py-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-8 h-8" />
          <h1 className="text-xl font-bold">Vérification d'Identité</h1>
        </div>
        <p className="text-white/80 text-sm">
          Vérifiez votre identité pour augmenter votre score de confiance
        </p>

        {/* Progress */}
        <div className="flex gap-2 mt-4">
          {['select', 'front', 'back', 'selfie', 'result'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                ['select', 'front', 'back', 'selfie', 'processing', 'result'].indexOf(step) >= i
                  ? 'bg-white'
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Étape 1: Sélection du document */}
        {step === 'select' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Type de document
            </h2>

            <div className="space-y-3">
              {DOCUMENT_TYPES.map((doc) => (
                <button
                  key={doc.value}
                  onClick={() => setDocumentType(doc.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    documentType === doc.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl">{doc.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">{doc.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{doc.description}</p>
                  </div>
                  {documentType === doc.value && (
                    <CheckCircle2 className="w-5 h-5 text-primary-500" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('front')}
              className="w-full mt-6 py-3 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              Continuer
              <ChevronRight className="w-5 h-5" />
            </button>

            {onSkip && (
              <button
                onClick={onSkip}
                className="w-full mt-3 py-3 text-gray-500 dark:text-gray-400 text-sm"
              >
                Passer cette étape
              </button>
            )}
          </div>
        )}

        {/* Étape 2: Photo recto */}
        {step === 'front' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Photo du recto
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Prenez une photo claire de l'avant de votre document
            </p>

            <ImageCapture
              preview={frontPreview}
              onCapture={(e) => handleFileSelect(e, 'front')}
              placeholder="📸 Recto du document"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={() => setStep(needsBackImage ? 'back' : 'selfie')}
                disabled={!frontImage}
                className="flex-1 py-3 btn-gradient text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: Photo verso (si nécessaire) */}
        {step === 'back' && needsBackImage && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Photo du verso
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Prenez une photo claire de l'arrière de votre document
            </p>

            <ImageCapture
              preview={backPreview}
              onCapture={(e) => handleFileSelect(e, 'back')}
              placeholder="📸 Verso du document"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('front')}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={() => setStep('selfie')}
                disabled={!backImage}
                className="flex-1 py-3 btn-gradient text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 4: Selfie */}
        {step === 'selfie' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Photo selfie
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Prenez un selfie avec votre visage bien visible pour la comparaison
            </p>

            <ImageCapture
              preview={selfiePreview}
              onCapture={(e) => handleFileSelect(e, 'selfie')}
              placeholder="🤳 Votre selfie"
              isSelfie
            />

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(needsBackImage ? 'back' : 'front')}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selfieImage || loading}
                className="flex-1 py-3 btn-gradient text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Étape 5: Traitement */}
        {step === 'processing' && (
          <div className="animate-fade-in text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Vérification en cours
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Notre IA analyse vos documents...<br />
              Cela peut prendre quelques secondes.
            </p>

            <div className="mt-8 space-y-3">
              <ProcessingStep label="Analyse du document" status="done" />
              <ProcessingStep label="Extraction des données" status="done" />
              <ProcessingStep label="Comparaison faciale" status="loading" />
              <ProcessingStep label="Vérification finale" status="pending" />
            </div>
          </div>
        )}

        {/* Étape 6: Résultat */}
        {step === 'result' && verificationResult && (
          <div className="animate-fade-in text-center py-8">
            {verificationResult.status === 'verified' ? (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Identité Vérifiée !
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Votre score de confiance a été mis à jour.<br />
                  Score de vérification: <strong>{verificationResult.score}%</strong>
                </p>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6">
                  <p className="text-green-700 dark:text-green-400 text-sm">
                    ✓ Badge "Identité Vérifiée" obtenu<br />
                    ✓ +10 points de fiabilité
                  </p>
                </div>
              </>
            ) : verificationResult.status === 'rejected' ? (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Vérification échouée
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Nous n'avons pas pu vérifier votre identité.<br />
                  Veuillez réessayer avec des photos plus claires.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-yellow-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  En cours de révision
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Vos documents sont en cours de révision manuelle.<br />
                  Vous serez notifié une fois la vérification terminée.
                </p>
              </>
            )}

            <button
              onClick={onComplete}
              className="w-full py-3 btn-gradient text-white font-semibold rounded-xl"
            >
              Continuer
            </button>

            {verificationResult.status === 'rejected' && (
              <button
                onClick={() => {
                  setStep('select');
                  setFrontImage(null);
                  setBackImage(null);
                  setSelfieImage(null);
                  setFrontPreview('');
                  setBackPreview('');
                  setSelfiePreview('');
                }}
                className="w-full mt-3 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant de capture d'image
function ImageCapture({
  preview,
  onCapture,
  placeholder,
  isSelfie = false,
}: {
  preview: string;
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  isSelfie?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      {preview ? (
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full text-white"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-3 hover:border-primary-500 transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <span className="text-gray-500 dark:text-gray-400 font-medium">{placeholder}</span>
          <span className="text-xs text-gray-400">Appuyez pour prendre une photo</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={isSelfie ? 'user' : 'environment'}
        onChange={onCapture}
        className="hidden"
      />
    </div>
  );
}

// Étape de traitement
function ProcessingStep({
  label,
  status,
}: {
  label: string;
  status: 'pending' | 'loading' | 'done';
}) {
  return (
    <div className="flex items-center gap-3 text-left">
      {status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
      {status === 'loading' && <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />}
      {status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
      <span
        className={
          status === 'done'
            ? 'text-green-600 dark:text-green-400'
            : status === 'loading'
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-400'
        }
      >
        {label}
      </span>
    </div>
  );
}
