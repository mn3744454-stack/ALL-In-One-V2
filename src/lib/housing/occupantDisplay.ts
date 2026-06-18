/**
 * Phase 1.e.f.7.b.1 — Resolve unit occupant identity for display only.
 *
 * Facilities surfaces (UnitCell, UnitDetailsSheet "Current Occupant" block)
 * historically read `occupant.horse?.*` directly from the canonical
 * `horses` join. For connected B2B incoming admissions the canonical row
 * is owned by the sender tenant and is invisible to the recipient via RLS,
 * so the join returns null and the occupant renders as `—` / generic
 * initial even though the admission carries a snapshot identity.
 *
 * This resolver prefers the canonical horse row and falls back to the
 * admission snapshot fields persisted on `boarding_admissions` in 1.e.f.7.a
 * (consumed via `getAdmissionHorseDisplay`).
 */
import { getAdmissionHorseDisplay } from "./admissionDisplay";

export interface OccupantLike {
  horse?: {
    id?: string;
    name?: string | null;
    name_ar?: string | null;
    avatar_url?: string | null;
  } | null;
  activeAdmission?: {
    id?: string;
    horse_name_snapshot?: string | null;
    horse_name_ar_snapshot?: string | null;
    horse_avatar_url_snapshot?: string | null;
  } | null;
}

export interface OccupantDisplay {
  name: string | null;
  nameAr: string | null;
  avatarUrl: string | null;
  /** Convenience uppercase single-character initial for AvatarFallback. */
  initial: string;
}

const NEUTRAL_INITIAL = "H";

function pickInitial(name: string | null, nameAr: string | null): string {
  const src = name || nameAr;
  if (!src) return NEUTRAL_INITIAL;
  const ch = src.trim().charAt(0);
  return ch ? ch.toUpperCase() : NEUTRAL_INITIAL;
}

export function getOccupantDisplay(occupant: OccupantLike): OccupantDisplay {
  // 1. Canonical horse join wins when it has any identity content.
  if (occupant.horse && (occupant.horse.name || occupant.horse.name_ar)) {
    const name = occupant.horse.name ?? null;
    const nameAr = occupant.horse.name_ar ?? null;
    return {
      name,
      nameAr,
      avatarUrl: occupant.horse.avatar_url ?? null,
      initial: pickInitial(name, nameAr),
    };
  }

  // 2. Admission snapshot fallback — delegate to the shared helper so we
  //    keep a single source of truth with AdmissionsList / AdmissionDetailSheet.
  if (occupant.activeAdmission) {
    const snap = getAdmissionHorseDisplay({
      horse: null as any,
      horse_name_snapshot: occupant.activeAdmission.horse_name_snapshot ?? null,
      horse_name_ar_snapshot: occupant.activeAdmission.horse_name_ar_snapshot ?? null,
      horse_avatar_url_snapshot: occupant.activeAdmission.horse_avatar_url_snapshot ?? null,
    } as any);
    if (snap.name || snap.nameAr) {
      return {
        name: snap.name,
        nameAr: snap.nameAr,
        avatarUrl: snap.avatarUrl,
        initial: pickInitial(snap.name, snap.nameAr),
      };
    }
  }

  // 3. Neutral fallback (preserves legacy `—` / `H` behavior).
  return { name: null, nameAr: null, avatarUrl: null, initial: NEUTRAL_INITIAL };
}
