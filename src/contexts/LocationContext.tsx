import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { locationLogger } from '../utils/logger';

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

// Minimum distance in meters to consider a meaningful move (Haversine)
const MIN_DISTANCE_METERS = 10;
// Minimum interval between DB writes in ms
const DB_WRITE_THROTTLE_MS = 10_000;

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { driver } = useAuth();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);

  // Refs for throttling and distance filtering
  const lastDbWriteRef = useRef<number>(0);
  const lastDbPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  // Update position in database - throttled
  const updatePositionInDB = useCallback(
    async (lat: number, lng: number, heading?: number, speed?: number, accuracy?: number) => {
      if (!driver?.id) return;

      const now = Date.now();

      // Throttle: max 1 DB write per 10 seconds
      if (now - lastDbWriteRef.current < DB_WRITE_THROTTLE_MS) return;

      // Distance filter: ignore if moved less than 10 meters
      if (lastDbPositionRef.current) {
        const dist = haversineDistance(
          lastDbPositionRef.current.lat, lastDbPositionRef.current.lng,
          lat, lng
        );
        if (dist < MIN_DISTANCE_METERS) return;
      }

      lastDbWriteRef.current = now;
      lastDbPositionRef.current = { lat, lng };

      try {
        await supabase.rpc('update_logitrack_driver_location', {
          p_lat: lat,
          p_lng: lng,
          p_heading: heading ?? null,
          p_speed: speed ?? null,
          p_accuracy: accuracy ?? null,
        });
      } catch (err) {
        locationLogger.error('Error updating location', { error: err });
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

      // Update in database (throttled + distance-filtered)
      updatePositionInDB(latitude, longitude, h ?? undefined, s ? s * 3.6 : undefined, a ?? undefined);
    },
    [updatePositionInDB]
  );

  // Determine GPS options based on current speed
  const getGeoOptions = useCallback(() => {
    // If we have speed data and driver is moving slowly or stationary
    const currentSpeed = speed ?? 0;
    const isMoving = currentSpeed > 1; // km/h

    return {
      enableHighAccuracy: isMoving, // High accuracy only when moving
      timeout: 10000,
      maximumAge: isMoving ? 5000 : 30000, // Cache longer when stationary
    };
  }, [speed]);

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
            maximumAge: 5000,
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

        const geoOptions = getGeoOptions();

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
            locationLogger.error('Web geolocation error', { error: err });
          },
          geoOptions
        );

        setWatchId(String(webWatchId));
        setIsTracking(true);
        setError(null);
      }
    } catch (err) {
      setError('Erreur de géolocalisation');
      locationLogger.error('Geolocation error', { error: err });
    }
  }, [isTracking, handlePositionUpdate, getGeoOptions]);

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

  // Memoize context value (Phase 4A)
  const value = useMemo(() => ({
    position,
    heading,
    speed,
    accuracy,
    isTracking,
    error,
    startTracking,
    stopTracking,
    getCurrentPosition,
  }), [position, heading, speed, accuracy, isTracking, error, startTracking, stopTracking, getCurrentPosition]);

  return (
    <LocationContext.Provider value={value}>
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
