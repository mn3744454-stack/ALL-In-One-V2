import type { BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";

/**
 * Phase 1.e.f.7.a — Resolve horse identity for display only.
 * Prefers the canonical joined `horse` row; falls back to snapshot fields
 * persisted on the admission for connected B2B incoming admissions where
 * the canonical horses row is owned by the sender tenant and not visible
 * via recipient RLS.
 *
 * Shared by AdmissionsList and AdmissionDetailSheet (Phase 1.e.f.7.a.2).
 */
export function getAdmissionHorseDisplay(
  a: Pick<
    BoardingAdmission,
    "horse" | "horse_name_snapshot" | "horse_name_ar_snapshot" | "horse_avatar_url_snapshot"
  >
): { name: string | null; nameAr: string | null; avatarUrl: string | null } {
  if (a.horse?.name || a.horse?.name_ar) {
    return {
      name: a.horse?.name ?? null,
      nameAr: a.horse?.name_ar ?? null,
      avatarUrl: a.horse?.avatar_url ?? null,
    };
  }
  if (a.horse_name_snapshot || a.horse_name_ar_snapshot) {
    return {
      name: a.horse_name_snapshot ?? null,
      nameAr: a.horse_name_ar_snapshot ?? null,
      avatarUrl: a.horse_avatar_url_snapshot ?? null,
    };
  }
  return { name: null, nameAr: null, avatarUrl: null };
}
