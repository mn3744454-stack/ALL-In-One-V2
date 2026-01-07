import { useI18n } from '@/i18n';

/**
 * Reusable RTL hook for consistent layout decisions across components.
 * Use this hook when you need to conditionally apply RTL-specific logic or classes.
 */
export function useRTL() {
  const { dir, lang } = useI18n();
  
  return {
    /** Whether the current direction is RTL */
    isRTL: dir === 'rtl',
    /** Current text direction ('ltr' | 'rtl') */
    dir,
    /** Current language code */
    lang,
    /** 
     * Helper for conditional RTL classes.
     * Returns rtlClass when RTL, otherwise ltrClass.
     * @example rtlClass('text-left', 'text-right') // returns 'text-right' in RTL
     */
    rtlClass: (ltrClass: string, rtlClass: string) => 
      dir === 'rtl' ? rtlClass : ltrClass,
  };
}
