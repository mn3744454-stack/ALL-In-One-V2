/**
 * Breeding error mapping.
 *
 * Maps Supabase/Postgres errors raised by breeding flows to friendly
 * bilingual messages. Mirrors the pattern in `horseErrorMessages.ts`.
 *
 * Scope (Phase 0.c): pregnancy duplicate-active constraint only.
 * A broader sweep across breeding hooks belongs to Phase 1.
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
 * Map a pregnancy create/update error to a friendly localized payload.
 * Returns null if the error is not a known mapped case; callers should
 * fall back to a generic message.
 */
export function mapPregnancySaveError(
  error: unknown,
  t: Translator,
): FriendlyError | null {
  console.error("[breeding] pregnancy raw error", error);

  if (isDuplicateKey(error)) {
    const text = extractText(error);
    if (text.includes("idx_one_active_pregnancy_per_mare")) {
      return {
        title: t("breeding.errors.activePregnancyExists.title"),
        description: t("breeding.errors.activePregnancyExists.description"),
      };
    }
  }

  return null;
}
