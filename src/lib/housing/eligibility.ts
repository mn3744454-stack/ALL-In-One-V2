/**
 * Phase 1.e.f.7.g.1 — Shared Housing Eligibility Contract
 * Phase 1.e.f.7.g.7 — Historical-only / departed-from-tenant extension.
 *
 * Single frontend source of truth for "can this horse be admitted for a new
 * stay right now?". Consumed by AdmissionWizard (g.2, g.7) and later by
 * readiness surfaces (g.3). Pure helpers only — no Supabase calls. Query/fetch
 * work lives in the consuming hook/component.
 *
 * Scope: frontend-only. Does NOT change schema, RLS, RPCs, or
 * vw_horse_lifecycle_state. The backend RPC remains the authoritative guard;
 * this contract aligns the UI so users never see (or successfully submit) a
 * duplicate-admission attempt — and never see a departed/transferred-away
 * horse listed as a fresh candidate in its previous tenant.
 */

/** Admission statuses that represent an open stay and therefore block a new admission. */
export const ACTIVE_LIKE_ADMISSION_STATUSES = [
  "draft",
  "active",
  "checkout_pending",
] as const;
export type ActiveLikeAdmissionStatus = (typeof ACTIVE_LIKE_ADMISSION_STATUSES)[number];

/**
 * Operationally open admissions — admissions that represent a real,
 * in-progress stay. Used by sibling queries that look up "the current open
 * admission for this horse / unit / branch" and by transition guards.
 *
 * Intentionally EXCLUDES `draft`: drafts are not yet open stays.
 * Do NOT confuse with ACTIVE_LIKE_ADMISSION_STATUSES, which DOES include
 * `draft` because drafts still block creating another new admission.
 */
export const OPERATIONAL_OPEN_ADMISSION_STATUSES = [
  "active",
  "checkout_pending",
] as const;
export type OperationalOpenAdmissionStatus =
  (typeof OPERATIONAL_OPEN_ADMISSION_STATUSES)[number];

/** Horse statuses that disqualify a horse from any new admission. */
export const EXCLUDED_NEW_ADMISSION_HORSE_STATUSES = [
  "archived",
  "sold",
  "deceased",
  "transferred",
  "inactive",
] as const;
export type ExcludedHorseStatus = (typeof EXCLUDED_NEW_ADMISSION_HORSE_STATUSES)[number];

/**
 * Movement subtypes that indicate the horse has left the current tenant's
 * operational custody. Values mirror the canonical vocabulary used by
 * horse_movements / vw_horse_lifecycle_state (checkout_departure covers both
 * local checkouts and connected outbound dispatches; vw_horse_lifecycle_state
 * already gates `is_departed` on this subtype). internal_transfer is intra-
 * tenant and intentionally excluded.
 */
export const OUTBOUND_TRANSFER_SUBTYPES = [
  "checkout_departure",
] as const;
export type OutboundTransferSubtype = (typeof OUTBOUND_TRANSFER_SUBTYPES)[number];

/** Reason a horse is ineligible. `null` = eligible. */
export type IneligibilityReasonKey =
  | "horse_status_excluded"
  | "departed_from_tenant"
  | "transferred_away"
  | "historical_only"
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

/**
 * Subset of vw_horse_lifecycle_state used by the eligibility contract.
 * All fields optional so legacy callers (g.2 wizard before g.7) still work.
 */
export interface MinimalLifecycleState {
  is_departed?: boolean | null;
  latest_completed_movement_subtype?: string | null;
  open_admission_status?: string | null;
}

