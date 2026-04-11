/**
 * Breeding Eligibility Logic
 * 
 * Determines whether a horse is eligible for breeding selection.
 * Uses ONLY explicit stored designation (breeding_role) — never derived display labels.
 * Symmetric gating: both males and females require explicit designation.
 */

import { HorseClassificationInput } from "./horseClassification";

export interface BreedingEligibilityInput extends HorseClassificationInput {
  id?: string;
  name?: string;
  name_ar?: string | null;
  avatar_url?: string | null;
}

export type BreedingRole = 'breeding_stallion' | 'breeding_mare' | 'ineligible';

/**
 * Determine the breeding role eligibility of a horse.
 * 
 * Rules (symmetric — both sexes require explicit designation):
 * - Geldings → always ineligible (irreversible)
 * - breeding_role = 'breeding_stallion' AND not gelded → breeding_stallion
 * - breeding_role = 'broodmare' → breeding_mare
 * - Everything else → ineligible (including generic حصان and generic فرس)
 */
export function getBreedingRole(horse: BreedingEligibilityInput): BreedingRole {
  // 1. Geldings — always ineligible regardless of any designation
  if (horse.is_gelded) return 'ineligible';

  // 2. Explicit breeding designation is the ONLY path to eligibility
  if (horse.breeding_role === 'breeding_stallion') return 'breeding_stallion';
  if (horse.breeding_role === 'broodmare') return 'breeding_mare';

  // 3. Everything else — ineligible
  // This includes: generic horse (حصان), generic mare (فرس), colt (مهر), filly (مهرة)
  return 'ineligible';
}

/**
 * Check if a horse is eligible as a breeding stallion candidate
 */
export function isEligibleStallion(horse: BreedingEligibilityInput): boolean {
  return getBreedingRole(horse) === 'breeding_stallion';
}

/**
 * Check if a horse is eligible as a breeding mare candidate
 */
export function isEligibleMare(horse: BreedingEligibilityInput): boolean {
  return getBreedingRole(horse) === 'breeding_mare';
}

/**
 * Filter a list of horses to only eligible stallions
 */
export function filterEligibleStallions<T extends BreedingEligibilityInput>(horses: T[]): T[] {
  return horses.filter(isEligibleStallion);
}

/**
 * Filter a list of horses to only eligible mares
 */
export function filterEligibleMares<T extends BreedingEligibilityInput>(horses: T[]): T[] {
  return horses.filter(isEligibleMare);
}
