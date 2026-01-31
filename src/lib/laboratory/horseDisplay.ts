import type { LabSample } from "@/hooks/laboratory/useLabSamples";

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
  sample: Pick<LabSample, 'lab_horse' | 'horse' | 'horse_name'>,
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
