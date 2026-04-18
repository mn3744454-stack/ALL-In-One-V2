/**
 * Notification Route Descriptor — Phase 1 foundation
 * (refined in the Phase 1 corrective pass).
 *
 * A single, reusable contract that resolves any notification into:
 *   - a family key (for icons, copy, future governance)
 *   - a deep-link target (route + entity identity + open-on-arrival flag)
 *   - a CTA label key (i18n)
 *
 * Phase 1 wires this for the four currently active families:
 *   connection, lab_request, boarding, movement
 *
 * Corrective-pass additions (additive, non-breaking):
 *   - `entityType` + `entityId` are now exposed on the descriptor so a
 *     future generic open-on-arrival hook can subscribe once instead
 *     of one branch per family.
 *   - The same identity pair is also appended to `sourceUrl` as
 *     `entityType=…&entityId=…` alongside the family-specific keys
 *     (`connectionId`, `requestId`, `admissionId`, `movementId`),
 *     keeping current consumers untouched.
 *   - `movement.*` no longer ignores `entity_id`; it now carries the
 *     movement id through the URL so Phase 2 can wire focus/open
 *     behavior on the destination page.
 *
 * Later phases can extend the family table without touching call sites.
 */

import type { AppNotification } from "@/hooks/useNotifications";

export type NotificationFamily =
  | "connection"
  | "lab_request"
  | "boarding"
  | "movement"
  | "generic";

/**
 * Stable, family-agnostic identity for the entity a notification points at.
 * Phase 2 open-on-arrival hooks should prefer this over family-specific
 * query keys so a single subscription can handle every family.
 */
export type NotificationEntityType =
  | "connection"
  | "lab_request"
  | "boarding_admission"
  | "horse_movement";

export interface NotificationRouteDescriptor {
  /** Family key — drives icon, copy, future governance preset binding. */
  family: NotificationFamily;
  /** Whether this notification has a meaningful source page to navigate to. */
  hasSource: boolean;
  /** Full URL (path + query) to deep-link the user into the source entity. */
  sourceUrl: string | null;
  /**
   * i18n key for the source CTA label inside the quick-detail dialog
   * (e.g. "notifications.openFullRecord", "notifications.openRequest").
   */
  ctaLabelKey: string;
  /** Stable entity type (null for generic / non-entity notifications). */
  entityType: NotificationEntityType | null;
  /** Stable entity id (null when the notification has no specific entity). */
  entityId: string | null;
}

/**
 * Build a query string while skipping null/undefined values.
 * Keeps URL construction tidy without pulling in URLSearchParams ordering quirks.
 */
function buildQuery(parts: Record<string, string | null | undefined>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(parts)) {
    if (value === null || value === undefined || value === "") continue;
    pairs.push(`${key}=${encodeURIComponent(value)}`);
  }
  return pairs.length ? `?${pairs.join("&")}` : "";
}

/**
 * Resolve a notification into its family + deep-link descriptor.
 * Pure function — no React, no navigation side effects.
 */
export function resolveNotificationRoute(
  notification: AppNotification
): NotificationRouteDescriptor {
  const { event_type, entity_id } = notification;

  // ─── Connection family ──────────────────────────
  if (event_type.startsWith("connection.")) {
    const sourceUrl = `/dashboard/team${buildQuery({
      tab: "partners",
      connectionId: entity_id,
      entityType: entity_id ? "connection" : null,
      entityId: entity_id,
      open: entity_id ? "1" : null,
    })}`;
    return {
      family: "connection",
      hasSource: true,
      sourceUrl,
      ctaLabelKey: "notifications.openConnection",
      entityType: entity_id ? "connection" : null,
      entityId: entity_id ?? null,
    };
  }

  // ─── Lab request family ─────────────────────────
  if (event_type === "lab_request.message_added" && entity_id) {
    const sourceUrl = `/dashboard/laboratory${buildQuery({
      tab: "requests",
      requestId: entity_id,
      openThread: "true",
      entityType: "lab_request",
      entityId: entity_id,
      open: "1",
    })}`;
    return {
      family: "lab_request",
      hasSource: true,
      sourceUrl,
      ctaLabelKey: "notifications.openRequest",
      entityType: "lab_request",
      entityId: entity_id,
    };
  }
  if (event_type.startsWith("lab_request.") && entity_id) {
    const sourceUrl = `/dashboard/laboratory${buildQuery({
      tab: "requests",
      requestId: entity_id,
      entityType: "lab_request",
      entityId: entity_id,
      open: "1",
    })}`;
    return {
      family: "lab_request",
      hasSource: true,
      sourceUrl,
      ctaLabelKey: "notifications.openRequest",
      entityType: "lab_request",
      entityId: entity_id,
    };
  }

  // ─── Boarding / admissions family ───────────────
  if (event_type.startsWith("boarding.")) {
    const sourceUrl = `/dashboard/housing${buildQuery({
      tab: "admissions",
      admissionId: entity_id,
      entityType: entity_id ? "boarding_admission" : null,
      entityId: entity_id,
      open: entity_id ? "1" : null,
    })}`;
    return {
      family: "boarding",
      hasSource: !!entity_id,
      sourceUrl,
      ctaLabelKey: "notifications.openAdmission",
      entityType: entity_id ? "boarding_admission" : null,
      entityId: entity_id ?? null,
    };
  }

  // ─── Movement family ────────────────────────────
  if (event_type.startsWith("movement.")) {
    // Movement notifications target the horse-movements registry. We carry
    // the movement id through the URL so the destination page can focus the
    // correct row when Phase 2 wires open-on-arrival.
    const sourceUrl = `/dashboard/housing${buildQuery({
      tab: "arrivalsAndDepartures",
      movementId: entity_id,
      entityType: entity_id ? "horse_movement" : null,
      entityId: entity_id,
      open: entity_id ? "1" : null,
    })}`;
    return {
      family: "movement",
      hasSource: true,
      sourceUrl,
      ctaLabelKey: "notifications.openMovement",
      entityType: entity_id ? "horse_movement" : null,
      entityId: entity_id ?? null,
    };
  }

  // ─── Generic fallback (no forced navigation) ────
  return {
    family: "generic",
    hasSource: false,
    sourceUrl: null,
    ctaLabelKey: "notifications.openFullRecord",
    entityType: null,
    entityId: null,
  };
}
