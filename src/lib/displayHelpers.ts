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
 * Generic bilingual name helper. Same rule as `displayHorseName` but with
 * an explicit name to make intent clear at call sites (dialog titles, etc.).
 *
 * Arabic UI: `Arabic (English)`
 * English UI: `English (Arabic)`
 * Falls back to whichever side exists, or "—" when neither does.
 */
export function formatBilingualName(
  name?: string | null,
  nameAr?: string | null,
  lang?: string
): string {
  return displayHorseName(name, nameAr, lang);
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
 * Bilingual branch/location name display helper.
 * Mirrors displayHorseName/Service/Client logic and optionally appends ", city".
 */
export function displayLocationName(
  name?: string | null,
  nameAr?: string | null,
  city?: string | null,
  lang?: string
): string {
  const activeLang = lang || getCurrentLanguage();
  const en = name?.trim() || null;
  const ar = nameAr?.trim() || null;
  const cityStr = city?.trim() || null;

  let base: string;
  if (!en && !ar) {
    base = "—";
  } else if (!ar) {
    base = en!;
  } else if (!en) {
    base = ar!;
  } else if (en === ar) {
    base = en;
  } else if (activeLang === "ar") {
    base = `${ar} (${en})`;
  } else {
    base = `${en} (${ar})`;
  }

  return cityStr && base !== "—" ? `${base}, ${cityStr}` : base;
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
 * Internal: format a Date as `hh:mm <period>` where the period label is
 * bilingual — `صباحاً` / `مساءً` in Arabic, `AM` / `PM` otherwise.
 *
 * Centralizes the platform-wide 12-hour rule for every time helper below.
 * Never uses Arabic abbreviations (`ص` / `م`).
 */
function formatTime12Bilingual(d: Date, lang: string): string {
  const base = format(d, "hh:mm");
  const hours = d.getHours();
  const period =
    lang === "ar"
      ? hours < 12 ? "صباحاً" : "مساءً"
      : hours < 12 ? "AM" : "PM";
  return `${base} ${period}`;
}

/**
 * Format a date-time as `DD-MM-YYYY hh:mm <period>` — platform-wide
 * 12-hour bilingual standard. Arabic UI emits `صباحاً` / `مساءً`,
 * English UI emits `AM` / `PM`.
 *
 * NOTE: this helper is consumed by display-only callers across Movement,
 * Ownership, Admission, Vet, Lab, HR, Academy, Booking, Order, Schedule
 * and Records timelines. The 12-hour change is intentional and enforces
 * the global Dayli Horse time-format rule.
 */
export function formatStandardDateTime(date?: Date | string | null): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return `${format(d, "dd-MM-yyyy")} ${formatTime12Bilingual(d, getCurrentLanguage())}`;
}

/**
 * Format time-only as `hh:mm <period>` — platform-wide 12-hour bilingual
 * standard. See {@link formatStandardDateTime}.
 */
export function formatStandardTime(date?: Date | string | null): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return formatTime12Bilingual(d, getCurrentLanguage());
}

/**
 * @deprecated Prefer {@link formatStandardDateTime} — it is now 12-hour
 * bilingual platform-wide. Retained as an alias so existing lab share /
 * audit callsites keep working without churn.
 */
export function formatStandardDateTime12(date?: Date | string | null): string {
  return formatStandardDateTime(date);
}
