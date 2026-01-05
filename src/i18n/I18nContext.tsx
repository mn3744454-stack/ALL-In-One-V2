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

// Get nested value from object using dot notation
const getNestedValue = (obj: unknown, path: string): string => {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return key as fallback
    }
  }

  return typeof current === 'string' ? current : path;
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

  // Update document attributes when language changes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((newLang: Language) => {
    // Safety: if language is disabled, fallback to default
    const safeLang = isLanguageEnabled(newLang) ? newLang : DEFAULT_LANGUAGE;
    setLangState(safeLang);
    localStorage.setItem(STORAGE_KEY, safeLang);
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
