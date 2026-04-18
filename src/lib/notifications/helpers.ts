/**
 * Shared notification helpers — Phase 1 corrective pass.
 *
 * Consolidates logic that was previously duplicated between
 * NotificationsPanel (card) and NotificationQuickDetailDialog.
 *
 * Single source of truth for:
 *   - Family icon resolution
 *   - i18n template interpolation against notification metadata
 */

import type { LucideIcon } from "lucide-react";
import type { AppNotification } from "@/hooks/useNotifications";
import { tStatus } from "@/i18n/labels";
import { getFamilyIcon } from "@/lib/notifications/familyRegistry";

/**
 * Resolve the icon component for a notification family based on its event_type.
 *
 * Phase 2: delegates to the family registry so the icon taxonomy lives in a
 * single place alongside severity, summary chip schema, and label keys.
 */
export function getNotificationIcon(eventType: string): LucideIcon {
  return getFamilyIcon(eventType);
}

/**
 * Interpolate an i18n template with values from notification.metadata.
 * Replaces {{key}} placeholders with metadata fields. Unknown placeholders
 * resolve to empty strings so partial metadata never breaks rendering.
 */
export function interpolateNotificationTemplate(
  template: string,
  notification: AppNotification
): string {
  const meta = notification.metadata || {};
  return template
    .replace(/\{\{actorTenantName\}\}/g, meta.actor_tenant_name || "")
    .replace(/\{\{entityLabel\}\}/g, meta.entity_label || "")
    .replace(/\{\{horseName\}\}/g, meta.horse_name || "")
    .replace(
      /\{\{messagePreview\}\}/g,
      meta.message_preview || notification.body || ""
    )
    .replace(/\{\{statusLabel\}\}/g, meta.status ? tStatus(meta.status) : "")
    .trim();
}
