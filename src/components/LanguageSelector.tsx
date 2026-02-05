import { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { hapticLight } from '../hooks/useHapticFeedback';

interface LanguageSelectorProps {
  variant?: 'button' | 'list' | 'dropdown';
  showLabel?: boolean;
}

export function LanguageSelector({ variant = 'list', showLabel = true }: LanguageSelectorProps) {
  const { language, setLanguage, languageNames, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (lang: Language) => {
    hapticLight();
    setLanguage(lang);
    setIsOpen(false);
  };

  // Flag emojis
  const flags: Record<Language, string> = {
    fr: '🇫🇷',
    en: '🇬🇧',
  };

  // Button variant
  if (variant === 'button') {
    return (
      <button
        onClick={() => {
          hapticLight();
          // Toggle between languages
          const nextLang = language === 'fr' ? 'en' : 'fr';
          setLanguage(nextLang);
        }}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <span className="text-lg">{flags[language]}</span>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {languageNames[language]}
          </span>
        )}
      </button>
    );
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => {
            hapticLight();
            setIsOpen(!isOpen);
          }}
          className="flex items-center justify-between gap-3 w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-lg">{flags[language]}</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {languageNames[language]}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    lang === language ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{flags[lang]}</span>
                    <span className={`font-medium ${
                      lang === language
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {languageNames[lang]}
                    </span>
                  </div>
                  {lang === language && (
                    <Check className="w-5 h-5 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // List variant (default)
  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">Langue / Language</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {availableLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => handleSelect(lang)}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
              lang === language
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-xl">{flags[lang]}</span>
            <span className={`font-medium ${
              lang === language
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {languageNames[lang]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSelector;
