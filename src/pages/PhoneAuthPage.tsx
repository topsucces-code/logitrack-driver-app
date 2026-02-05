import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { phoneSchema, otpSchema, validateForm } from '../lib/validations';

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

    // Validate phone with Zod
    const validation = validateForm(phoneSchema, cleanPhone);
    if (!validation.success) {
      setError(Object.values(validation.errors)[0]);
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
    // Validate OTP with Zod
    const validation = validateForm(otpSchema, otp);
    if (!validation.success) {
      setError(Object.values(validation.errors)[0]);
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
    <div className="min-h-screen h-full overflow-y-auto bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex flex-col safe-top relative">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 blob" />
        <div className="absolute top-1/4 -left-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute bottom-1/3 right-0 w-32 h-32 bg-primary-300/20 rounded-full blur-xl" />
      </div>

      {/* Header */}
      <div className="p-4 flex-shrink-0 relative z-10">
        {step === 'otp' && (
          <button
            onClick={() => setStep('phone')}
            className="w-11 h-11 glass rounded-2xl flex items-center justify-center text-white hover:bg-white/25 transition-all active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Logo */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[220px] relative z-10">
        <div className="animate-float">
          <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center shadow-2xl mb-5 animate-pulse-glow">
            <span className="text-4xl">🚀</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">LogiTrack</h1>
        <p className="text-white/90 text-base font-medium">Application Livreur</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-t-[32px] p-6 pb-8 safe-bottom flex-shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-10 animate-slide-up">
        {step === 'phone' ? (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Entrez votre numéro de téléphone pour recevoir un code de connexion
            </p>

            {/* Phone Input */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Numéro de téléphone
              </label>
              <div className="flex shadow-sm rounded-2xl overflow-hidden border-2 border-gray-100 focus-within:border-primary-500 focus-within:shadow-lg focus-within:shadow-primary-500/10 transition-all duration-300">
                <div className="inline-flex items-center gap-2 px-4 py-4 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 text-gray-700 font-semibold">
                  <span className="text-xl">🇨🇮</span>
                  <span>+225</span>
                </div>
                <input
                  type="tel"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="07 XX XX XX XX"
                  className="flex-1 px-4 py-4 focus:outline-none text-lg font-medium text-gray-800 placeholder:text-gray-400 bg-white"
                  maxLength={14}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={sendOTP}
              disabled={loading || phone.replace(/\D/g, '').length < 8}
              className="w-full py-4 btn-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Recevoir le code
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Register Link - placed prominently after button */}
            <div className="text-center mt-6 pt-6 border-t border-gray-100">
              <p className="text-gray-600">
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
                  S'inscrire
                </Link>
              </p>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              En continuant, vous acceptez nos{' '}
              <a href="#" className="text-primary-500 font-medium hover:text-primary-600 transition-colors">
                Conditions d'utilisation
              </a>
            </p>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Vérification</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Entrez le code envoyé au{' '}
              <span className="font-bold text-gray-900">+225 {formatPhone(phone)}</span>
            </p>

            {/* OTP Input */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Code de vérification
              </label>
              <div className="flex gap-3 justify-center">
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
                    className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl otp-input focus:outline-none transition-all duration-200 ${
                      otp[i]
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full py-4 btn-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                'Vérifier le code'
              )}
            </button>

            {/* Resend */}
            <div className="text-center mt-8">
              {countdown > 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-primary-500 animate-spin" />
                  <span className="text-gray-600 text-sm font-medium">
                    Renvoyer dans {countdown}s
                  </span>
                </div>
              ) : (
                <button
                  onClick={sendOTP}
                  disabled={loading}
                  className="text-primary-600 font-bold text-sm hover:text-primary-700 transition-colors px-4 py-2 hover:bg-primary-50 rounded-full"
                >
                  Renvoyer le code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
