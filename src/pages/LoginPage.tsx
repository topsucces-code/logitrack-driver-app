import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
    setLoading(true);

    // Validate
    if (!phone || phone.length < 10) {
      setError('Numéro de téléphone invalide');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Mot de passe trop court (min. 6 caractères)');
      setLoading(false);
      return;
    }

    const { error: signInError } = await signIn(phone, password);

    if (signInError) {
      setError('Identifiants incorrects');
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex flex-col relative">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 blob" />
        <div className="absolute top-1/3 -left-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-32 h-32 bg-primary-300/20 rounded-full blur-xl" />
      </div>

      {/* Header with Logo */}
      <div className="safe-top px-6 pt-10 pb-8 relative z-10">
        <div className="flex flex-col items-center text-white">
          <div className="animate-float">
            <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center shadow-2xl mb-5 animate-pulse-glow">
              <span className="text-4xl">🚀</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">LogiTrack</h1>
          <p className="text-white/90 text-base font-medium">Espace Livreur</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-10 animate-slide-up">
        <div className="animate-fade-in-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">Connectez-vous pour commencer à livrer</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Numéro de téléphone
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary-500" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="w-full pl-16 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-lg focus:shadow-primary-500/10 transition-all duration-300"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-16 pr-14 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-lg focus:shadow-primary-500/10 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 btn-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <p className="text-gray-600">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
                S'inscrire
              </Link>
            </p>
          </div>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
            <p className="text-xs text-gray-500 text-center font-medium">
              LogiTrack Africa - Application pour livreurs indépendants
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
