/**
 * Residual Item 3 — Canonical client-side leadership detection.
 *
 * Single source of truth for "is the current viewer a leadership member of
 * the active tenant?". Used by Phase 4 policy resolver consumers (bell list,
 * any future sound gate, etc.) to drive the `viewerIsLeadership` flag of
 * `resolveDelivery`.
 *
 * Design notes:
 *   - Phase 4's investigative conclusion was that role-title strings should
 *     not be policy truth. The cleanest bounded fix today is to centralize
 *     the role-string check here so there is exactly one place to change
 *     when this graduates to a permission key (e.g.
 *     `notifications.escalation.recipient`) in a future tightening pass.
 *   - The mirrored check inside `supabase/functions/send-push-notification`
 *     intentionally stays inline as a documented mirror (cross-runtime
 *     boundary; the policy resolver itself is mirrored the same way).
 */
import { useTenant } from "@/contexts/TenantContext";

const LEADERSHIP_ROLES = new Set(["owner", "manager"]);

export function useViewerIsLeadership(): boolean {
  const { activeRole } = useTenant();
  if (!activeRole) return false;
  return LEADERSHIP_ROLES.has(activeRole);
}
