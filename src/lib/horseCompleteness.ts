/**
 * Unified Horse Profile completeness predicate.
 *
 * Single source of truth used by:
 *  - src/components/horses/HorseProfileCompleteness.tsx (profile card)
 *  - src/components/horses/IncompleteProfileModal.tsx   (per-horse missing chips)
 *  - src/components/horses/HorsesList.tsx               (list bucket / badge)
 *
 * A horse is "complete" only when ALL of the following are present:
 *   1. birth_date
 *   2. breed_id
 *   3. color_id
 *   4. microchip_number
 *   5. passport_number
 *   6. ueln
 *   7. pedigree   (any of mother_id | father_id | mother_name | father_name)
 *   8. owner      (owners_count > 0)
 *
 * Operational fields (branch, stable, housing unit, housing notes,
 * current location, active admission, movement, status) are intentionally
 * NOT part of completeness — they belong to operational truth surfaces.
 */

export interface CompletenessHorse {
  birth_date?: string | null;
  breed_id?: string | null;
  color_id?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
  mother_id?: string | null;
  father_id?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
  // PostgREST embed may return any of these shapes
  owners_count?: number | { count: number }[] | { count: number } | null;
}

/** Normalize PostgREST `owners_count:horse_ownership(count)` into a number. */
export function normalizeOwnersCount(
  raw: CompletenessHorse["owners_count"],
): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  if (Array.isArray(raw)) {
    return raw.reduce((sum, row) => sum + (row?.count ?? 0), 0);
  }
  if (typeof raw === "object" && "count" in raw) {
    return raw.count ?? 0;
  }
  return 0;
}

export type CompletenessKey =
  | "birth_date"
  | "breed"
  | "color"
  | "microchip"
  | "passport"
  | "ueln"
  | "pedigree"
  | "owner";

export interface CompletenessCheck {
  key: CompletenessKey;
  filled: boolean;
}

export function getCompletenessChecks(horse: CompletenessHorse): CompletenessCheck[] {
  const ownersCount = normalizeOwnersCount(horse.owners_count);
  return [
    { key: "birth_date", filled: !!horse.birth_date },
    { key: "breed", filled: !!horse.breed_id },
    { key: "color", filled: !!horse.color_id },
    { key: "microchip", filled: !!horse.microchip_number },
    { key: "passport", filled: !!horse.passport_number },
    { key: "ueln", filled: !!horse.ueln },
    {
      key: "pedigree",
      filled: !!(horse.mother_id || horse.father_id || horse.mother_name || horse.father_name),
    },
    { key: "owner", filled: ownersCount > 0 },
  ];
}

export function isHorseIncomplete(horse: CompletenessHorse): boolean {
  return getCompletenessChecks(horse).some((c) => !c.filled);
}

/** i18n key for each completeness slot. */
export const COMPLETENESS_LABEL_KEYS: Record<CompletenessKey, string> = {
  birth_date: "horses.wizard.birthDate",
  breed: "horses.profile.breed",
  color: "horses.profile.color",
  microchip: "horses.profile.microchip",
  passport: "horses.profile.passport",
  ueln: "horses.profile.ueln",
  pedigree: "horses.profile.pedigree",
  owner: "horses.profile.owner",
};
