import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Translations, languageNames } from '../i18n/translations';
import type { Language } from '../i18n/translations';

// Re-export Language type for convenience
export type { Language };

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  languageNames: typeof languageNames;
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANGUAGE_KEY = 'logitrack_language';

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

// Shorter alias for translations
export function useT() {
  return useLanguage().t;
}

function getInitialLanguage(): Language {
  // Check localStorage
  const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null;
  if (saved && translations[saved]) {
    return saved;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'en') {
    return 'en';
  }

  // Default to French
  return 'fr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);

    // Update HTML lang attribute
    document.documentElement.lang = lang;
  };

  // Set initial lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextType = {
    language,
    t: translations[language],
    setLanguage,
    languageNames,
    availableLanguages: Object.keys(translations) as Language[],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
