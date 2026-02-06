import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Driver, VehicleType, isDriverVerified, getRegistrationStep, isSupabaseConfigured } from '../lib/supabase';
import { initPushNotifications, removePushToken } from '../services/pushNotificationService';

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

  // Initialize push notifications when driver is verified
  useEffect(() => {
    if (driver && isVerified) {
      initPushNotifications(
        // On notification received in foreground
        (notification) => {
          console.log('Push notification received:', notification);
        },
        // On notification action (user tapped)
        (action) => {
          console.log('Push notification action:', action);
          // Handle navigation based on notification data
          const data = action.notification.data;
          if (data?.deliveryId) {
            window.location.href = `/delivery/${data.deliveryId}`;
          }
        }
      );
    }
  }, [driver, isVerified]);

  const fetchDriver = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('logitrack_drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setDriver(data);
    } catch {
      // Driver not found or not yet registered
    }
  }, []);

  useEffect(() => {
    // Safety timeout - always stop loading after 3 seconds max
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // If Supabase is not configured, stop loading immediately
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured - skipping auth initialization');
      setLoading(false);
      return () => clearTimeout(safetyTimeout);
    }

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      // Listen for auth changes only
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          try {
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
              await fetchDriver(newSession.user.id);
            } else {
              setDriver(null);
            }
          } catch (error) {
            console.error('Error in auth state change:', error);
          } finally {
            setLoading(false);
          }
        }
      );
      subscription = data.subscription;

      // Try to get initial session (non-blocking)
      supabase.auth.getSession()
        .then(({ data }) => {
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
            fetchDriver(data.session.user.id);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error getting session:', error);
          setLoading(false);
        });
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
    }

    return () => {
      clearTimeout(safetyTimeout);
      subscription?.unsubscribe();
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
    // Remove push token before signing out
    await removePushToken();

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

  const value = useMemo(() => ({
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
  }), [user, session, driver, loading, isVerified, registrationStep]);

  return (
    <AuthContext.Provider value={value}>
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
