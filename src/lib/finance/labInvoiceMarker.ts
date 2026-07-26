/**
 * Lab source marker embedded in `invoices.notes` to preserve source-trace
 * and duplicate-detection for Laboratory-originated invoices created via the
 * atomic RPC path (which does not accept entity_type/entity_id keys).
 *
 * Format: `[LAB:<sourceType>:<uuid>]`
 *   sourceType ∈ { "lab_sample", "lab_request" }
 *
 * The marker is written by useLabInvoiceDraft.composeNotesWithMarker and
 * read by:
 *   - useLabInvoiceDraft.checkExistingInvoice (dedupe)
 *   - InvoiceDetailsSheet (display-only sanitation + sample resolution)
 *
 * Presentation MUST hide the marker from user-facing text while preserving
 * the persisted value in storage. Unrelated bracketed user text must never
 * be affected — only the exact recognized marker is removed.
 */

export const LAB_SOURCE_MARKER_RE =
  /\[LAB:(lab_sample|lab_request):([0-9a-fA-F-]{36})\]/;

export type LabSourceType = "lab_sample" | "lab_request";

export interface LabSourceMarker {
  sourceType: LabSourceType;
  sourceId: string;
}

export function parseLabSourceMarker(
  notes: string | null | undefined,
): LabSourceMarker | null {
  if (!notes) return null;
  const m = notes.match(LAB_SOURCE_MARKER_RE);
  return m ? { sourceType: m[1] as LabSourceType, sourceId: m[2] } : null;
}

/**
 * Remove the exact recognized Lab source marker (plus at most one adjacent
 * newline on each side) from a notes string for display. Preserves all other
 * text — including unrelated bracketed content — verbatim.
 */
export function stripLabSourceMarker(
  notes: string | null | undefined,
): string {
  if (!notes) return "";
  const stripRe = new RegExp(`\\n?${LAB_SOURCE_MARKER_RE.source}\\n?`);
  return notes
    .replace(stripRe, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildLabSourceMarker(
  sourceType: LabSourceType,
  sourceId: string,
): string {
  return `[LAB:${sourceType}:${sourceId}]`;
}
