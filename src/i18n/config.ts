export type Language = 'en' | 'ar' | 'hi' | 'fil' | 'am' | 'ur';

export const RTL_LANGUAGES: Language[] = ['ar', 'ur'];

export const LANGUAGES: { code: Language; name: string; nativeName: string; enabled: boolean }[] = [
  { code: 'en', name: 'English', nativeName: 'English', enabled: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', enabled: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', enabled: false },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', enabled: false },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', enabled: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', enabled: false },
];

export const DEFAULT_LANGUAGE: Language = 'en';

export const isRTL = (lang: Language): boolean => RTL_LANGUAGES.includes(lang);

export const getEnabledLanguages = () => LANGUAGES.filter((l) => l.enabled);

export const isLanguageEnabled = (lang: Language): boolean => {
  const langConfig = LANGUAGES.find((l) => l.code === lang);
  return langConfig?.enabled ?? false;
};
