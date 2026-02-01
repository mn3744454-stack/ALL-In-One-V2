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
 * Arabic UI can have Arabic text but digits must be English
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
 * Uses date-fns format which preserves English digits
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
