import { format } from 'date-fns';
import { formatStandardDateTime, formatStandardTime } from '@/lib/displayHelpers';

/**
 * CENTRALIZED FORMATTERS
 * 
 * RULE: All numeric output MUST use English digits (0-9), even in Arabic UI.
 * This applies to: amounts, dates, times, invoice numbers, sample numbers, counters.
 * 
 * Always use `dir="ltr"` + `tabular-nums` class for numeric displays in components.
 */

/**
 * Format currency with ALWAYS English digits (0-9)
 */
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency without decimals (for display of whole amounts)
 */
export function formatCurrencyCompact(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with ALWAYS English digits
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format integer (no decimals)
 */
export function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage with ALWAYS English digits
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format date with ALWAYS English digits
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return format(d, formatStr);
}

/**
 * @deprecated Use formatStandardDateTime from "@/lib/displayHelpers".
 * Delegates to the canonical 12-hour bilingual helper. The `formatStr`
 * argument is ignored to enforce the platform-wide time-format rule.
 */
export function formatDateTime(date: Date | string, _formatStr?: string): string {
  return formatStandardDateTime(date);
}

/**
 * @deprecated Use formatStandardDateTime from "@/lib/displayHelpers".
 * Delegates to the canonical 12-hour bilingual helper. The `lang`
 * argument is ignored — the helper reads the current UI language itself
 * and always emits full labels (`صباحاً` / `مساءً`, `AM` / `PM`).
 */
export function formatDateTime12h(date: Date | string, _lang?: string): string {
  return formatStandardDateTime(date);
}

/**
 * @deprecated Use formatStandardTime from "@/lib/displayHelpers".
 * Delegates to the canonical 12-hour bilingual helper.
 */
export function formatTime12h(date: Date | string, _lang?: string): string {
  return formatStandardTime(date);
}

/**
 * @deprecated Use formatStandardTime from "@/lib/displayHelpers".
 * Delegates to the canonical 12-hour bilingual helper. The `formatStr`
 * argument is ignored to enforce the platform-wide time-format rule.
 */
export function formatTime(date: Date | string, _formatStr?: string): string {
  return formatStandardTime(date);
}

/**
 * @deprecated Use formatStandardDate from displayHelpers instead.
 * Format date as dd-MM-yyyy (platform standard).
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return format(d, 'dd-MM-yyyy');
}
