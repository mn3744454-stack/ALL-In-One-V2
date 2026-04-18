/**
 * Notification Route Descriptor — Phase 1 foundation.
 *
 * A single, reusable contract that resolves any notification into:
 *   - a family key (for icons, copy, future governance)
 *   - a deep-link target (route + entityId + open-on-arrival flag)
 *   - a CTA label key (i18n)
 *
 * Phase 1 wires this for the four currently active families:
 *   connection, lab_request, boarding, movement
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
    const sourceUrl = entity_id
      ? `/dashboard/team?tab=partners&connectionId=${entity_id}&open=1`
      : "/dashboard/team?tab=partners";
    return {
      family: "connection",
      hasSource: true,
      sourceUrl,
      ctaLabelKey: "notifications.openConnection",
    };
  }

  // ─── Lab request family ─────────────────────────
  if (event_type === "lab_request.message_added" && entity_id) {
    return {
      family: "lab_request",
      hasSource: true,
      sourceUrl: `/dashboard/laboratory?tab=requests&requestId=${entity_id}&openThread=true&open=1`,
      ctaLabelKey: "notifications.openRequest",
    };
  }
  if (event_type.startsWith("lab_request.") && entity_id) {
    return {
      family: "lab_request",
      hasSource: true,
      sourceUrl: `/dashboard/laboratory?tab=requests&requestId=${entity_id}&open=1`,
      ctaLabelKey: "notifications.openRequest",
    };
  }

  // ─── Boarding / admissions family ───────────────
  if (event_type.startsWith("boarding.")) {
    const sourceUrl = entity_id
      ? `/dashboard/housing?tab=admissions&admissionId=${entity_id}&open=1`
      : "/dashboard/housing?tab=admissions";
    return {
      family: "boarding",
      hasSource: !!entity_id,
      sourceUrl,
      ctaLabelKey: "notifications.openAdmission",
    };
  }

  // ─── Movement family ────────────────────────────
  if (event_type.startsWith("movement.")) {
    return {
      family: "movement",
      hasSource: true,
      sourceUrl: "/dashboard/housing?tab=arrivalsAndDepartures",
      ctaLabelKey: "notifications.openMovement",
    };
  }

  // ─── Generic fallback (no forced navigation) ────
  return {
    family: "generic",
    hasSource: false,
    sourceUrl: null,
    ctaLabelKey: "notifications.openFullRecord",
  };
}
