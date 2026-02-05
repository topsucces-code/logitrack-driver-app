import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Truck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { phoneSchema, passwordSchema, validateForm } from '../lib/validations';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate with Zod
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneValidation = validateForm(phoneSchema, cleanPhone);
    if (!phoneValidation.success) {
      setError(Object.values(phoneValidation.errors)[0]);
      return;
    }

    const passwordValidation = validateForm(passwordSchema, password);
    if (!passwordValidation.success) {
      setError(Object.values(passwordValidation.errors)[0]);
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(phone, password);

    if (signInError) {
      setError('Identifiants incorrects');
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col">
      {/* Header */}
      <div className="safe-top px-6 pt-8 pb-6">
        <div className="flex items-center gap-3 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">LogiTrack</h1>
            <p className="text-white/80 text-sm">Espace Livreur</p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
        <p className="text-gray-500 mb-8">Connectez-vous pour commencer à livrer</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone Input */}
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
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Password Input */}
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
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            loading={loading}
            fullWidth
            size="lg"
          >
            Se connecter
          </Button>
        </form>

        {/* Register Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-600 font-semibold">
              S'inscrire
            </Link>
          </p>
        </div>

        {/* Demo Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 text-center">
            LogiTrack Africa - Application pour livreurs indépendants
          </p>
        </div>
      </div>
    </div>
  );
}
