import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchBranding, BrandingSettings } from '../services/brandingService';

interface BrandingContextType {
  headerColor: string;
}

const BrandingContext = createContext<BrandingContextType>({ headerColor: '#f97316' });

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>({ header_color: '#f97316' });

  useEffect(() => {
    fetchBranding().then(setBranding);
  }, []);

  return (
    <BrandingContext.Provider value={{ headerColor: branding.header_color }}>
      {children}
    </BrandingContext.Provider>
  );
}
