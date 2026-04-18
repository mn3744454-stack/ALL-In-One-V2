/**
 * Smart Summary Resolver — Phase 2 (post-corrective).
 *
 * Turns a notification + its family config into an ordered list of typed
 * summary chips. Cards render a capped subset; dialogs render the full set.
 *
 * Why a resolver layer instead of inline branches?
 *   - Cards and dialogs can never disagree about which chips a family shows.
 *   - Adding metadata fields in the future is a one-line change here.
 *   - Phase 3 (control center) and Phase 4 (governance presets) will read
 *     the same chip schema to render preview UIs without duplicating logic.
 *
 * Corrective-pass note (post-Phase-2 audit):
 *   - The dead `"when"` chip slot was removed everywhere. Time/freshness is
 *     already rendered separately by every surface via `formatDistanceToNow`,
 *     so a chip would have been redundant noise.
 *   - The `direction` chip now resolves to a localized label (e.g.
 *     "Incoming" / "وارد") via the `t()` lookup the caller passes in,
 *     instead of leaking raw "in" / "out" tokens to users.
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
  /**
   * Optional translator. When provided, chip values that need localization
   * (currently only `direction`) will be passed through it. When omitted,
   * the resolver falls back to the raw token so callers without an i18n
   * context still get *something* renderable.
   */
  t?: (key: string) => string;
}

const TONE_BY_CHIP: Record<SummaryChipId, SummaryChipTone> = {
  status: "status",
  horse: "horse",
  actor: "actor",
  actorTenant: "actor",
  entityLabel: "ref",
  messagePreview: "neutral",
  direction: "status",
};

const LABEL_KEY_BY_CHIP: Record<SummaryChipId, string> = {
  status: "notifications.summary.status",
  horse: "notifications.horse",
  actor: "notifications.actor",
  actorTenant: "notifications.fromOrg",
  entityLabel: "notifications.reference",
  messagePreview: "notifications.summary.message",
  direction: "notifications.summary.direction",
};

/**
 * Movement direction is encoded in event_type (in/out/transfer). The
 * resolver derives a localized label from it so the chip is self-contained.
 */
function deriveDirectionLabel(
  notification: AppNotification,
  t?: (key: string) => string
): string {
  const meta = notification.metadata as Record<string, unknown> | null;
  const direction =
    (meta?.movement_type as string | undefined) ??
    (notification.event_type.includes("incoming")
      ? "in"
      : notification.event_type.includes("dispatched") ||
          notification.event_type.includes("scheduled")
        ? "out"
        : undefined);
  if (!direction) return "";
  if (!t) return direction; // graceful fallback — never block render
  const key = `notifications.direction.${direction}`;
  const translated = t(key);
  // If the i18n lookup misses, fall back to the raw token rather than
  // leaking the bare key to users.
  return translated === key ? direction : translated;
}

function resolveValue(
  id: SummaryChipId,
  notification: AppNotification,
  t?: (key: string) => string
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
      return deriveDirectionLabel(notification, t);
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
    const value = resolveValue(id, notification, opts.t);
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
