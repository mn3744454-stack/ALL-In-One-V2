import { differenceInDays } from 'date-fns';
import { getCurrentLanguage } from '@/i18n';
import { computeAccruedCostDecomposed } from './boardingPeriodEngine';

/** Format a number with commas, always using English numerals. */
export function formatBoardingAmount(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Calculate boarding stay days from admission date to checkout or now.
 */
export function computeStayDays(admittedAt: string, checkedOutAt?: string | null): number {
  return differenceInDays(
    checkedOutAt ? new Date(checkedOutAt) : new Date(),
    new Date(admittedAt)
  );
}

/**
 * Calculate accrued boarding cost using the calendar-aware decomposition engine.
 * Replaces the old flat /30 logic.
 *
 * When admittedAt is provided and billing is monthly, uses true calendar proration.
 * Falls back to daily rate × days when admission dates are unavailable.
 */
export function computeAccruedCost(
  days: number,
  dailyRate: number | null,
  monthlyRate: number | null,
  billingCycle?: string,
  admittedAt?: string,
  checkedOutAt?: string | null,
): number | null {
  if (days <= 0) return null;

  // Daily billing: simple multiplication
  if (billingCycle === 'daily' && dailyRate) {
    return dailyRate * days;
  }

  // Monthly billing with admission dates: use decomposition engine
  if (monthlyRate && admittedAt) {
    return computeAccruedCostDecomposed(admittedAt, checkedOutAt || null, dailyRate, monthlyRate, billingCycle);
  }

  // Fallback to daily rate
  if (dailyRate) {
    return dailyRate * days;
  }

  return null;
}

/**
 * Format stay duration for display.
 * Arabic: "66 يوم", English: "66 days" / "66d" (compact).
 */
export function formatStayDuration(
  days: number,
  lang?: string,
  compact = false
): string {
  const activeLang = lang || getCurrentLanguage();

  if (activeLang === 'ar') {
    if (days === 1) return `\u200E1 يوم`;
    if (days === 2) return `\u200E2 يومان`;
    // LRM (\u200E) forces number-first display in RTL context
    return `\u200E${days} يوم`;
  }

  if (compact) return `${days}d`;
  return days === 1 ? `${days} day` : `${days} days`;
}

/**
 * Format boarding rate for display.
 * Arabic: "200 ريال / شهري", English: "200 SAR/mo"
 */
export function formatBoardingRate(
  dailyRate: number | null,
  monthlyRate: number | null,
  currency: string,
  lang?: string
): string | null {
  const activeLang = lang || getCurrentLanguage();

  if (!dailyRate && !monthlyRate) return null;

  if (activeLang === 'ar') {
    const currLabel = currency === 'SAR' ? 'ريال' : currency;
    if (monthlyRate) return `\u200E${formatBoardingAmount(monthlyRate, 0)} ${currLabel} في الشهر`;
    if (dailyRate) return `\u200E${formatBoardingAmount(dailyRate, 0)} ${currLabel} في اليوم`;
    return null;
  }

  if (monthlyRate) return `${formatBoardingAmount(monthlyRate, 0)} ${currency}/mo`;
  if (dailyRate) return `${formatBoardingAmount(dailyRate, 0)} ${currency}/d`;
  return null;
}
