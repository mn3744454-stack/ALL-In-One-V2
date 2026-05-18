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
