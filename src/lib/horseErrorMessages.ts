/**
 * Horse Registry error mapping.
 *
 * Maps Supabase/Postgres errors raised by horse save/update/delete flows
 * to friendly bilingual messages. Tenant-scoped unique indexes on the
 * `horses` table (passport, microchip, ueln) are surfaced as actionable
 * messages instead of raw `duplicate key value violates unique constraint`
 * text.
 *
 * Scope: Horse Registry / Horse Wizard / Horse Profile only.
 */

type Translator = (key: string) => string;

export interface FriendlyError {
  title: string;
  description: string;
}

interface ErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function extractText(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const e = error as ErrorLike;
  return [e.message, e.details, e.hint].filter(Boolean).join(" ");
}

function isDuplicateKey(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as ErrorLike;
  if (e.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(extractText(error));
}

/**
 * Map a horse save/update error to a friendly localized toast payload.
 * Always logs the raw error for developer debugging.
 */
export function mapHorseSaveError(error: unknown, t: Translator): FriendlyError {
  console.error("[horses] raw error", error);

  // Phase 1.e.f.8.1.4.d.3.execution — update_horse_identity RPC reason_code
  // mapping. The wizard's edit branch throws Error objects with a
  // `reason_code` property when the RPC returns `{ success:false }`.
  const reasonCode =
    (error && typeof error === "object" && (error as any).reason_code) ||
    (error && typeof error === "object" && (error as any).error_code) ||
    null;
  const field =
    error && typeof error === "object" ? (error as any).field : undefined;

  switch (reasonCode) {
    // Phase 1.e.f.8.1.4.d.3.fix.1.r1.qa1.local — Local Record Custodial
    // Completion RPC reason codes.
    case "local_record_permission_denied":
    case "local_record_membership_inactive":
    case "local_record_not_stable_tenant":
    case "local_record_authentication_required":
      return {
        title: t("horses.errors.localRecordPermissionDenied.title"),
        description: t("horses.errors.localRecordPermissionDenied.description"),
      };
    case "local_record_owner_tenant_exists":
    case "local_record_current_owner_exists":
      return {
        title: t("horses.errors.localRecordOwnerExists.title"),
        description: t("horses.errors.localRecordOwnerExists.description"),
      };
    case "owner_truth_review_required":
      return {
        title: t("horses.errors.localRecordReviewRequired.title"),
        description: t("horses.errors.localRecordReviewRequired.description"),
      };
    case "local_record_not_in_active_tenant":
    case "local_record_tenant_not_found":
    case "local_record_active_tenant_required":
    case "local_record_horse_not_found":
      return {
        title: t("horses.errors.localRecordNotInTenant.title"),
        description: t("horses.errors.localRecordNotInTenant.description"),
      };
    case "local_record_status_denied":
      return {
        title: t("horses.errors.localRecordStatusDenied.title"),
        description: t("horses.errors.localRecordStatusDenied.description"),
      };
    case "local_record_field_restricted":
      return {
        title: t("horses.errors.localRecordFieldRestricted.title"),
        description: t("horses.errors.localRecordFieldRestricted.description"),
      };
    case "local_record_field_not_missing":
      return {
        title: t("horses.errors.localRecordFieldNotMissing.title"),
        description: t("horses.errors.localRecordFieldNotMissing.description"),
      };
    case "local_record_birth_date_already_set":
      return {
        title: t("horses.errors.localRecordBirthDateAlreadySet.title"),
        description: t("horses.errors.localRecordBirthDateAlreadySet.description"),
      };
    case "local_record_no_safe_missing_fields":
      return {
        title: t("horses.errors.localRecordNoSafeFields.title"),
        description: t("horses.errors.localRecordNoSafeFields.description"),
      };
    case "local_record_completion_not_available":
    case "local_record_payload_invalid":
      return {
        title: t("horses.errors.localRecordCompletionUnavailable.title"),
        description: t("horses.errors.localRecordCompletionUnavailable.description"),
      };
    case "host_operational_denied_for_identity":
      return {
        title: t("horses.errors.hostIdentityDenied.title"),
        description: t("horses.errors.hostIdentityDenied.description"),
      };
    case "owner_tenant_mismatch":
    case "ownership_transfer_completed_to_new_owner":
    case "former_owner":
      return {
        title: t("horses.errors.ownershipTransferred.title"),
        description: t("horses.errors.ownershipTransferred.description"),
      };
    case "no_write_authority":
    case "no_current_owner_authority":
    case "member_role_not_owner":
    case "not_current_owner":
      return {
        title: t("horses.errors.noWriteAuthority.title"),
        description: t("horses.errors.noWriteAuthority.description"),
      };
    case "multiple_active_members_ambiguous":
    case "ambiguous_authority":
      return {
        title: t("horses.errors.ambiguousAuthority.title"),
        description: t("horses.errors.ambiguousAuthority.description"),
      };
    case "restricted_identity_field":
      // Phase 1.e.f.8.1.4.d.3.fix.1.r1 — governance-restricted identity fields.
      // Map to field-specific messages so users are pointed to the correct
      // future correction workflow rather than a generic save failure.
      if (field === "gender") {
        return {
          title: t("horses.errors.genderLocked.title"),
          description: t("horses.errors.genderLocked.description"),
        };
      }
      if (field === "breed_id") {
        return {
          title: t("horses.errors.breedLocked.title"),
          description: t("horses.errors.breedLocked.description"),
        };
      }
      if (field === "birth_date") {
        return {
          title: t("horses.errors.birthDateLocked.title"),
          description: t("horses.errors.birthDateLocked.description"),
        };
      }
      if (field === "birth_at") {
        return {
          title: t("horses.errors.birthTimeLocked.title"),
          description: t("horses.errors.birthTimeLocked.description"),
        };
      }
      return {
        title: t("horses.errors.restrictedField.title"),
        description: t("horses.errors.restrictedField.description"),
      };
    case "duplicate_microchip":
      return {
        title: t("horses.errors.microchipDuplicate.title"),
        description: t("horses.errors.microchipDuplicate.description"),
      };
    case "duplicate_passport":
      return {
        title: t("horses.errors.passportDuplicate.title"),
        description: t("horses.errors.passportDuplicate.description"),
      };
    case "blocked_field":
    case "unsupported_field":
      return {
        title: t("horses.errors.unsupportedField.title"),
        description: t("horses.errors.unsupportedField.description"),
      };
    case "invalid_field_value":
      return {
        title: t("horses.errors.invalidField.title"),
        description: t("horses.errors.invalidField.description"),
      };
    case "empty_payload":
      return {
        title: t("horses.errors.emptyPayload.title"),
        description: t("horses.errors.emptyPayload.description"),
      };
    case "malformed_payload":
      return {
        title: t("horses.errors.malformedPayload.title"),
        description: t("horses.errors.malformedPayload.description"),
      };
    case "internal_error":
      return {
        title: t("horses.errors.saveFailed.title"),
        description: t("horses.errors.saveFailed.description"),
      };
  }

  if (isDuplicateKey(error)) {
    const text = extractText(error);
    if (text.includes("uq_horses_tenant_passport")) {
      return {
        title: t("horses.errors.passportDuplicate.title"),
        description: t("horses.errors.passportDuplicate.description"),
      };
    }
    if (text.includes("uq_horses_tenant_microchip")) {
      return {
        title: t("horses.errors.microchipDuplicate.title"),
        description: t("horses.errors.microchipDuplicate.description"),
      };
    }
    if (text.includes("uq_horses_tenant_ueln")) {
      return {
        title: t("horses.errors.uelnDuplicate.title"),
        description: t("horses.errors.uelnDuplicate.description"),
      };
    }
  }

  return {
    title: t("horses.errors.saveFailed.title"),
    description: t("horses.errors.saveFailed.description"),
  };
}


/**
 * Friendly delete-failure payload. Never exposes raw DB text.
 */
export function mapHorseDeleteError(error: unknown, t: Translator): FriendlyError {
  console.error("[horses] raw delete error", error);
  return {
    title: t("horses.errors.deleteFailed.title"),
    description: t("horses.errors.deleteFailed.description"),
  };
}

/**
 * Detect duplicate-name errors raised by master-data (breed/color) creation.
 * Returns null if the error is not a duplicate-name violation.
 */
export function mapMasterDataDuplicate(error: unknown, t: Translator): FriendlyError | null {
  if (!isDuplicateKey(error)) return null;
  return {
    title: t("horses.masterData.errorCreating"),
    description: t("horses.masterData.duplicateName"),
  };
}

/**
 * Detect browser transport/network errors raised by master-data creation
 * (e.g. `TypeError: Failed to fetch`, `NetworkError`). Returns null otherwise.
 */
export function mapMasterDataNetwork(error: unknown, t: Translator): FriendlyError | null {
  if (!error) return null;
  const name = (error as { name?: string })?.name || "";
  const text = extractText(error);
  const isNetwork =
    name === "TypeError" && /failed to fetch/i.test(text) ||
    /failed to fetch|network ?error|networkerror|fetch failed/i.test(text);
  if (!isNetwork) return null;
  return {
    title: t("horses.masterData.errorNetwork.title"),
    description: t("horses.masterData.errorNetwork.description"),
  };
}

