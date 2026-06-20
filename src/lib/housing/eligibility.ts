/**
 * Phase 1.e.f.7.g.1 — Shared Housing Eligibility Contract
 *
 * Single frontend source of truth for "can this horse be admitted for a new
 * stay right now?". Consumed by AdmissionWizard (g.2) and later by readiness
 * surfaces (g.3). Pure helpers only — no Supabase calls. Query/fetch work
 * lives in the consuming hook/component.
 *
 * Scope: frontend-only. Does NOT change schema, RLS, RPCs, or
 * vw_horse_lifecycle_state. The backend RPC remains the authoritative guard;
 * this contract aligns the UI so users never see (or successfully submit) a
 * duplicate-admission attempt.
 */

/** Admission statuses that represent an open stay and therefore block a new admission. */
export const ACTIVE_LIKE_ADMISSION_STATUSES = [
  "draft",
  "active",
  "checkout_pending",
] as const;
export type ActiveLikeAdmissionStatus = (typeof ACTIVE_LIKE_ADMISSION_STATUSES)[number];

/** Horse statuses that disqualify a horse from any new admission. */
export const EXCLUDED_NEW_ADMISSION_HORSE_STATUSES = [
  "archived",
  "sold",
  "deceased",
  "transferred",
  "inactive",
] as const;
export type ExcludedHorseStatus = (typeof EXCLUDED_NEW_ADMISSION_HORSE_STATUSES)[number];

/** Reason a horse is ineligible. `null` = eligible. */
export type IneligibilityReasonKey =
  | "horse_status_excluded"
  | "active_admission"
  | "already_housed"
  | null;

export interface MinimalHorse {
  id: string;
  status?: string | null;
}

export interface MinimalAdmission {
  horse_id: string;
  status: string;
}

export interface MinimalOccupant {
  horse_id: string;
  /** ISO timestamp or null. `null` = currently housed. */
  until: string | null;
}

export interface HorseAdmissionEligibility {
  horseId: string;
  isEligibleForNewAdmission: boolean;
  hasActiveAdmission: boolean;
  isHoused: boolean;
  reasonKey: IneligibilityReasonKey;
}

export function hasActiveLikeAdmission(admissionsForHorse: MinimalAdmission[] | null | undefined): boolean {
  if (!admissionsForHorse?.length) return false;
  return admissionsForHorse.some((a) =>
    (ACTIVE_LIKE_ADMISSION_STATUSES as readonly string[]).includes((a.status ?? "").toLowerCase())
  );
}

export function hasActiveOccupancy(occupantsForHorse: MinimalOccupant[] | null | undefined): boolean {
  if (!occupantsForHorse?.length) return false;
  return occupantsForHorse.some((o) => o.until === null || o.until === undefined);
}

export function isExcludedHorseStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (EXCLUDED_NEW_ADMISSION_HORSE_STATUSES as readonly string[]).includes(
    status.toString().toLowerCase()
  );
}

/**
 * Compute eligibility for a single horse from already-fetched data.
 * Pure — no Supabase calls. Caller batches queries upstream.
 *
 * Order of reasons (first match wins):
 *   1. horse_status_excluded
 *   2. active_admission
 *   3. already_housed
 */
export function getHorseAdmissionEligibility(params: {
  horse: MinimalHorse;
  admissions: MinimalAdmission[] | null | undefined;
  occupants: MinimalOccupant[] | null | undefined;
}): HorseAdmissionEligibility {
  const { horse, admissions, occupants } = params;
  const hasAdmission = hasActiveLikeAdmission(admissions);
  const housed = hasActiveOccupancy(occupants);
  const excluded = isExcludedHorseStatus(horse.status);

  let reasonKey: IneligibilityReasonKey = null;
  if (excluded) reasonKey = "horse_status_excluded";
  else if (hasAdmission) reasonKey = "active_admission";
  else if (housed) reasonKey = "already_housed";

  return {
    horseId: horse.id,
    isEligibleForNewAdmission: reasonKey === null,
    hasActiveAdmission: hasAdmission,
    isHoused: housed,
    reasonKey,
  };
}

/**
 * Group raw rows by horse_id for fast per-horse eligibility lookup.
 */
export function groupByHorseId<T extends { horse_id: string }>(
  rows: T[] | null | undefined
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  (rows ?? []).forEach((r) => {
    if (!r?.horse_id) return;
    const bucket = map.get(r.horse_id);
    if (bucket) bucket.push(r);
    else map.set(r.horse_id, [r]);
  });
  return map;
}

/** i18n key for an ineligibility reason. */
export function ineligibilityI18nKey(reason: IneligibilityReasonKey): string | null {
  switch (reason) {
    case "active_admission":
      return "housing.admissions.wizard.ineligibleActiveAdmission";
    case "already_housed":
      return "housing.admissions.wizard.ineligibleAlreadyHoused";
    case "horse_status_excluded":
      return "housing.admissions.wizard.ineligibleHorseStatus";
    default:
      return null;
  }
}
