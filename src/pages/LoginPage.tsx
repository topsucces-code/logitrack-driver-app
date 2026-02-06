import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
    <div className="h-screen bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex flex-col relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 blob" />
        <div className="absolute top-1/3 -left-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-32 h-32 bg-primary-300/20 rounded-full blur-xl" />
      </div>

      {/* Header with Logo */}
      <div className="safe-top px-4 pt-4 pb-4 relative z-10 flex-shrink-0">
        <div className="flex flex-col items-center text-white">
          <div className="animate-float">
            <div className="w-16 h-16 bg-white rounded-[20px] flex items-center justify-center shadow-2xl mb-3 animate-pulse-glow">
              <span className="text-3xl">🚀</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-0.5">LogiTrack</h1>
          <p className="text-white/90 text-sm font-medium">Espace Livreur</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-t-[24px] px-4 pt-5 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-10 animate-slide-up overflow-y-auto">
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Connexion</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Connectez-vous pour commencer à livrer</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Input */}
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
                  className="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
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
                  placeholder="••••••••"
                  className="w-full pl-14 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
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

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg animate-scale-in">
                <p className="text-red-600 dark:text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-gradient text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-5 text-center pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-primary-600 dark:text-primary-400 font-bold hover:text-primary-700 transition-colors">
                S'inscrire
              </Link>
            </p>
          </div>

          {/* Demo Info */}
          <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
              LogiTrack Africa - Application pour livreurs indépendants
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
