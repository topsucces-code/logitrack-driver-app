import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

// Zone type from database
interface Zone {
  id: string;
  name: string;
}

// Fallback zones for Abidjan (used if database fetch fails)
const FALLBACK_ZONES = [
  'Cocody', 'Plateau', 'Yopougon', 'Adjamé', 'Abobo',
  'Treichville', 'Marcory', 'Koumassi', 'Port-Bouët', 'Bingerville',
  'Anyama', 'Songon', 'Attécoubé', 'Riviera', 'Angré',
  '2 Plateaux', 'Palmeraie', 'Zone 4', 'Banco', 'Williamsville'
];

const MOBILE_MONEY_PROVIDERS = [
  { id: 'orange', name: 'Orange Money', color: 'bg-orange-500' },
  { id: 'mtn', name: 'MTN MoMo', color: 'bg-yellow-500' },
  { id: 'moov', name: 'Moov Money', color: 'bg-blue-500' },
  { id: 'wave', name: 'Wave', color: 'bg-cyan-500' },
];

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
    supabase
      .from('logitrack_zones')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          console.log('Loaded zones from DB:', data.length);
          setAvailableZones(data);
        }
      })
      .catch(() => {
        // Keep using fallback zones
      });
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
          setData(prev => ({
            ...prev,
            [field]: `data:image/jpeg;base64,${photo.base64String}`,
          }));
        }
      } else {
        setCurrentPhotoField(field);
        fileInputRef.current?.click();
      }
    } catch (err) {
      console.error('Photo capture error:', err);
    }
  }

  // Handle file input change (web)
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && currentPhotoField) {
      const reader = new FileReader();
      reader.onload = () => {
        setData(prev => ({
          ...prev,
          [currentPhotoField]: reader.result as string,
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
      console.error('Upload error:', err);
      return null;
    }
  }

  // Submit registration
  async function handleSubmit() {
    setSubmitError(null);

    if (!user) {
      console.error('handleSubmit: No user session found');
      setSubmitError('Session expirée. Veuillez vous reconnecter.');
      // Redirect to auth after a short delay
      setTimeout(() => navigate('/auth'), 2000);
      return;
    }

    setLoading(true);

    try {
      const userId = user.id;
      console.log('Starting registration for user:', userId);

      // Upload all photos
      console.log('Uploading photos...');
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
      console.log('Photos uploaded:', { profilePhotoUrl, cniFrontUrl, cniBackUrl, licenseUrl });

      // Map mobile money provider to the new enum format
      const momoProviderMap: Record<string, string> = {
        'orange': 'orange_money',
        'mtn': 'mtn_momo',
        'moov': 'moov_money',
        'wave': 'wave',
      };

      // Convert zone names to UUIDs if zones were loaded from database (real UUIDs, not fallback)
      // If using fallback zones (id starts with 'fallback-'), we skip secondary_zones
      let zoneIds: string[] = [];
      const hasRealZones = availableZones.length > 0 && !availableZones[0]?.id.startsWith('fallback-');
      if (hasRealZones) {
        zoneIds = data.zones
          .map(zoneName => availableZones.find(z => z.name === zoneName)?.id)
          .filter((id): id is string => id !== undefined && !id.startsWith('fallback-'));
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
        momo_provider: momoProviderMap[data.mobileMoneyProvider] || data.mobileMoneyProvider,
        momo_number: data.mobileMoneyNumber,
        // New schema defaults
        driver_type: 'independent',
        status: 'pending',
        verification_status: 'pending',
        is_online: false,
        is_available: true,
        updated_at: new Date().toISOString(),
      };
      console.log('Upserting driver data:', driverData);

      // Update or create driver profile in logitrack_drivers
      const { error, data: upsertResult } = await supabase
        .from('logitrack_drivers')
        .upsert(driverData, { onConflict: 'user_id' })
        .select();

      if (error) {
        console.error('Upsert error:', error);
        throw error;
      }

      console.log('Upsert successful:', upsertResult);

      await refreshDriver();
      console.log('Driver refreshed, navigating to home...');
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err?.message || err?.details || 'Erreur lors de l\'inscription. Veuillez réessayer.';
      setSubmitError(errorMessage);
    }

    setLoading(false);
  }

  // Validation for each step
  function canProceed(): boolean {
    switch (step) {
      case 1:
        return data.fullName.length >= 3 && data.profilePhoto !== null;
      case 2:
        return data.cniNumber.length >= 8 && data.cniFront !== null && data.cniBack !== null;
      case 3:
        return data.vehicleType !== '' && data.vehiclePhoto !== null;
      case 4:
        return data.zones.length >= 1;
      case 5:
        return data.mobileMoneyProvider !== '' && data.mobileMoneyNumber.length >= 8;
      default:
        return false;
    }
  }

  return (
    <div className="h-full min-h-screen bg-gray-50 flex flex-col overflow-hidden">
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
      <header className="bg-white border-b border-gray-200 safe-top px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Inscription Livreur</h1>
            <p className="text-sm text-gray-500">Étape {step} sur {totalSteps}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < step ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-6">
        {/* Step 1: Profile Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Vos informations</h2>
              <p className="text-gray-500 text-sm">Commençons par votre profil</p>
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
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary-500"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 border-dashed border-gray-300">
                    <Camera className="w-10 h-10 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Camera className="w-5 h-5" />
                </div>
              </button>
            </div>
            <p className="text-center text-sm text-gray-500">Prenez une photo de profil claire</p>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={data.fullName}
                onChange={(e) => setData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Ex: Kouamé Jean-Baptiste"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: ID Documents */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Pièce d'identité</h2>
              <p className="text-gray-500 text-sm">Pour vérifier votre identité</p>
            </div>

            {/* CNI Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro CNI
              </label>
              <input
                type="text"
                value={data.cniNumber}
                onChange={(e) => setData(prev => ({ ...prev, cniNumber: e.target.value }))}
                placeholder="Ex: CI-1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* CNI Photos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Recto CNI</p>
                <button
                  onClick={() => handlePhotoCapture('cniFront')}
                  className="w-full aspect-[1.6] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
                >
                  {data.cniFront ? (
                    <img src={data.cniFront} alt="CNI Front" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Photo recto</span>
                    </>
                  )}
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Verso CNI</p>
                <button
                  onClick={() => handlePhotoCapture('cniBack')}
                  className="w-full aspect-[1.6] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
                >
                  {data.cniBack ? (
                    <img src={data.cniBack} alt="CNI Back" className="w-full h-full object-cover" />
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
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Votre véhicule</h2>
              <p className="text-gray-500 text-sm">Informations sur votre moyen de transport</p>
            </div>

            {/* Vehicle Type */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Type de véhicule</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { type: 'moto', label: 'Moto', icon: '🏍️' },
                  { type: 'tricycle', label: 'Tricycle', icon: '🛺' },
                  { type: 'voiture', label: 'Voiture', icon: '🚗' },
                  { type: 'velo', label: 'Vélo', icon: '🚲' },
                ].map((v) => (
                  <button
                    key={v.type}
                    onClick={() => setData(prev => ({ ...prev, vehicleType: v.type as any }))}
                    className={`p-4 rounded-xl border-2 text-center transition-colors ${
                      data.vehicleType === v.type
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl">{v.icon}</span>
                    <p className="font-medium text-gray-900 mt-2">{v.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Photo */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Photo du véhicule</p>
              <button
                onClick={() => handlePhotoCapture('vehiclePhoto')}
                className="w-full aspect-video bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
              >
                {data.vehiclePhoto ? (
                  <img src={data.vehiclePhoto} alt="Vehicle" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Prenez une photo de votre véhicule</span>
                  </>
                )}
              </button>
            </div>

            {/* Vehicle Plate (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plaque d'immatriculation (si applicable)
              </label>
              <input
                type="text"
                value={data.vehiclePlate}
                onChange={(e) => setData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                placeholder="Ex: 1234 AB 01"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* License (if not vélo) */}
            {data.vehicleType && data.vehicleType !== 'velo' && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Permis de conduire</p>
                <button
                  onClick={() => handlePhotoCapture('licensePhoto')}
                  className="w-full aspect-[1.6] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden"
                >
                  {data.licensePhoto ? (
                    <img src={data.licensePhoto} alt="License" className="w-full h-full object-cover" />
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
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Zones de livraison</h2>
              <p className="text-gray-500 text-sm">Sélectionnez vos quartiers de livraison</p>
            </div>

            <div className="bg-primary-50 rounded-xl p-3 text-sm text-primary-700">
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
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Paiement Mobile Money</h2>
              <p className="text-gray-500 text-sm">Pour recevoir vos gains</p>
            </div>

            {/* Provider Selection */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Opérateur</p>
              <div className="grid grid-cols-2 gap-3">
                {MOBILE_MONEY_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setData(prev => ({ ...prev, mobileMoneyProvider: provider.id }))}
                    className={`p-4 rounded-xl border-2 text-center transition-colors ${
                      data.mobileMoneyProvider === provider.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 ${provider.color} rounded-full mx-auto mb-2`} />
                    <p className="font-medium text-gray-900 text-sm">{provider.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Money Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro Mobile Money
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-gray-600 font-medium">
                  +225
                </span>
                <input
                  type="tel"
                  value={data.mobileMoneyNumber}
                  onChange={(e) => setData(prev => ({ ...prev, mobileMoneyNumber: e.target.value.replace(/\D/g, '') }))}
                  placeholder="07 XX XX XX XX"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mt-8">
              <h3 className="font-medium text-gray-900 mb-3">Récapitulatif</h3>
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
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                <p className="text-red-600 text-sm font-medium">Erreur</p>
                <p className="text-red-600 text-sm mt-1">{submitError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4 safe-bottom flex-shrink-0">
        <button
          onClick={() => {
            if (step < totalSteps) {
              setStep(step + 1);
            } else {
              handleSubmit();
            }
          }}
          disabled={!canProceed() || loading}
          className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : step < totalSteps ? (
            <>
              Continuer
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Terminer l'inscription
            </>
          )}
        </button>
      </div>
    </div>
  );
}
// Build: 1770233926
