/**
 * Smart Summary Resolver — Phase 2.
 *
 * Turns a notification + its family config into an ordered list of typed
 * summary chips. Cards render a capped subset; dialogs render the full set.
 *
 * Why a resolver layer instead of inline branches?
 *   - Cards and dialogs can never disagree about which chips a family shows.
 *   - Adding metadata fields in the future is a one-line change here.
 *   - Phase 3 (control center) and Phase 4 (governance presets) will read
 *     the same chip schema to render preview UIs without duplicating logic.
 */

import type { AppNotification } from "@/hooks/useNotifications";
import { tStatus } from "@/i18n/labels";
import {
  getFamilyConfig,
  type SummaryChipId,
} from "@/lib/notifications/familyRegistry";

export type SummaryChipTone = "neutral" | "status" | "actor" | "horse" | "ref";

export interface SummaryChip {
  id: SummaryChipId;
  /** i18n key for the chip's leading label (e.g. "Status", "Horse"). */
  labelKey: string;
  /** Resolved value (already localized where applicable). */
  value: string;
  /** Visual hint — chip components decide how to render each tone. */
  tone: SummaryChipTone;
}

interface ResolveOpts {
  /**
   * If `true`, returns the full chip set (dialog mode).
   * If a number, caps the result at that count (card mode, typically 2).
   */
  limit?: number | "all";
}

const TONE_BY_CHIP: Record<SummaryChipId, SummaryChipTone> = {
  status: "status",
  horse: "horse",
  actor: "actor",
  actorTenant: "actor",
  entityLabel: "ref",
  messagePreview: "neutral",
  direction: "status",
  when: "neutral",
};

const LABEL_KEY_BY_CHIP: Record<SummaryChipId, string> = {
  status: "notifications.summary.status",
  horse: "notifications.horse",
  actor: "notifications.actor",
  actorTenant: "notifications.fromOrg",
  entityLabel: "notifications.reference",
  messagePreview: "notifications.summary.message",
  direction: "notifications.summary.direction",
  when: "notifications.summary.when",
};

/**
 * Movement direction is encoded in event_type (in/out/transfer). The
 * resolver derives a localized label from it so the chip is self-contained.
 */
function deriveDirectionLabel(notification: AppNotification): string {
  const meta = notification.metadata as Record<string, unknown> | null;
  const direction =
    (meta?.movement_type as string | undefined) ??
    (notification.event_type.includes("incoming")
      ? "in"
      : notification.event_type.includes("dispatched") ||
          notification.event_type.includes("scheduled")
        ? "out"
        : undefined);
  return direction ?? "";
}

function resolveValue(
  id: SummaryChipId,
  notification: AppNotification
): string {
  const meta = (notification.metadata || {}) as Record<string, unknown>;
  switch (id) {
    case "status":
      return meta.status ? tStatus(meta.status as string) : "";
    case "horse":
      return (meta.horse_name as string) || "";
    case "actor":
      return (meta.actor_user_name as string) || "";
    case "actorTenant":
      return (meta.actor_tenant_name as string) || "";
    case "entityLabel":
      return (meta.entity_label as string) || "";
    case "messagePreview": {
      const raw = (meta.message_preview as string) || notification.body || "";
      // Trim heavily for chip context — full body is in the dialog header.
      return raw.length > 60 ? raw.slice(0, 57) + "…" : raw;
    }
    case "direction":
      return deriveDirectionLabel(notification);
    case "when":
      // Time chips are rendered separately by the card/dialog (with an icon
      // and live `formatDistanceToNow`); we expose the chip schema slot
      // here so future surfaces can opt in, but resolveSummaryChips will
      // skip it by default.
      return "";
    default:
      return "";
  }
}

/**
 * Resolve the ordered, populated summary chip list for a notification.
 * Drops chips whose backing data is empty.
 */
export function resolveSummaryChips(
  notification: AppNotification,
  opts: ResolveOpts = {}
): SummaryChip[] {
  const cfg = getFamilyConfig(notification.event_type);
  const out: SummaryChip[] = [];
  for (const id of cfg.summaryChips) {
    if (id === "when") continue; // rendered separately
    const value = resolveValue(id, notification);
    if (!value) continue;
    out.push({
      id,
      labelKey: LABEL_KEY_BY_CHIP[id],
      value,
      tone: TONE_BY_CHIP[id],
    });
  }
  if (opts.limit && opts.limit !== "all") {
    return out.slice(0, opts.limit);
  }
  return out;
}
