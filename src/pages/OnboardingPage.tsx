import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverLogger } from '../utils/logger';
import {
  ArrowLeft,
  ArrowRight,
  User,
  CreditCard,
  Truck,
  MapPin,
  Smartphone,
  Camera,
  Check,
  Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FALLBACK_ZONES, MOBILE_MONEY_PROVIDERS } from '../config/app.config';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import {
  onboardingPersonalInfoSchema,
  onboardingCniSchema,
  onboardingVehicleSchema,
  onboardingZonesSchema,
  onboardingMomoSchema,
  validateForm,
} from '../lib/validations';

// Compress image before upload
async function compressImage(base64: string, maxWidth = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // fallback to original if compression fails
    img.src = base64;
  });
}

// Zone type from database
interface Zone {
  id: string;
  name: string;
}

interface OnboardingData {
  fullName: string;
  profilePhoto: string | null;
  cniNumber: string;
  cniFront: string | null;
  cniBack: string | null;
  vehicleType: 'moto' | 'tricycle' | 'voiture' | 'velo' | '';
  vehiclePhoto: string | null;
  vehiclePlate: string;
  licensePhoto: string | null;
  zones: string[];
  mobileMoneyProvider: string;
  mobileMoneyNumber: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshDriver } = useAuth();
  const { showError: showToastError, showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentPhotoField, setCurrentPhotoField] = useState<string | null>(null);
  // Initialize with fallback zones immediately, then try to fetch from DB
  const [availableZones, setAvailableZones] = useState<Zone[]>(
    FALLBACK_ZONES.map((name, idx) => ({ id: `fallback-${idx}`, name }))
  );
  const [zonesLoading, setZonesLoading] = useState(false);

  // Try to fetch zones from database (optional enhancement)
  useEffect(() => {
    async function loadZones() {
      try {
        const { data, error } = await supabase
          .from('logitrack_zones')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (!error && data && data.length > 0) {
          setAvailableZones(data);
        }
      } catch {
        // Keep using fallback zones
      }
    }
    loadZones();
  }, []);

  const [data, setData] = useState<OnboardingData>({
    fullName: '',
    profilePhoto: null,
    cniNumber: '',
    cniFront: null,
    cniBack: null,
    vehicleType: '',
    vehiclePhoto: null,
    vehiclePlate: '',
    licensePhoto: null,
    zones: [],
    mobileMoneyProvider: '',
    mobileMoneyNumber: '',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalSteps = 5;

  // Take or select photo
  async function handlePhotoCapture(field: string) {
    try {
      if (Capacitor.isNativePlatform()) {
        const photo = await CapCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
        });

        if (photo.base64String) {
          const raw = `data:image/jpeg;base64,${photo.base64String}`;
          const compressed = await compressImage(raw);
          setData(prev => ({ ...prev, [field]: compressed }));
        }
      } else {
        setCurrentPhotoField(field);
        fileInputRef.current?.click();
      }
    } catch (err) {
      driverLogger.error('Photo capture error', { error: err });
      showToastError('Impossible de capturer la photo. Vérifiez les permissions de la caméra.');
    }
  }

  // Handle file input change (web)
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && currentPhotoField) {
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressImage(reader.result as string);
        setData(prev => ({
          ...prev,
          [currentPhotoField]: compressed,
        }));
      };
      reader.readAsDataURL(file);
    }
    setCurrentPhotoField(null);
  }

  // Toggle zone selection
  function toggleZone(zone: string) {
    setData(prev => ({
      ...prev,
      zones: prev.zones.includes(zone)
        ? prev.zones.filter(z => z !== zone)
        : [...prev.zones, zone],
    }));
  }

  // Upload photo to storage
  async function uploadPhoto(base64: string, bucket: string, path: string): Promise<string | null> {
    try {
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err) {
      driverLogger.error('Upload error', { error: err });
      return null;
    }
  }

  // Submit registration
  async function handleSubmit() {
    setSubmitError(null);

    if (!user) {
      driverLogger.error('handleSubmit: No user session found');
      setSubmitError('Session expirée. Veuillez vous reconnecter.');
      // Redirect to auth after a short delay
      setTimeout(() => navigate('/auth'), 2000);
      return;
    }

    setLoading(true);

    try {
      const userId = user.id;

      // Upload all photos
      const [
        profilePhotoUrl,
        cniFrontUrl,
        cniBackUrl,
        _vehiclePhotoUrl, // Uploaded to storage but not stored in DB yet
        licenseUrl,
      ] = await Promise.all([
        data.profilePhoto ? uploadPhoto(data.profilePhoto, 'driver-photos', `${userId}/profile.jpg`) : null,
        data.cniFront ? uploadPhoto(data.cniFront, 'driver-documents', `${userId}/cni-front.jpg`) : null,
        data.cniBack ? uploadPhoto(data.cniBack, 'driver-documents', `${userId}/cni-back.jpg`) : null,
        data.vehiclePhoto ? uploadPhoto(data.vehiclePhoto, 'driver-documents', `${userId}/vehicle.jpg`) : null,
        data.licensePhoto ? uploadPhoto(data.licensePhoto, 'driver-documents', `${userId}/license.jpg`) : null,
      ]);

      // Convert zone names to UUIDs
      // If zones were loaded from DB, use their IDs directly
      // If using fallback zones, try to resolve names to real IDs from DB
      let zoneIds: string[] = [];
      const hasRealZones = availableZones.length > 0 && !availableZones[0]?.id.startsWith('fallback-');
      if (hasRealZones) {
        zoneIds = data.zones
          .map(zoneName => availableZones.find(z => z.name === zoneName)?.id)
          .filter((id): id is string => id !== undefined && !id.startsWith('fallback-'));
      } else {
        // Fallback zones: resolve names to real UUIDs from logitrack_zones
        const { data: dbZones } = await supabase
          .from('logitrack_zones')
          .select('id, name')
          .in('name', data.zones);
        if (dbZones && dbZones.length > 0) {
          zoneIds = dbZones.map(z => z.id);
        }
      }

      const driverData: Record<string, unknown> = {
        user_id: userId,
        full_name: data.fullName,
        phone: user.user_metadata?.phone || data.mobileMoneyNumber,
        photo_url: profilePhotoUrl,
        id_card_front_url: cniFrontUrl,
        id_card_back_url: cniBackUrl,
        vehicle_type: data.vehicleType,
        vehicle_plate: data.vehiclePlate,
        driving_license_url: licenseUrl,
        // Only include secondary_zones if we have valid UUIDs
        ...(zoneIds.length > 0 ? { secondary_zones: zoneIds } : {}),
        momo_provider: data.mobileMoneyProvider,
        momo_number: data.mobileMoneyNumber,
        // New schema defaults
        driver_type: 'independent',
        status: 'pending',
        verification_status: 'pending',
        is_online: false,
        is_available: true,
        updated_at: new Date().toISOString(),
      };

      // Update or create driver profile in logitrack_drivers
      const { error } = await supabase
        .from('logitrack_drivers')
        .upsert(driverData, { onConflict: 'user_id' })
        .select();

      if (error) {
        throw error;
      }

      await refreshDriver();
      showSuccess('Inscription terminée !');
      navigate('/');
    } catch (err) {
      driverLogger.error('Registration error', { error: err });
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'inscription. Veuillez réessayer.';
      setSubmitError(errorMessage);
    }

    setLoading(false);
  }

  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Validation for each step using Zod schemas
  function validateStep(): { isValid: boolean; errors: Record<string, string> } {
    let result;
    switch (step) {
      case 1:
        result = validateForm(onboardingPersonalInfoSchema, {
          fullName: data.fullName,
          profilePhoto: data.profilePhoto,
        });
        break;
      case 2:
        result = validateForm(onboardingCniSchema, {
          cniNumber: data.cniNumber,
          cniFront: data.cniFront,
          cniBack: data.cniBack,
        });
        break;
      case 3:
        result = validateForm(onboardingVehicleSchema, {
          vehicleType: data.vehicleType || undefined,
          vehiclePhoto: data.vehiclePhoto,
          vehiclePlate: data.vehiclePlate || undefined,
        });
        break;
      case 4:
        result = validateForm(onboardingZonesSchema, {
          zones: data.zones,
        });
        break;
      case 5:
        result = validateForm(onboardingMomoSchema, {
          mobileMoneyProvider: data.mobileMoneyProvider || undefined,
          mobileMoneyNumber: data.mobileMoneyNumber,
        });
        break;
      default:
        return { isValid: false, errors: {} };
    }

    if (result.success) {
      return { isValid: true, errors: {} };
    }
    return { isValid: false, errors: result.errors };
  }

  function canProceed(): boolean {
    return validateStep().isValid;
  }

  function handleNext() {
    const { isValid, errors } = validateStep();
    if (!isValid) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Hidden file input for web */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 safe-top px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Inscription Livreur</h1>
            <p className="text-xs text-gray-500">Étape {step} sur {totalSteps}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i < step ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Profile Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Vos informations</h2>
              <p className="text-gray-500 text-xs">Commençons par votre profil</p>
            </div>

            {/* Profile Photo */}
            <div className="flex justify-center">
              <button
                onClick={() => handlePhotoCapture('profilePhoto')}
                className="relative"
              >
                {data.profilePhoto ? (
                  <img
                    src={data.profilePhoto}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-3 border-primary-500"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center border-3 border-dashed border-gray-300">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Camera className="w-4 h-4" />
                </div>
              </button>
            </div>
            <p className="text-center text-xs text-gray-500">Prenez une photo de profil claire</p>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Nom complet
              </label>
              <input
                type="text"
                value={data.fullName}
                onChange={(e) => setData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Ex: Kouamé Jean-Baptiste"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: ID Documents */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Pièce d'identité</h2>
              <p className="text-gray-500 text-xs">Pour vérifier votre identité</p>
            </div>

            {/* CNI Number */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Numéro CNI
              </label>
              <input
                type="text"
                value={data.cniNumber}
                onChange={(e) => setData(prev => ({ ...prev, cniNumber: e.target.value }))}
                placeholder="Ex: CI-1234567890"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* CNI Photos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">Recto CNI</p>
                <button
                  onClick={() => handlePhotoCapture('cniFront')}
                  className="w-full aspect-[1.6] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
                >
                  {data.cniFront ? (
                    <img src={data.cniFront} alt="CNI Front" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Photo recto</span>
                    </>
                  )}
                </button>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">Verso CNI</p>
                <button
                  onClick={() => handlePhotoCapture('cniBack')}
                  className="w-full aspect-[1.6] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
                >
                  {data.cniBack ? (
                    <img src={data.cniBack} alt="CNI Back" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Photo verso</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Vehicle */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Truck className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Votre véhicule</h2>
              <p className="text-gray-500 text-xs">Informations sur votre moyen de transport</p>
            </div>

            {/* Vehicle Type */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Type de véhicule</p>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { type: 'moto' as const, label: 'Moto', icon: '🏍️' },
                  { type: 'tricycle' as const, label: 'Tricycle', icon: '🛺' },
                  { type: 'voiture' as const, label: 'Voiture', icon: '🚗' },
                  { type: 'velo' as const, label: 'Vélo', icon: '🚲' },
                ]).map((v) => (
                  <button
                    key={v.type}
                    onClick={() => setData(prev => ({ ...prev, vehicleType: v.type }))}
                    className={`p-2.5 rounded-lg border-2 text-center transition-colors ${
                      data.vehicleType === v.type
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{v.icon}</span>
                    <p className="font-medium text-gray-900 mt-1 text-[10px]">{v.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Photo */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">Photo du véhicule</p>
              <button
                onClick={() => handlePhotoCapture('vehiclePhoto')}
                className="w-full aspect-[2/1] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
              >
                {data.vehiclePhoto ? (
                  <img src={data.vehiclePhoto} alt="Vehicle" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Prenez une photo de votre véhicule</span>
                  </>
                )}
              </button>
            </div>

            {/* Vehicle Plate (optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Plaque d'immatriculation (si applicable)
              </label>
              <input
                type="text"
                value={data.vehiclePlate}
                onChange={(e) => setData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                placeholder="Ex: 1234 AB 01"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* License (if not vélo) */}
            {data.vehicleType && data.vehicleType !== 'velo' && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">Permis de conduire</p>
                <button
                  onClick={() => handlePhotoCapture('licensePhoto')}
                  className="w-full aspect-[1.6] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
                >
                  {data.licensePhoto ? (
                    <img src={data.licensePhoto} alt="License" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-1" />
                      <span className="text-sm text-gray-500">Photo du permis</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Zones */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Zones de livraison</h2>
              <p className="text-gray-500 text-xs">Sélectionnez vos quartiers de livraison</p>
            </div>

            <div className="bg-primary-50 rounded-lg p-2.5 text-xs text-primary-700">
              <p>Sélectionnez au moins 1 zone. Vous recevrez uniquement les courses dans ces zones.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {zonesLoading ? (
                <div className="w-full flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-gray-500 text-sm">Chargement des zones...</span>
                </div>
              ) : availableZones.length > 0 ? (
                availableZones.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => toggleZone(zone.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      data.zones.includes(zone.name)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {data.zones.includes(zone.name) && <Check className="w-4 h-4 inline mr-1" />}
                    {zone.name}
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Aucune zone disponible</p>
              )}
            </div>

            <p className="text-sm text-gray-500 text-center">
              {data.zones.length} zone(s) sélectionnée(s)
            </p>
          </div>
        )}

        {/* Step 5: Mobile Money */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Paiement Mobile Money</h2>
              <p className="text-gray-500 text-xs">Pour recevoir vos gains</p>
            </div>

            {/* Provider Selection */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Opérateur</p>
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_MONEY_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setData(prev => ({ ...prev, mobileMoneyProvider: provider.id }))}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      data.mobileMoneyProvider === provider.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 ${provider.color} rounded-full mx-auto mb-1.5`} />
                    <p className="font-medium text-gray-900 text-xs">{provider.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Money Number */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Numéro Mobile Money
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 text-sm font-medium">
                  +225
                </span>
                <input
                  type="tel"
                  value={data.mobileMoneyNumber}
                  onChange={(e) => setData(prev => ({ ...prev, mobileMoneyNumber: e.target.value.replace(/\D/g, '') }))}
                  placeholder="07 XX XX XX XX"
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 mt-4">
              <h3 className="font-medium text-gray-900 text-sm mb-2">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nom</span>
                  <span className="font-medium">{data.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Véhicule</span>
                  <span className="font-medium capitalize">{data.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Zones</span>
                  <span className="font-medium">{data.zones.length} zones</span>
                </div>
              </div>
            </div>

            {/* Error display */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-red-600 text-xs font-medium">Erreur</p>
                <p className="text-red-600 text-xs mt-1">{submitError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0 safe-bottom">
        {/* Step validation errors */}
        {Object.keys(stepErrors).length > 0 && (
          <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
            <ul className="text-xs text-red-600 space-y-1">
              {Object.values(stepErrors).map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          loading={loading}
          fullWidth
          size="lg"
          icon={step < totalSteps ? <ArrowRight className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          iconPosition={step < totalSteps ? 'right' : 'left'}
        >
          {step < totalSteps ? 'Continuer' : "Terminer l'inscription"}
        </Button>
      </div>
    </div>
  );
}
// Build: 1770233926
