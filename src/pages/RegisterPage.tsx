import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  Truck,
  Loader2,
  ArrowLeft,
  Bike,
  Car,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type VehicleType = 'moto' | 'tricycle' | 'voiture' | 'velo';

const vehicleOptions: { value: VehicleType; label: string; icon: React.ReactNode }[] = [
  { value: 'moto', label: 'Moto', icon: <Bike className="w-6 h-6" /> },
  { value: 'tricycle', label: 'Tricycle', icon: <Truck className="w-6 h-6" /> },
  { value: 'voiture', label: 'Voiture', icon: <Car className="w-6 h-6" /> },
  { value: 'velo', label: 'Vélo', icon: <Bike className="w-6 h-6" /> },
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validations Step 1
    if (step === 1) {
      if (!fullName || fullName.length < 3) {
        setError('Nom complet requis (min. 3 caractères)');
        return;
      }
      if (!phone || phone.length < 10) {
        setError('Numéro de téléphone invalide');
        return;
      }
      setStep(2);
      return;
    }

    // Validations Step 2
    if (password.length < 6) {
      setError('Mot de passe trop court (min. 6 caractères)');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
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
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col">
      {/* Header */}
      <div className="safe-top px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (step === 1 ? navigate('/login') : setStep(1))}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-white">
            <h1 className="text-xl font-bold">Inscription</h1>
            <p className="text-white/80 text-sm">Étape {step} sur 2</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex gap-2">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-6 overflow-y-auto">
        {step === 1 ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Vos informations</h2>
            <p className="text-gray-500 mb-8">Entrez vos informations personnelles</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Kouamé Jean"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07 00 00 00 00"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type de véhicule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {vehicleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVehicleType(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        vehicleType === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.icon}
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
              >
                Continuer
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un mot de passe</h2>
            <p className="text-gray-500 mb-8">Sécurisez votre compte</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </button>
            </form>
          </>
        )}

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
