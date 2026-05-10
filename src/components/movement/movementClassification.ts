/**
 * H3 — Frontend-only movement classification helper.
 *
 * Backend `movement_type` is only `in | out | transfer`, but the same
 * `transfer` row can represent very different operational events (true
 * inter-branch move, initial unit assignment, same-branch unit reassignment).
 * This helper derives a richer class for display purposes only — it does NOT
 * change any database row.
 *
 * Detection order is critical: see numbered cases below. `internal_location_note`
 * is intentionally NOT a primary classifier; it is shown as a supporting note.
 */

export type MovementClass =
  | "arrival"
  | "admission_checkin"
  | "checkout_departure"
  | "temporary_out"
  | "return_from_temporary_out"
  | "connected_outgoing"
  | "inter_branch_transfer"
  | "unit_assignment"
  | "unit_reassignment"
  | "unknown";

export interface ClassifiableMovement {
  movement_type?: string | null;
  movement_subtype?: string | null;
  destination_type?: string | null;
  reason?: string | null;
  from_location_id?: string | null;
  to_location_id?: string | null;
  from_unit_id?: string | null;
  to_unit_id?: string | null;
}

const includesCi = (value: string | null | undefined, needle: string): boolean => {
  if (!value) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
};

export function classifyMovement(movement: ClassifiableMovement): MovementClass {
  const type = movement.movement_type ?? null;
  const subtype = movement.movement_subtype ?? null;
  const dest = movement.destination_type ?? null;
  const reason = movement.reason ?? null;

  // === IN ===
  if (type === "in") {
    if (includesCi(reason, "admission check-in") || includesCi(reason, "Boarding admission check-in")) {
      return "admission_checkin";
    }
    if (subtype === "return_from_temporary_out") {
      return "return_from_temporary_out";
    }
    return "arrival";
  }

  // === OUT ===
  if (type === "out") {
    if (dest === "connected") return "connected_outgoing";
    if (subtype === "temporary_out") return "temporary_out";
    if (
      subtype === "checkout_departure" ||
      includesCi(reason, "admission checkout") ||
      includesCi(reason, "Boarding admission checkout")
    ) {
      return "checkout_departure";
    }
    return "checkout_departure";
  }

  // === TRANSFER ===
  if (type === "transfer") {
    const from = movement.from_location_id ?? null;
    const to = movement.to_location_id ?? null;
    const fromUnit = movement.from_unit_id ?? null;
    const toUnit = movement.to_unit_id ?? null;

    if (from && to && from !== to) return "inter_branch_transfer";
    if (from && to && from === to && fromUnit == null && toUnit != null) return "unit_assignment";
    if (from && to && from === to && fromUnit != null) return "unit_reassignment";
  }

  return "unknown";
}

/**
 * Visual style hint per class — consumers may use to pick badge variants.
 * Keep semantic so callers can map to existing badge color tokens.
 */
export function classBadgeTone(cls: MovementClass): "emerald" | "red" | "blue" | "amber" | "purple" | "muted" {
  switch (cls) {
    case "arrival":
    case "admission_checkin":
    case "return_from_temporary_out":
      return "emerald";
    case "checkout_departure":
    case "temporary_out":
      return "red";
    case "inter_branch_transfer":
    case "connected_outgoing":
      return "blue";
    case "unit_assignment":
    case "unit_reassignment":
      return "purple";
    default:
      return "muted";
  }
}
