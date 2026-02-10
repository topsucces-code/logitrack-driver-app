import { LoadScript } from '@react-google-maps/api';
import { ReactNode } from 'react';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  if (!GOOGLE_MAPS_KEY) {
    // Render children without Google Maps if key is missing (graceful fallback)
    return <>{children}</>;
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_KEY}>
      {children}
    </LoadScript>
  );
}
