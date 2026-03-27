import { format } from "date-fns";
import { getCurrentLanguage } from "@/i18n";

/**
 * Bilingual horse name display helper.
 * 
 * Arabic mode: name_ar (name)
 * English mode: name (name_ar)
 * 
 * Fallback: whichever name exists. No empty parentheses. No duplicates.
 */
export function displayHorseName(
  name?: string | null,
  nameAr?: string | null,
  lang?: string
): string {
  const activeLang = lang || getCurrentLanguage();
  const en = name?.trim() || null;
  const ar = nameAr?.trim() || null;

  if (!en && !ar) return "—";
  if (!ar) return en!;
  if (!en) return ar!;
  if (en === ar) return en;

  if (activeLang === "ar") {
    return `${ar} (${en})`;
  }
  return `${en} (${ar})`;
}

/**
 * Bilingual service name display helper.
 * Same logic as displayHorseName but for services.
 */
export function displayServiceName(
  name?: string | null,
  nameAr?: string | null,
  lang?: string
): string {
  const activeLang = lang || getCurrentLanguage();
  const en = name?.trim() || null;
  const ar = nameAr?.trim() || null;

  if (!en && !ar) return "—";
  if (!ar) return en!;
  if (!en) return ar!;
  if (en === ar) return en;

  if (activeLang === "ar") {
    return `${ar} (${en})`;
  }
  return `${en} (${ar})`;
}

/**
 * Bilingual client name display helper.
 * Same logic as displayHorseName but for clients.
 */
export function displayClientName(
  name?: string | null,
  nameAr?: string | null,
  lang?: string
): string {
  const activeLang = lang || getCurrentLanguage();
  const en = name?.trim() || null;
  const ar = nameAr?.trim() || null;

  if (!en && !ar) return "—";
  if (!ar) return en!;
  if (!en) return ar!;
  if (en === ar) return en;

  if (activeLang === "ar") {
    return `${ar} (${en})`;
  }
  return `${en} (${ar})`;
}

/**
 * Format a date as DD-MM-YYYY — platform-wide standard.
 * Alias: formatBreedingDate (backward compat)
 */
function toValidDate(date?: Date | string | null): Date | null {
  if (!date) return null;
  const parsed = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatStandardDate(date?: Date | string | null): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return format(d, "dd-MM-yyyy");
}

/** @deprecated Use formatStandardDate */
export const formatBreedingDate = formatStandardDate;

/**
 * Format a date-time as DD-MM-YYYY HH:mm — platform-wide standard.
 */
export function formatStandardDateTime(date?: Date | string | null): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return format(d, "dd-MM-yyyy HH:mm");
}

/**
 * Format time-only as HH:mm (24h) — platform-wide standard.
 */
export function formatStandardTime(date?: Date | string | null): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return format(d, "HH:mm");
}
