// Horse Age Calculation and Auto-Classification Utility
// Classification engine: separates sex, age-stage, reproductive status, breeding role, and size classification

import { differenceInYears, differenceInMonths, differenceInDays, differenceInHours } from "date-fns";

// ============= Constants =============

/** Age threshold in years for adult classification (Colt→Horse, Filly→Mare) */
export const HORSE_AGE_THRESHOLD_YEARS = 4;

// ============= Types =============

/**
 * HorseType represents the derived display classification.
 * 'horse' = generic adult male (not a breeding stallion, not gelded)
 * 'stallion' = explicitly designated breeding stallion
 * 'mare' = generic adult female (not designated for breeding)
 * 'broodmare' = explicitly designated breeding mare
 * 'gelding' = castrated male
 * 'colt' = young male (< 4y)
 * 'filly' = young female (< 4y)
 */
export type HorseType = 'stallion' | 'horse' | 'mare' | 'broodmare' | 'gelding' | 'colt' | 'filly';

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
  breeding_role?: 'broodmare' | 'breeding_stallion' | string | null;
  is_pony?: boolean;
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
    const date = new Date(horse.birth_date + 'T00:00:00Z');
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Calculate the current age of a horse in years, months, days, and hours
 */
export function getCurrentAgeParts(horse: HorseClassificationInput): AgeParts | null {
  const birthDate = getBirthDateTime(horse);
  if (!birthDate) return null;
  
  const now = new Date();
  
  const totalMonths = differenceInMonths(now, birthDate);
  const years = differenceInYears(now, birthDate);
  
  const afterYears = new Date(birthDate);
  afterYears.setFullYear(afterYears.getFullYear() + years);
  const months = differenceInMonths(now, afterYears);
  
  const afterMonths = new Date(afterYears);
  afterMonths.setMonth(afterMonths.getMonth() + months);
  const days = differenceInDays(now, afterMonths);
  
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
  
  if (options?.includeHours && ageParts.years === 0 && ageParts.hours > 0) {
    parts.push(`${ageParts.hours}h`);
  }
  
  return parts.join(' ') || '0m';
}

/**
 * Format age in a compact way for cards
 */
export function formatAgeCompact(ageParts: AgeParts | null): string {
  if (!ageParts) return "Unknown age";
  
  if (ageParts.years >= 1) {
    if (ageParts.months > 0) {
      return `${ageParts.years}y ${ageParts.months}m`;
    }
    return `${ageParts.years} ${ageParts.years === 1 ? 'year' : 'years'}`;
  }
  
  if (ageParts.months >= 1) {
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
 * Determine the horse type/classification based on gender, age, and explicit designations.
 * 
 * Rules (updated — no more auto-stallion):
 * - Male + is_gelded → Gelding (regardless of age or designation)
 * - Male + breeding_role = 'breeding_stallion' → Stallion  
 * - Male + age < 4 years → Colt
 * - Male + age >= 4 years (no breeding designation) → Horse (حصان)
 * - Female + breeding_role = 'broodmare' → Broodmare
 * - Female + age < 4 years → Filly
 * - Female + age >= 4 years (no breeding designation) → Mare
 */
export function getHorseTypeLabel(horse: HorseClassificationInput): HorseType | null {
  if (!horse.gender) return null;
  
  const ageParts = getCurrentAgeParts(horse);
  const isAdult = ageParts ? ageParts.years >= HORSE_AGE_THRESHOLD_YEARS : true;
  
  if (horse.gender === 'male') {
    // Gelding takes priority — irreversible surgical state
    if (horse.is_gelded) return 'gelding';
    // Explicit breeding designation
    if (horse.breeding_role === 'breeding_stallion') return 'stallion';
    // Age-based classification — adult males without designation are "horse" (حصان)
    return isAdult ? 'horse' : 'colt';
  }
  
  if (horse.gender === 'female') {
    // Explicit breeding designation takes priority for adult females
    if (horse.breeding_role === 'broodmare') return 'broodmare';
    // Age-based classification
    return isAdult ? 'mare' : 'filly';
  }
  
  return null;
}

/**
 * Get the recommended classification based purely on age+sex (no designation considered).
 * Used for the recommendation banner in the wizard.
 */
export function getRecommendedClassification(horse: HorseClassificationInput): HorseType | null {
  if (!horse.gender) return null;
  const ageParts = getCurrentAgeParts(horse);
  const isAdult = ageParts ? ageParts.years >= HORSE_AGE_THRESHOLD_YEARS : true;
  
  if (horse.gender === 'male') {
    if (horse.is_gelded) return 'gelding';
    return isAdult ? 'horse' : 'colt';
  }
  if (horse.gender === 'female') {
    return isAdult ? 'mare' : 'filly';
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
    case 'horse':
      return {
        label: 'Horse',
        labelAr: 'حصان',
        variant: 'secondary',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
        labelAr: 'فرس تربية (رمكة)',
        variant: 'secondary',
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
      };
    case 'gelding':
      return {
        label: 'Gelding',
        labelAr: 'مخصي',
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

/**
 * Get pony badge props (orthogonal to main classification)
 */
export function getPonyBadgeProps(): HorseTypeBadgeProps {
  return {
    label: 'Pony',
    labelAr: 'بوني',
    variant: 'outline',
    className: 'border-amber-400 text-amber-700 dark:border-amber-500 dark:text-amber-400',
  };
}
