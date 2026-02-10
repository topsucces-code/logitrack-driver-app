import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  Truck,
  ArrowLeft,
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { phoneSchema, passwordSchema, validateForm } from '../lib/validations';
import { z } from 'zod';

type VehicleType = 'moto' | 'tricycle' | 'voiture' | 'velo';

const vehicleOptions: { value: VehicleType; label: string; icon: React.ReactNode; emoji: string }[] = [
  { value: 'moto', label: 'Moto', icon: <Bike className="w-6 h-6" />, emoji: '🏍️' },
  { value: 'tricycle', label: 'Tricycle', icon: <Truck className="w-6 h-6" />, emoji: '🛺' },
  { value: 'voiture', label: 'Voiture', icon: <Car className="w-6 h-6" />, emoji: '🚗' },
  { value: 'velo', label: 'Vélo', icon: <Bike className="w-6 h-6" />, emoji: '🚲' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('moto');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation schemas
  const step1Schema = z.object({
    fullName: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
    phone: phoneSchema,
  });

  const step2Schema = z.object({
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validations Step 1 with Zod
    if (step === 1) {
      const cleanPhone = phone.replace(/\D/g, '');
      const validation = validateForm(step1Schema, { fullName, phone: cleanPhone });
      if (!validation.success) {
        setError(Object.values(validation.errors)[0]);
        return;
      }
      setStep(2);
      return;
    }

    // Validations Step 2 with Zod
    const validation = validateForm(step2Schema, { password, confirmPassword });
    if (!validation.success) {
      setError(Object.values(validation.errors)[0]);
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp({
      phone,
      password,
      fullName,
      vehicleType,
    });

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    // Success - redirect to onboarding (user should already be logged in)
    navigate('/onboarding');
  }

  return (
    <div className="h-screen bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex flex-col relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 blob" />
        <div className="absolute top-1/2 -right-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute bottom-1/3 left-0 w-32 h-32 bg-primary-300/20 rounded-full blur-xl" />
      </div>

      {/* Header - Compact */}
      <div className="safe-top px-4 pt-3 pb-3 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 1 ? navigate('/login') : setStep(1))}
            className="w-9 h-9 glass rounded-lg flex items-center justify-center text-white hover:bg-white/25 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-white flex-1">
            <h1 className="text-lg font-bold">Inscription</h1>
            <p className="text-white/80 text-xs font-medium">Étape {step} sur 2</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 flex gap-2">
          <div className="h-1 flex-1 rounded-full bg-white shadow-lg" />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-white shadow-lg' : 'bg-white/30'}`} />
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-t-[24px] px-4 pt-5 pb-6 overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-10 animate-slide-up">
        {step === 1 ? (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Vos informations</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Entrez vos informations personnelles</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-500" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Kouamé Jean"
                    className="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary-500" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07 00 00 00 00"
                    className="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Type de véhicule
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {vehicleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVehicleType(option.value)}
                      className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1 relative ${
                        vehicleType === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {vehicleType === option.value && (
                        <div className="absolute -top-1 -right-1">
                          <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        </div>
                      )}
                      <span className="text-xl">{option.emoji}</span>
                      <span className="text-[10px] font-semibold">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg animate-scale-in">
                  <p className="text-red-600 dark:text-red-400 text-xs font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 btn-gradient text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 text-sm"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Créer un mot de passe</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Sécurisez votre compte</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-primary-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full pl-14 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-primary-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                  />
                </div>
              </div>

              {/* Password Strength Indicator */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Sécurité</p>
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {password.length === 0
                      ? 'Entrez un mot de passe'
                      : password.length < 6
                      ? 'Trop court'
                      : password.length < 8
                      ? 'Acceptable'
                      : 'Fort'}
                  </p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        password.length >= level * 2
                          ? password.length >= 8
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg animate-scale-in">
                  <p className="text-red-600 dark:text-red-400 text-xs font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 btn-gradient text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Login Link */}
        <div className="mt-5 text-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-bold hover:text-primary-700 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
