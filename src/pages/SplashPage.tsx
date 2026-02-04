import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SplashPage() {
  const navigate = useNavigate();
  const { user, driver, loading, isVerified, registrationStep } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Wait a bit for the splash animation
    const timeout = setTimeout(() => {
      if (!user) {
        // Not logged in - go to auth
        navigate('/auth', { replace: true });
      } else if (!driver || registrationStep < 6) {
        // Logged in but not completed registration
        navigate('/onboarding', { replace: true });
      } else if (!isVerified) {
        // Registration complete but not verified
        navigate('/pending-verification', { replace: true });
      } else {
        // Logged in, registered and verified - go to dashboard
        navigate('/dashboard', { replace: true });
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [user, driver, loading, navigate, isVerified, registrationStep]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-primary-600 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-8 animate-bounce">
        <span className="text-6xl">🚀</span>
      </div>

      {/* Brand */}
      <h1 className="text-4xl font-bold text-white mb-2">LogiTrack</h1>
      <p className="text-white/80 text-lg">Livreur</p>

      {/* Loading indicator */}
      <div className="mt-12">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>

      {/* Version */}
      <p className="absolute bottom-8 text-white/50 text-sm">Version 1.0.0</p>
    </div>
  );
}
