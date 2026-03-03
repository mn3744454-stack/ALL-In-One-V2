import { format } from 'date-fns';

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
 * Format date-time with ALWAYS English digits
 */
export function formatDateTime(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return format(d, formatStr);
}

/**
 * Format date-time with 12-hour clock and locale-aware AM/PM indicator.
 * Arabic UI → ص/م  |  English UI → AM/PM
 * 
 * @param date - Date to format
 * @param lang - Current UI language ('ar' | 'en')
 */
export function formatDateTime12h(date: Date | string, lang: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const base = format(d, 'dd-MM-yyyy hh:mm');
  const hours = d.getHours();
  if (lang === 'ar') {
    return `${base} ${hours < 12 ? 'ص' : 'م'}`;
  }
  return `${base} ${hours < 12 ? 'AM' : 'PM'}`;
}

/**
 * Format time-only with locale-aware AM/PM.
 * Arabic UI → ص/م  |  English UI → AM/PM
 */
export function formatTime12h(date: Date | string, lang: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const base = format(d, 'hh:mm');
  const hours = d.getHours();
  if (lang === 'ar') {
    return `${base} ${hours < 12 ? 'ص' : 'م'}`;
  }
  return `${base} ${hours < 12 ? 'AM' : 'PM'}`;
}

/**
 * Format time only with ALWAYS English digits
 */
export function formatTime(date: Date | string, formatStr: string = 'HH:mm'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return format(d, formatStr);
}

/**
 * Format relative date (e.g., "PP" for localized date)
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return format(d, 'PP');
}
