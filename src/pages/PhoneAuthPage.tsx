import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PhoneAuthPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Format phone for display
  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }

  // Send OTP
  async function sendOTP() {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setError('Numéro de téléphone invalide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For development, we'll use email-based OTP with phone number as email
      // In production, you would use Supabase Phone Auth with SMS provider
      const email = `driver_${cleanPhone}@logitrack.app`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            phone: cleanPhone,
          },
        },
      });

      if (error) throw error;

      setStep('otp');
      startCountdown();
    } catch (err) {
      console.error('OTP error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du code');
    }

    setLoading(false);
  }

  // Start countdown for resend
  function startCountdown() {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Verify OTP
  async function verifyOTP() {
    if (otp.length !== 6) {
      setError('Code à 6 chiffres requis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const email = `driver_${cleanPhone}@logitrack.app`;

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      if (data.user) {
        // Check if driver profile exists
        const { data: driver } = await supabase
          .from('logitrack_drivers')
          .select('id, status, verification_status')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!driver) {
          // New user - go to registration
          navigate('/register');
        } else if (driver.verification_status !== 'verified') {
          // Registration complete but pending verification
          navigate('/pending-verification');
        } else if (driver.status !== 'active') {
          // Account not active
          navigate('/pending-verification');
        } else {
          // Verified and active user - go to dashboard
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Verify error:', err);
      setError(err instanceof Error ? err.message : 'Code invalide');
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen h-full overflow-y-auto bg-gradient-to-b from-primary-500 to-primary-600 flex flex-col safe-top">
      {/* Header */}
      <div className="p-4 flex-shrink-0">
        {step === 'otp' && (
          <button
            onClick={() => setStep('phone')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Logo */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[200px]">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-4">
          <span className="text-3xl">🚀</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">LogiTrack</h1>
        <p className="text-white/80 text-sm">Application Livreur</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-t-3xl p-6 pb-8 safe-bottom flex-shrink-0">
        {step === 'phone' ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion</h2>
            <p className="text-gray-500 mb-6">
              Entrez votre numéro de téléphone pour recevoir un code de connexion
            </p>

            {/* Phone Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-gray-600 font-medium">
                  🇨🇮 +225
                </span>
                <input
                  type="tel"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="07 XX XX XX XX"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
                  maxLength={14}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}

            <button
              onClick={sendOTP}
              disabled={loading || phone.replace(/\D/g, '').length < 8}
              className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Recevoir le code
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-6">
              En continuant, vous acceptez nos{' '}
              <a href="#" className="text-primary-600">Conditions d'utilisation</a>
            </p>

            <div className="text-center mt-4 pt-4 border-t border-gray-100">
              <p className="text-gray-600">
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-primary-600 font-semibold hover:underline">
                  S'inscrire
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vérification</h2>
            <p className="text-gray-500 mb-6">
              Entrez le code envoyé au{' '}
              <span className="font-medium text-gray-900">+225 {formatPhone(phone)}</span>
            </p>

            {/* OTP Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code de vérification
              </label>
              <div className="flex gap-2 justify-between">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const newOtp = otp.split('');
                      newOtp[i] = value;
                      setOtp(newOtp.join(''));

                      // Auto-focus next input
                      if (value && i < 5) {
                        const next = e.target.nextElementSibling as HTMLInputElement;
                        next?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle backspace
                      if (e.key === 'Backspace' && !otp[i] && i > 0) {
                        const prev = (e.target as HTMLInputElement).previousElementSibling as HTMLInputElement;
                        prev?.focus();
                      }
                    }}
                    className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}

            <button
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                'Vérifier'
              )}
            </button>

            {/* Resend */}
            <div className="text-center mt-6">
              {countdown > 0 ? (
                <p className="text-gray-500 text-sm">
                  Renvoyer le code dans {countdown}s
                </p>
              ) : (
                <button
                  onClick={sendOTP}
                  disabled={loading}
                  className="text-primary-600 font-medium text-sm"
                >
                  Renvoyer le code
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