export interface HorseAdmissionEligibility {
  horseId: string;
  isEligibleForNewAdmission: boolean;
  hasActiveAdmission: boolean;
  isHoused: boolean;
  /** True when horse has departed/transferred away from this tenant. */
  isHistoricalOnly: boolean;
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

export function isOutboundTransferSubtype(subtype: string | null | undefined): boolean {
  if (!subtype) return false;
  return (OUTBOUND_TRANSFER_SUBTYPES as readonly string[]).includes(
    subtype.toString().toLowerCase()
  );
}

/**
 * Historical-only test for a tenant. True when the horse has prior activity
 * here, no current open admission/occupancy, and the lifecycle signal
 * indicates exit (departed or last completed movement is an outbound transfer).
 *
 * A local same-tenant horse that was simply checked out but never departed
 * (no outbound transfer subtype, is_departed != true) is NOT historical-only:
 * its tenant may legitimately readmit it for a new stay.
 */
export function isHistoricalOnlyForTenant(params: {
  lifecycle: MinimalLifecycleState | null | undefined;
  admissions: MinimalAdmission[] | null | undefined;
  occupants: MinimalOccupant[] | null | undefined;
  hasPriorAdmissions?: boolean;
}): boolean {
  const { lifecycle, admissions, occupants } = params;
  if (!lifecycle) return false;
  if (hasActiveLikeAdmission(admissions)) return false;
  if (hasActiveOccupancy(occupants)) return false;
  if (lifecycle.is_departed === true) return true;
  if (isOutboundTransferSubtype(lifecycle.latest_completed_movement_subtype)) return true;
  return false;
}

/** Whether a reason requires a formal return/incoming movement to clear. */
export function requiresReturnMovement(reason: IneligibilityReasonKey): boolean {
  return (
    reason === "departed_from_tenant" ||
    reason === "transferred_away" ||
    reason === "historical_only"
  );
}

/**
 * Compute eligibility for a single horse from already-fetched data.
 * Pure — no Supabase calls. Caller batches queries upstream.
 *
 * Reason precedence (first match wins):
 *   1. horse_status_excluded
 *   2. departed_from_tenant      (lifecycle.is_departed === true)
 *   3. transferred_away          (latest_completed_movement_subtype outbound)
 *   4. historical_only           (lifecycle present, no current state, fallback)
 *   5. active_admission
 *   6. already_housed
 */
export function getHorseAdmissionEligibility(params: {
  horse: MinimalHorse;
  admissions: MinimalAdmission[] | null | undefined;
  occupants: MinimalOccupant[] | null | undefined;
  lifecycle?: MinimalLifecycleState | null;
  /** Optional latest admission status (e.g. "checked_out") used as a fallback historical signal. */
  latestAdmissionStatus?: string | null;
}): HorseAdmissionEligibility {
  const { horse, admissions, occupants, lifecycle, latestAdmissionStatus } = params;
  const hasAdmission = hasActiveLikeAdmission(admissions);
  const housed = hasActiveOccupancy(occupants);
  const excluded = isExcludedHorseStatus(horse.status);

  // Lifecycle-driven historical reasons take precedence over duplicate
  // active-admission reasons, because if the horse has departed, the active
  // admission row shouldn't exist anyway — surface the root cause.
  const departed = lifecycle?.is_departed === true;
  const transferredAway = isOutboundTransferSubtype(lifecycle?.latest_completed_movement_subtype);
  const historical =
    !hasAdmission &&
    !housed &&
    (departed ||
      transferredAway ||
      (latestAdmissionStatus ?? "").toLowerCase() === "checked_out");

  let reasonKey: IneligibilityReasonKey = null;
  if (excluded) reasonKey = "horse_status_excluded";
  else if (departed) reasonKey = "departed_from_tenant";
  else if (transferredAway) reasonKey = "transferred_away";
  else if (!hasAdmission && !housed && historical) reasonKey = "historical_only";
  else if (hasAdmission) reasonKey = "active_admission";
  else if (housed) reasonKey = "already_housed";

  return {
    horseId: horse.id,
    isEligibleForNewAdmission: reasonKey === null,
    hasActiveAdmission: hasAdmission,
    isHoused: housed,
    isHistoricalOnly: departed || transferredAway || historical,
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
    case "departed_from_tenant":
      return "housing.admissions.wizard.ineligibleDepartedFromTenant";
    case "transferred_away":
      return "housing.admissions.wizard.ineligibleTransferredAway";
    case "historical_only":
      return "housing.admissions.wizard.ineligibleHistoricalOnly";
    default:
      return null;
  }
}
