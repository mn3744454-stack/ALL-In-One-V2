import { en as baseEn } from './en';
import { ar as baseAr } from './ar';
import { inventoryEn, inventoryAr, inventorySidebarLabel } from './inventory';
import type { Language } from '../config';

// Merge the standalone Inventory module translations into the base dictionaries.
// Kept separate from en.ts/ar.ts to avoid growing those very large files.
const en = {
  ...baseEn,
  inventory: inventoryEn,
  sidebar: { ...baseEn.sidebar, inventory: inventorySidebarLabel.en },
};
const ar = {
  ...baseAr,
  inventory: inventoryAr,
  sidebar: { ...baseAr.sidebar, inventory: inventorySidebarLabel.ar },
};

// Type for translation dictionary
export type TranslationDictionary = typeof en;

// All translations - enabled languages have full translations, others are stubs
export const translations: Record<Language, TranslationDictionary> = {
  en,
  ar: ar as TranslationDictionary,
  // Placeholder stubs for future languages (fallback to English)
  hi: en,
  fil: en,
  am: en,
  ur: en,
};

export { en, ar };
