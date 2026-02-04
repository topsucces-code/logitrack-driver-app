import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Driver, VehicleType, isDriverVerified, getRegistrationStep } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  driver: Driver | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshDriver: () => Promise<void>;
  isVerified: boolean;
  registrationStep: number;
}

interface SignUpData {
  phone: string;
  password: string;
  fullName: string;
  vehicleType: VehicleType;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  const isVerified = driver ? isDriverVerified(driver) : false;
  const registrationStep = driver ? getRegistrationStep(driver) : 0;

  const fetchDriver = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('logitrack_drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setDriver(data);
    } catch (e) {
      console.log('Fetch driver error:', e);
    }
  }, []);

  useEffect(() => {
    // Set loading to false after a short delay regardless of auth state
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1500);

    // Listen for auth changes only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchDriver(newSession.user.id);
        } else {
          setDriver(null);
        }

        setLoading(false);
      }
    );

    // Try to get initial session (non-blocking)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        fetchDriver(data.session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchDriver]);

  async function refreshDriver() {
    if (user) {
      await fetchDriver(user.id);
    }
  }

  async function signIn(phone: string, password: string) {
    try {
      const email = `driver_${phone.replace(/\D/g, '')}@logitrack.app`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Numéro ou mot de passe incorrect' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch {
      return { error: 'Erreur de connexion' };
    }
  }

  async function signUp(data: SignUpData) {
    try {
      const cleanPhone = data.phone.replace(/\D/g, '');
      const email = `driver_${cleanPhone}@logitrack.app`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          data: { full_name: data.fullName, phone: cleanPhone },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return { error: 'Ce numéro est déjà utilisé. Essayez de vous connecter.' };
        }
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: 'Erreur lors de la création du compte' };
      }

      // Create driver profile
      const { error: rpcError } = await supabase.rpc('register_logitrack_driver', {
        p_user_id: authData.user.id,
        p_full_name: data.fullName,
        p_phone: cleanPhone,
        p_vehicle_type: data.vehicleType,
      });

      if (rpcError) {
        console.error('RPC register_logitrack_driver error:', rpcError);
        // Don't fail completely - the user is created, profile can be completed in onboarding
        // But log the error for debugging
      }

      return { error: null };
    } catch (err) {
      console.error('SignUp error:', err);
      return { error: 'Erreur lors de l\'inscription' };
    }
  }

  async function signOut() {
    if (driver) {
      await supabase
        .from('logitrack_drivers')
        .update({ is_online: false, updated_at: new Date().toISOString() })
        .eq('id', driver.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setDriver(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        driver,
        loading,
        signIn,
        signUp,
        signOut,
        refreshDriver,
        isVerified,
        registrationStep,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
