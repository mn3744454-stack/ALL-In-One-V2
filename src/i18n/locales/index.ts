import { en } from './en';
import { ar } from './ar';
import type { Language } from '../config';

// Type for translation dictionary
export type TranslationDictionary = typeof en;

// All translations - enabled languages have full translations, others are stubs
export const translations: Record<Language, TranslationDictionary> = {
  en,
  ar,
  // Placeholder stubs for future languages (fallback to English)
  hi: en,
  fil: en,
  am: en,
  ur: en,
};

export { en, ar };
