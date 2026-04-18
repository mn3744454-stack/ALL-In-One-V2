/**
 * Notification Family Registry — Phase 2 foundation.
 *
 * Single declarative source of truth for everything that varies *by family*:
 *   - icon
 *   - i18n label key
 *   - default severity (info / success / warning / critical)
 *   - per-event severity overrides
 *   - which summary chips a family should surface (ordered, capped)
 *
 * Card rendering, dialog rendering, future filters, future control-center
 * presets, and future governance presets all read from this registry instead
 * of re-implementing per-family branches in scattered files.
 *
 * Adding a new family in the future = one entry here + one i18n key.
 * No card, dialog, or descriptor edits required for the visual layer.
 */

import {
  Bell,
  Link2,
  FlaskConical,
  MessageSquare,
  Truck,
  Home,
  type LucideIcon,
} from "lucide-react";
import type { NotificationFamily } from "@/lib/notifications/routeDescriptor";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

/**
 * Stable identifiers for the smart-summary chips a family may surface.
 * The chip *resolver* (summary.ts) maps each id → an actual {label, value}
 * pair, pulling from notification.metadata. Cards/dialogs only ever ask the
 * registry "which chips, in which order?" — they never inspect metadata
 * shape directly.
 */
export type SummaryChipId =
  | "status"
  | "horse"
  | "actor"
  | "actorTenant"
  | "entityLabel"
  | "messagePreview"
  | "direction" // movement-specific (in/out/transfer)
  | "when";

export interface FamilyConfig {
  family: NotificationFamily;
  icon: LucideIcon;
  /** i18n key under `notifications.families.*` */
  labelKey: string;
  /** Default severity if no event-specific override matches. */
  defaultSeverity: NotificationSeverity;
  /**
   * Severity overrides keyed by event_type. Looked up first; falls back
   * to defaultSeverity when no key matches.
   */
  severityByEvent?: Record<string, NotificationSeverity>;
  /**
   * Ordered list of chips a card *may* show. The resolver drops chips
   * whose backing metadata is missing — so this is a wishlist, not a hard
   * requirement. Cards cap the visible set (typically 2) for scannability;
   * dialogs render the full list.
   */
  summaryChips: SummaryChipId[];
}

const FAMILY_REGISTRY: Record<NotificationFamily, FamilyConfig> = {
  connection: {
    family: "connection",
    icon: Link2,
    labelKey: "notifications.families.connection",
    defaultSeverity: "info",
    severityByEvent: {
      "connection.request_received": "warning",
      "connection.accepted": "success",
      "connection.rejected": "info",
    },
    summaryChips: ["actorTenant", "status", "when"],
  },
  lab_request: {
    family: "lab_request",
    icon: FlaskConical,
    labelKey: "notifications.families.lab_request",
    defaultSeverity: "info",
    severityByEvent: {
      "lab_request.new": "warning",
      "lab_request.result_published": "success",
      "lab_request.message_added": "info",
      "lab_request.status_changed": "info",
    },
    summaryChips: [
      "actorTenant",
      "status",
      "entityLabel",
      "messagePreview",
      "when",
    ],
  },
  boarding: {
    family: "boarding",
    icon: Home,
    labelKey: "notifications.families.boarding",
    defaultSeverity: "info",
    severityByEvent: {
      "boarding.admission_created": "success",
      "boarding.checkout_initiated": "warning",
      "boarding.checkout_completed": "success",
    },
    summaryChips: ["horse", "status", "actorTenant", "when"],
  },
  movement: {
    family: "movement",
    icon: Truck,
    labelKey: "notifications.families.movement",
    defaultSeverity: "info",
    severityByEvent: {
      "movement.scheduled": "info",
      "movement.dispatched": "warning",
      "movement.incoming_pending": "warning",
      "movement.incoming_confirmed": "success",
    },
    summaryChips: ["horse", "direction", "actorTenant", "when"],
  },
  generic: {
    family: "generic",
    icon: Bell,
    labelKey: "notifications.families.generic",
    defaultSeverity: "info",
    summaryChips: ["actorTenant", "when"],
  },
};

/**
 * Resolve the family for an event_type prefix.
 * Mirrors the taxonomy in routeDescriptor.resolveNotificationRoute so the two
 * stay in lockstep. If the prefix is unknown, returns "generic".
 */
export function resolveFamily(eventType: string): NotificationFamily {
  if (eventType.startsWith("connection.")) return "connection";
  if (eventType.startsWith("lab_request.")) return "lab_request";
  if (eventType.startsWith("boarding.")) return "boarding";
  if (eventType.startsWith("movement.")) return "movement";
  return "generic";
}

export function getFamilyConfig(eventType: string): FamilyConfig {
  return FAMILY_REGISTRY[resolveFamily(eventType)];
}

export function getFamilyIcon(eventType: string): LucideIcon {
  // Preserves the Phase 1 special-case where lab_request.message_* uses a
  // chat icon instead of the flask. Kept here so callers stay registry-pure.
  if (eventType.startsWith("lab_request.message")) return MessageSquare;
  return getFamilyConfig(eventType).icon;
}

export function getEventSeverity(eventType: string): NotificationSeverity {
  const cfg = getFamilyConfig(eventType);
  return cfg.severityByEvent?.[eventType] ?? cfg.defaultSeverity;
}

/**
 * Tailwind class fragments for severity. Kept as plain class strings so the
 * card and dialog can compose them without importing yet another helper.
 * All colors come from the design-system semantic tokens.
 */
export const SEVERITY_STYLES: Record<
  NotificationSeverity,
  { accent: string; chip: string; iconBg: string; iconFg: string }
> = {
  info: {
    accent: "border-l-primary/60",
    chip: "bg-primary/10 text-primary border-primary/20",
    iconBg: "bg-primary/10",
    iconFg: "text-primary",
  },
  success: {
    accent: "border-l-emerald-500/70",
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
    iconFg: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    accent: "border-l-amber-500/70",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
    iconFg: "text-amber-600 dark:text-amber-400",
  },
  critical: {
    accent: "border-l-destructive/70",
    chip: "bg-destructive/10 text-destructive border-destructive/20",
    iconBg: "bg-destructive/10",
    iconFg: "text-destructive",
  },
};
