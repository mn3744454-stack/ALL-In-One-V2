/**
 * H3.1 — Localize known system-generated movement reasons and internal notes.
 *
 * Backend stores these strings literally in English. We translate ONLY the
 * exact known system values (case-insensitive, trimmed). Any unknown / custom
 * / free-text reason is returned as-is and must NEVER be auto-translated.
 */

type TFn = (key: string) => string;

const REASON_KEYS: Record<string, string> = {
  "boarding admission check-in": "movement.reason.system.boardingAdmissionCheckin",
  "boarding admission checkout": "movement.reason.system.boardingAdmissionCheckout",
  "internal unit reassignment": "movement.reason.system.internalUnitReassignment",
  // B2.3b — scheduled arrival originating from a boarding contract
  "boarding_contract": "movement.reason.system.boardingContractScheduledArrival",
};

const NOTE_KEYS: Record<string, string> = {
  "initial unit placement": "movement.note.system.initialUnitPlacement",
  "internal unit move": "movement.note.system.internalUnitMove",
  "internal unit reassignment": "movement.note.system.internalUnitReassignment",
};

function lookup(map: Record<string, string>, raw: string | null | undefined, t: TFn): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const key = map[trimmed.toLowerCase()];
  if (!key) return trimmed; // unknown — pass through verbatim
  const translated = t(key);
  // If t() returned the key unchanged (missing translation), fall back to raw.
  return translated && translated !== key ? translated : trimmed;
}

export function formatMovementReason(reason: string | null | undefined, t: TFn): string | null {
  return lookup(REASON_KEYS, reason, t);
}

export function formatMovementInternalNote(note: string | null | undefined, t: TFn): string | null {
  return lookup(NOTE_KEYS, note, t);
}
