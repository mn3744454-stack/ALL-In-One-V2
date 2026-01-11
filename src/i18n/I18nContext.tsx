import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, DEFAULT_LANGUAGE, isRTL, isLanguageEnabled } from './config';
import { translations, TranslationDictionary } from './locales';

type Direction = 'ltr' | 'rtl';

interface I18nContextType {
  lang: Language;
  dir: Direction;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'app-language';

// Global state for language (synced with React context)
let currentGlobalLanguage: Language = DEFAULT_LANGUAGE;

// Get nested value from object using dot notation
const getNestedValue = (obj: unknown, path: string): string => {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      // Dev-only warning for missing translation keys
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation key: "${path}"`);
        return `⟦${path}⟧`;
      }
      return path; // Return key as fallback in production
    }
  }

  return typeof current === 'string' ? current : path;
};

// Set global language (called by provider when language changes)
export const setGlobalLanguage = (lang: Language) => {
  currentGlobalLanguage = isLanguageEnabled(lang) ? lang : DEFAULT_LANGUAGE;
};

// Global translator - usable outside React context (e.g., in hooks)
export const tGlobal = (key: string): string => {
  const dict: TranslationDictionary = translations[currentGlobalLanguage] || translations[DEFAULT_LANGUAGE];
  return getNestedValue(dict, key);
};

// Get current language
export const getCurrentLanguage = (): Language => currentGlobalLanguage;

// Get current direction
export const getCurrentDirection = (): Direction => isRTL(currentGlobalLanguage) ? 'rtl' : 'ltr';

// Detect language from URL, localStorage, navigator, or default
export const detectLanguage = (urlParams?: URLSearchParams): Language => {
  // 1. URL query param (?lang=ar or ?lang=en)
  if (urlParams) {
    const urlLang = urlParams.get('lang') as Language | null;
    if (urlLang && isLanguageEnabled(urlLang)) {
      return urlLang;
    }
  }
  
  // 2. localStorage
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && isLanguageEnabled(stored)) {
    return stored;
  }
  
  // 3. navigator.language
  const browserLang = navigator.language.split('-')[0] as Language;
  if (isLanguageEnabled(browserLang)) {
    return browserLang;
  }
  
  // 4. Default
  return DEFAULT_LANGUAGE;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    // Safety: if stored language is disabled, fallback to default
    if (stored && isLanguageEnabled(stored)) {
      return stored;
    }
    return DEFAULT_LANGUAGE;
  });

  const dir: Direction = isRTL(lang) ? 'rtl' : 'ltr';

  // Update document attributes and global state when language changes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    setGlobalLanguage(lang);
  }, [lang, dir]);

  const setLang = useCallback((newLang: Language) => {
    // Safety: if language is disabled, fallback to default
    const safeLang = isLanguageEnabled(newLang) ? newLang : DEFAULT_LANGUAGE;
    setLangState(safeLang);
    localStorage.setItem(STORAGE_KEY, safeLang);
    setGlobalLanguage(safeLang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict: TranslationDictionary = translations[lang] || translations[DEFAULT_LANGUAGE];
      return getNestedValue(dict, key);
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
