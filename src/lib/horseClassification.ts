// Horse Age Calculation and Auto-Classification Utility
// STEP 5B: Current Age + Classification (Stallion/Mare/Broodmare/Gelding/Colt/Filly)

import { differenceInYears, differenceInMonths, differenceInDays, differenceInHours } from "date-fns";

// ============= Constants =============

/** Age threshold in years for adult classification (Colt→Stallion, Filly→Mare) */
export const HORSE_AGE_THRESHOLD_YEARS = 4;

// ============= Types =============

export type HorseType = 'stallion' | 'mare' | 'broodmare' | 'gelding' | 'colt' | 'filly';

export interface AgeParts {
  years: number;
  months: number;
  days: number;
  hours: number;
  totalMonths: number;
}

export interface HorseClassificationInput {
  gender: 'male' | 'female' | string;
  birth_date?: string | null;
  birth_at?: string | null;
  is_gelded?: boolean;
  breeding_role?: 'broodmare' | string | null;
}

// ============= Age Calculation =============

/**
 * Get the birth date/time as a Date object
 * Priority: birth_at (if available) → birth_date at 00:00 UTC
 */
export function getBirthDateTime(horse: HorseClassificationInput): Date | null {
  if (horse.birth_at) {
    const date = new Date(horse.birth_at);
    if (!isNaN(date.getTime())) return date;
  }
  
  if (horse.birth_date) {
    // Use birth_date at 00:00 UTC as fallback
    const date = new Date(horse.birth_date + 'T00:00:00Z');
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Calculate the current age of a horse in years, months, days, and hours
 * Returns null if birth date is not available
 */
export function getCurrentAgeParts(horse: HorseClassificationInput): AgeParts | null {
  const birthDate = getBirthDateTime(horse);
  if (!birthDate) return null;
  
  const now = new Date();
  
  // Calculate total differences
  const totalMonths = differenceInMonths(now, birthDate);
  const years = differenceInYears(now, birthDate);
  
  // Calculate remaining months after years
  const afterYears = new Date(birthDate);
  afterYears.setFullYear(afterYears.getFullYear() + years);
  const months = differenceInMonths(now, afterYears);
  
  // Calculate remaining days after months
  const afterMonths = new Date(afterYears);
  afterMonths.setMonth(afterMonths.getMonth() + months);
  const days = differenceInDays(now, afterMonths);
  
  // Calculate remaining hours after days
  const afterDays = new Date(afterMonths);
  afterDays.setDate(afterDays.getDate() + days);
  const hours = differenceInHours(now, afterDays);
  
  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    hours: Math.max(0, hours),
    totalMonths: Math.max(0, totalMonths),
  };
}

/**
 * Format age parts into a readable string
 * Examples: "3y 2m 15d", "0y 5m 3d", "2y 0m 1d 12h"
 */
export function formatCurrentAge(ageParts: AgeParts | null, options?: { includeHours?: boolean }): string {
  if (!ageParts) return "Unknown";
  
  const parts: string[] = [];
  
  if (ageParts.years > 0) {
    parts.push(`${ageParts.years}y`);
  }
  
  parts.push(`${ageParts.months}m`);
  
  if (ageParts.days > 0) {
    parts.push(`${ageParts.days}d`);
  }
  
  // Include hours only if explicitly requested and years is 0 (for young foals)
  if (options?.includeHours && ageParts.years === 0 && ageParts.hours > 0) {
    parts.push(`${ageParts.hours}h`);
  }
  
  return parts.join(' ') || '0m';
}

/**
 * Format age in a compact way for cards
 * Examples: "3y 2m", "8 months", "2 weeks"
 */
export function formatAgeCompact(ageParts: AgeParts | null): string {
  if (!ageParts) return "Unknown age";
  
  if (ageParts.years >= 1) {
    // Show years and months for more detail
    if (ageParts.months > 0) {
      return `${ageParts.years}y ${ageParts.months}m`;
    }
    return `${ageParts.years} ${ageParts.years === 1 ? 'year' : 'years'}`;
  }
  
  if (ageParts.months >= 1) {
    // Show months and days for young horses
    if (ageParts.days > 0 && ageParts.months < 6) {
      return `${ageParts.months}m ${ageParts.days}d`;
    }
    return `${ageParts.months} ${ageParts.months === 1 ? 'month' : 'months'}`;
  }
  
  if (ageParts.days >= 7) {
    const weeks = Math.floor(ageParts.days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  
  return `${ageParts.days} ${ageParts.days === 1 ? 'day' : 'days'}`;
}

// ============= Classification =============

/**
 * Check if horse is adult (age >= threshold years)
 */
export function isAdultHorse(horse: HorseClassificationInput): boolean {
  const ageParts = getCurrentAgeParts(horse);
  if (!ageParts) return true; // Default to adult if unknown
  return ageParts.years >= HORSE_AGE_THRESHOLD_YEARS;
}

/**
 * Determine the horse type/classification based on gender, age, and flags
 * 
 * Rules:
 * - Male + is_gelded → Gelding
 * - Male + age < 4 years → Colt
 * - Male + age >= 4 years → Stallion
 * - Female + age < 4 years → Filly
 * - Female + breeding_role = 'broodmare' → Broodmare
 * - Female + age >= 4 years → Mare
 */
export function getHorseTypeLabel(horse: HorseClassificationInput): HorseType | null {
  if (!horse.gender) return null;
  
  const ageParts = getCurrentAgeParts(horse);
  const isAdult = ageParts ? ageParts.years >= HORSE_AGE_THRESHOLD_YEARS : true;
  
  if (horse.gender === 'male') {
    // Gelding takes priority (owner choice)
    if (horse.is_gelded) return 'gelding';
    // Age-based classification
    return isAdult ? 'stallion' : 'colt';
  }
  
  if (horse.gender === 'female') {
    // Young female is Filly
    if (!isAdult) return 'filly';
    // Broodmare takes priority for adult females (owner choice)
    if (horse.breeding_role === 'broodmare') return 'broodmare';
    // Default adult female is Mare
    return 'mare';
  }
  
  return null;
}

// ============= Badge Props =============

export interface HorseTypeBadgeProps {
  label: string;
  labelAr: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className: string;
}

/**
 * Get badge display properties for a horse type
 */
export function getHorseTypeBadgeProps(type: HorseType | null): HorseTypeBadgeProps {
  switch (type) {
    case 'stallion':
      return {
        label: 'Stallion',
        labelAr: 'فحل',
        variant: 'default',
        className: 'bg-navy text-cream',
      };
    case 'mare':
      return {
        label: 'Mare',
        labelAr: 'فرس',
        variant: 'secondary',
        className: 'bg-gold/20 text-gold-dark',
      };
    case 'broodmare':
      return {
        label: 'Broodmare',
        labelAr: 'فرس تربية',
        variant: 'secondary',
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
      };
    case 'gelding':
      return {
        label: 'Gelding',
        labelAr: 'حصان مخصي',
        variant: 'outline',
        className: 'border-muted-foreground/50 text-muted-foreground',
      };
    case 'colt':
      return {
        label: 'Colt',
        labelAr: 'مهر',
        variant: 'secondary',
        className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      };
    case 'filly':
      return {
        label: 'Filly',
        labelAr: 'مهرة',
        variant: 'secondary',
        className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      };
    default:
      return {
        label: 'Unknown',
        labelAr: 'غير معروف',
        variant: 'outline',
        className: 'border-muted text-muted-foreground',
      };
  }
}
