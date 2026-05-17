interface HorseNameFields {
  lab_horse?: { name: string; name_ar?: string | null } | null;
  horse?: { name: string; name_ar?: string | null } | null;
  horse_name?: string | null;
}

interface GetLabHorseDisplayNameOptions {
  locale?: 'ar' | 'en';
  fallback?: string;
}

/**
 * Resolves the display name for a horse in lab samples.
 * Priority order:
 * 1. lab_horse.name (from lab_horses registry) - if lab_horse_id is set
 * 2. horse.name (from horses table) - if horse_id is set
 * 3. horse_name (inline walk-in horse name)
 * 4. fallback (defaults to "Unknown Horse")
 */
export function getLabHorseDisplayName(
  sample: HorseNameFields,
  options: GetLabHorseDisplayNameOptions = {}
): string {
  const { locale = 'en', fallback = 'Unknown Horse' } = options;

  // Priority 1: Lab horse from registry
  if (sample.lab_horse) {
    if (locale === 'ar' && sample.lab_horse.name_ar) {
      return sample.lab_horse.name_ar;
    }
    return sample.lab_horse.name;
  }

  // Priority 2: Stable horse
  if (sample.horse) {
    if (locale === 'ar' && sample.horse.name_ar) {
      return sample.horse.name_ar;
    }
    return sample.horse.name;
  }

  // Priority 3: Inline walk-in horse name
  if (sample.horse_name) {
    return sample.horse_name;
  }

  // Fallback
  return fallback;
}

/**
 * Extract the {name, name_ar} pair from a sample for bilingual rendering.
 * Mirrors the priority order of getLabHorseDisplayName.
 */
export function getLabHorseNamePair(
  sample: HorseNameFields
): { name: string | null; name_ar: string | null } {
  if (sample.lab_horse) {
    return { name: sample.lab_horse.name ?? null, name_ar: sample.lab_horse.name_ar ?? null };
  }
  if (sample.horse) {
    return { name: sample.horse.name ?? null, name_ar: sample.horse.name_ar ?? null };
  }
  if (sample.horse_name) {
    return { name: sample.horse_name, name_ar: null };
  }
  return { name: null, name_ar: null };
}

/**
 * Bilingual horse name for lab samples — uses `displayHorseName` formatting:
 *   AR ui → `الاسم العربي (English)`
 *   EN ui → `English (الاسم العربي)`
 * Falls back gracefully when only one language is present.
 */
import { displayHorseName } from "@/lib/displayHelpers";

export function getLabHorseDisplayBilingual(
  sample: HorseNameFields,
  options: { lang?: string; fallback?: string } = {}
): string {
  const { lang, fallback = "Unknown Horse" } = options;
  const pair = getLabHorseNamePair(sample);
  if (!pair.name && !pair.name_ar) return fallback;
  return displayHorseName(pair.name, pair.name_ar, lang);
}
