import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface LocationContextType {
  position: { lat: number; lng: number } | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  getCurrentPosition: () => Promise<{ lat: number; lng: number } | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { driver } = useAuth();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);

  // Update position in database
  const updatePositionInDB = useCallback(
    async (lat: number, lng: number, heading?: number, speed?: number, accuracy?: number) => {
      if (!driver?.id) return;

      try {
        await supabase.rpc('update_logitrack_driver_location', {
          p_lat: lat,
          p_lng: lng,
          p_heading: heading ?? null,
          p_speed: speed ?? null,
          p_accuracy: accuracy ?? null,
        });
      } catch (err) {
        console.error('Error updating location:', err);
      }
    },
    [driver?.id]
  );

  // Handle position update
  const handlePositionUpdate = useCallback(
    (pos: Position) => {
      const { latitude, longitude, heading: h, speed: s, accuracy: a } = pos.coords;

      setPosition({ lat: latitude, lng: longitude });
      setHeading(h ?? null);
      setSpeed(s ? s * 3.6 : null); // Convert m/s to km/h
      setAccuracy(a ?? null);
      setError(null);

      // Update in database
      updatePositionInDB(latitude, longitude, h ?? undefined, s ? s * 3.6 : undefined, a ?? undefined);
    },
    [updatePositionInDB]
  );

  // Start tracking
  const startTracking = useCallback(async () => {
    if (isTracking) return;

    try {
      // Check if running on native platform or web
      if (Capacitor.isNativePlatform()) {
        // Native: use Capacitor Geolocation
        const permission = await Geolocation.requestPermissions();

        if (permission.location !== 'granted') {
          setError('Permission de localisation refusée');
          return;
        }

        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
          (pos, err) => {
            if (err) {
              setError(err.message);
              return;
            }
            if (pos) {
              handlePositionUpdate(pos);
            }
          }
        );

        setWatchId(id);
        setIsTracking(true);
        setError(null);

        const currentPos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        handlePositionUpdate(currentPos);
      } else {
        // Web: use browser's native Geolocation API
        if (!navigator.geolocation) {
          setError('Géolocalisation non supportée par ce navigateur');
          return;
        }

        const webWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            handlePositionUpdate({
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                altitudeAccuracy: pos.coords.altitudeAccuracy,
              },
              timestamp: pos.timestamp,
            });
          },
          (err) => {
            setError(err.message);
            console.error('Web geolocation error:', err);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );

        setWatchId(String(webWatchId));
        setIsTracking(true);
        setError(null);
      }
    } catch (err) {
      setError('Erreur de géolocalisation');
      console.error('Geolocation error:', err);
    }
  }, [isTracking, handlePositionUpdate]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchId) {
      if (Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: watchId });
      } else {
        navigator.geolocation.clearWatch(Number(watchId));
      }
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Get current position once
  const getCurrentPosition = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();

        if (permission.location !== 'granted') {
          setError('Permission de localisation refusée');
          return null;
        }

        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });

        return { lat: latitude, lng: longitude };
      } else {
        // Web fallback
        return new Promise<{ lat: number; lng: number } | null>((resolve) => {
          if (!navigator.geolocation) {
            setError('Géolocalisation non supportée');
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setPosition({ lat: latitude, lng: longitude });
              resolve({ lat: latitude, lng: longitude });
            },
            (err) => {
              setError(err.message);
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
    } catch (err) {
      setError('Erreur de géolocalisation');
      return null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchId });
        } else {
          navigator.geolocation.clearWatch(Number(watchId));
        }
      }
    };
  }, [watchId]);

  // Auto-start tracking when driver is online
  useEffect(() => {
    if (driver?.is_online) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [driver?.is_online, startTracking, stopTracking]);

  return (
    <LocationContext.Provider
      value={{
        position,
        heading,
        speed,
        accuracy,
        isTracking,
        error,
        startTracking,
        stopTracking,
        getCurrentPosition,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
