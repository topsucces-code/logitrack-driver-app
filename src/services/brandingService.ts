import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CACHE_KEY = 'logitrack_branding';
const DEFAULT_HEADER_COLOR = '#f97316';

export interface BrandingSettings {
  header_color: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  header_color: DEFAULT_HEADER_COLOR,
};

function getCached(): BrandingSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrandingSettings;
  } catch {
    return null;
  }
}

function setCache(settings: BrandingSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export async function fetchBranding(): Promise<BrandingSettings> {
  // Return cached first for instant rendering
  const cached = getCached();

  if (!isSupabaseConfigured) {
    return cached ?? DEFAULT_BRANDING;
  }

  try {
    const { data, error } = await supabase
      .from('logitrack_platform_settings')
      .select('value')
      .eq('key', 'branding')
      .single();

    if (error || !data?.value) {
      return cached ?? DEFAULT_BRANDING;
    }

    const settings: BrandingSettings = {
      ...DEFAULT_BRANDING,
      ...(data.value as Record<string, unknown>),
    };

    setCache(settings);
    return settings;
  } catch {
    return cached ?? DEFAULT_BRANDING;
  }
}
