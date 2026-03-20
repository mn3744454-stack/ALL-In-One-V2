/**
 * Breeding Eligibility Logic
 * 
 * Determines whether a horse is eligible for breeding selection.
 * Does NOT rely solely on sex or age — respects user-controlled breeding_role
 * and classification signals (gelding, colt, filly).
 */

import { getHorseTypeLabel, HorseClassificationInput, HorseType } from "./horseClassification";

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
 * Rules:
 * - Geldings → always ineligible
 * - Colts (male < 4y) → ineligible (immature)
 * - Fillies (female < 4y) → ineligible (immature) UNLESS breeding_role is explicitly 'broodmare'
 * - Stallions (male >= 4y, not gelded) → breeding_stallion
 * - Mares (female >= 4y) → breeding_mare
 * - Broodmares (explicit breeding_role) → breeding_mare
 */
export function getBreedingRole(horse: BreedingEligibilityInput): BreedingRole {
  const type = getHorseTypeLabel(horse);

  // 1. Geldings — always ineligible regardless of any designation
  if (type === 'gelding') return 'ineligible';

  // 2. Explicit breeding designation takes priority over age/sex inference
  if (horse.breeding_role === 'broodmare') return 'breeding_mare';
  if (horse.breeding_role === 'breeding_stallion') return 'breeding_stallion';

  // 3. Classification-based defaults (age + sex as supporting signal)
  if (!type) return 'ineligible';

  switch (type) {
    case 'stallion':
      return 'breeding_stallion';
    case 'mare':
    case 'broodmare':
      return 'breeding_mare';
    case 'colt':
    case 'filly':
      // Immature without explicit designation — conservative default
      return 'ineligible';
    default:
      return 'ineligible';
  }
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
