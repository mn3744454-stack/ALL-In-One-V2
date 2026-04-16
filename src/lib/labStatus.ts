import type { LabRequest } from "@/hooks/laboratory/useLabRequests";

/**
 * Phase 5.1 — Effective lab-request status for summary surfaces.
 *
 * Mirrors the SQL view `lab_requests_stable_view`: maps the new Phase 5
 * intake decision model (`lab_decision`, `specimen_received_at`) into the
 * existing display badge vocabulary so summary cards/rows stop showing
 * stale `pending` after the Lab has actually decided.
 *
 * Falls back to the legacy `request.status` only when no Phase 5 decision
 * has been recorded yet (`pending_review` and not yet sent/processing/etc).
 */
export function getEffectiveLabRequestStatus(
  request: Pick<
    LabRequest,
    "status" | "lab_decision" | "specimen_received_at" | "result_url"
  >
): LabRequest["status"] {
  const decision = request.lab_decision || "pending_review";

  // Rejection is a terminal decision — represent as cancelled in the
  // legacy badge vocabulary (visually distinct, dedicated reject UI on detail).
  if (decision === "rejected") return "cancelled";

  // Once the operator has accepted, intake state takes precedence over the
  // legacy raw `status` until downstream lifecycle (ready/received) catches up.
  if (decision === "accepted") {
    if (request.status === "ready" || request.status === "received") {
      return request.status;
    }
    if (request.specimen_received_at || request.status === "processing") {
      return "processing";
    }
    // Accepted, awaiting specimen — surface as "sent" (in-flight) on summaries.
    return "sent";
  }

  // pending_review → fall through to legacy status (covers pre-Phase-5 rows
  // and brand-new requests where Lab has not opened the intake panel yet).
  return request.status;
}
