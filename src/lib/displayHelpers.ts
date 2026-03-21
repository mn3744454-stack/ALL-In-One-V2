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
 * Format a date as DD-MM-YYYY for all breeding domain surfaces.
 */
export function formatBreedingDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd-MM-yyyy");
}
