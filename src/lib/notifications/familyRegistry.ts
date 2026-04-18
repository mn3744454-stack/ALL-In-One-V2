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
 *
 * Note: time/freshness ("when") is intentionally NOT a chip id — every card
 * and dialog already renders a live `formatDistanceToNow` row separately,
 * so a redundant chip would only add noise.
 */
export type SummaryChipId =
  | "status"
  | "horse"
  | "actor"
  | "actorTenant"
  | "entityLabel"
  | "messagePreview"
  | "direction"; // movement-specific (in/out/transfer)

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
    summaryChips: ["actorTenant", "status"],
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
    summaryChips: ["horse", "status", "actorTenant"],
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
    summaryChips: ["horse", "direction", "actorTenant"],
  },
  generic: {
    family: "generic",
    icon: Bell,
    labelKey: "notifications.families.generic",
    defaultSeverity: "info",
    summaryChips: ["actorTenant"],
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
 * Tailwind class fragments for severity. All colors come from the
 * design-system semantic tokens defined in `index.css` / `tailwind.config.ts`
 * (`--primary`, `--success`, `--warning`, `--destructive`) so light/dark
 * theming and brand changes propagate automatically — no raw palette names.
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
    accent: "border-l-success/70",
    chip: "bg-success/10 text-success border-success/20",
    iconBg: "bg-success/10",
    iconFg: "text-success",
  },
  warning: {
    accent: "border-l-warning/70",
    chip: "bg-warning/10 text-warning border-warning/20",
    iconBg: "bg-warning/10",
    iconFg: "text-warning",
  },
  critical: {
    accent: "border-l-destructive/70",
    chip: "bg-destructive/10 text-destructive border-destructive/20",
    iconBg: "bg-destructive/10",
    iconFg: "text-destructive",
  },
};
